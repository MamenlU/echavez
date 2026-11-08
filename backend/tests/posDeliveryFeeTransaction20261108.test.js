import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import salesRouter from '../routes/sales.js';

test('POS Deliver Out persists manually applied fee in sale, total and receipt without altering configured rates', async () => {
  const previousQuery = pool.query;
  const previousConnection = pool.getConnection;
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-only-pos-delivery-key';
  const user = { id: 27, username: 'cashier', role: 'cashier', status: 'active' };
  const state = { sale: null, savedParams: null, saleItems: 0, stockOuts: 0, commits: 0, audits: 0, rateLookups: 0, rateWrites: 0 };
  const dbQuery = async (sql, params = []) => {
    const q = String(sql).replace(/\s+/g, ' ');
    if (q.includes('FROM users WHERE id = ?')) return [[user]];
    if (q.includes('FROM sales WHERE pos_request_id')) return [state.sale ? [{sale_id:915,total_amount:375.5,admin_id:27}] : []];
    if (q.includes('FROM sales s') && q.includes("'Onsite POS'")) return [state.sale ? [{...state.sale,
      sale_id:915,admin_id:27,shift_id:12,sale_date:'2026-11-08T10:00:00',sales_source:'Onsite POS',
      payment_status:'Paid',operator_name:'Cashier User',operator_username:'cashier',operator_role:'cashier'}] : []];
    if (q.includes('FROM sale_items si')) return [state.saleItems ? [{product_id:14,name:'Hammer',quantity:1,unit_price:250,subtotal:250}] : []];
    if (q.includes('FROM sale_adjustments WHERE sale_id')) return [[{adjustment_count:0,void_count:0}]];
    if (q.includes('FROM delivery_rates') && q.includes('is_active = 1')) {
      state.rateLookups++;
      assert.deepEqual(params,['Initao','Poblacion']);
      return [[{id:3}]];
    }
    if (/UPDATE delivery_rates|INSERT INTO delivery_rates/i.test(q)) {
      state.rateWrites++;
      throw Error('POS checkout must never change configured delivery rates');
    }
    if (q.includes('FROM cashier_shifts') && q.includes("status = 'Open'")) return [[{shift_id:12,admin_id:27,status:'Open'}]];
    if (q.includes('FROM products WHERE id = ?')) return [[{id:14,name:'Hammer',price:250,stock:12,status:'active',fulfillment_rule:'all'}]];
    if (q.includes('FROM inventory_movements WHERE product_id = ?')) return [[{movement_count:1,inventory_value:900}]];
    if (q.includes('INSERT INTO sales')) {
      state.savedParams = params;
      assert.match(q, /delivery_fee/);
      assert.equal(params[3],'delivery');
      assert.equal(params[4],375.5);
      assert.equal(params[5],125.5);
      assert.equal(params[6],'Test Customer');
      assert.equal(params[9],'Initao');
      assert.equal(params[10],'Poblacion');
      state.sale = {total_amount:375.5,delivery_fee:125.5,fulfillment:'delivery',customer_name:'Test Customer',
        delivery_contact_person:'Test Customer',delivery_contact_number:'09171234567',
        delivery_municipality:'Initao',delivery_barangay:'Poblacion',delivery_address:'Test street',delivery_landmark:null,
        payment_method:'Cash',card_payment_reference:null,cash_received:400,change_amount:24.5};
      return [{insertId:915,affectedRows:1}];
    }
    if (q.includes('INSERT INTO sale_items')) {state.saleItems++;return [{affectedRows:1}];}
    if (q.includes('UPDATE products SET stock')) return [{affectedRows:1}];
    if (q.includes('INSERT INTO inventory_movements')) {state.stockOuts++;return [{insertId:445,affectedRows:1}];}
    if (q.includes('INSERT INTO audit_logs')) {state.audits++;return [{insertId:240,affectedRows:1}];}
    throw new Error('Unexpected SQL in mocked Deliver Out POS: '+q.slice(0,180));
  };
  pool.query = dbQuery;
  pool.getConnection = async () => ({query:dbQuery,beginTransaction:async()=>{},commit:async()=>{state.commits++;},rollback:async()=>{},release:()=>{}});
  const app=express();app.use(express.json());app.use('/api/sales',salesRouter);
  const server=await new Promise((resolve,reject)=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));s.on('error',reject);});
  const target=`http://127.0.0.1:${server.address().port}/api/sales/pos`;
  const token=jwt.sign({id:27,username:'cashier',role:'cashier'},process.env.JWT_SECRET,{expiresIn:'1h'});
  const request=async body=>{const r=await fetch(target,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
  const payload={items:[{product:{id:14},quantity:1}],posRequestId:'pos-delivery-test-key',paymentMethod:'cash',cashReceived:400,
    fulfillment:'delivery',deliveryFee:125.5,customerName:'Test Customer',deliveryContactPerson:'Test Customer',
    deliveryContactNumber:'09171234567',deliveryMunicipality:'Initao',deliveryBarangay:'Poblacion',deliveryAddress:'Test street'};
  try {
    const created=await request(payload);
    assert.equal(created.status,201,JSON.stringify(created.data));
    assert.equal(created.data.productSubtotal,250);
    assert.equal(created.data.deliveryFee,125.5);
    assert.equal(created.data.totalAmount,375.5);
    assert.equal(created.data.changeAmount,24.5);
    assert.equal(created.data.receipt.deliveryFee,125.5);
    assert.equal(created.data.receipt.totalAmount,375.5);
    assert.equal(state.saleItems,1);assert.equal(state.stockOuts,1);assert.equal(state.commits,1);
    assert.equal(state.audits,1);assert.equal(state.rateLookups,1);assert.equal(state.rateWrites,0);
    const repeat=await request(payload);
    assert.equal(repeat.status,200,JSON.stringify(repeat.data));
    assert.equal(repeat.data.duplicate,true);
    assert.equal(state.commits,1);
    const altered=await request({...payload,deliveryFee:130});
    assert.equal(altered.status,409);
    assert.equal(state.commits,1);
  } finally {
    await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));
    pool.query=previousQuery;pool.getConnection=previousConnection;
    if(previousSecret===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=previousSecret;
  }
});
