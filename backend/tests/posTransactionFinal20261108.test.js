import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import salesRouter from '../routes/sales.js';

test('card POS sale commits once with terminal ref, receipt and stock-out; matching request retries idempotently', async () => {
  const oldQuery=pool.query,oldConnection=pool.getConnection,oldSecret=process.env.JWT_SECRET;
  process.env.JWT_SECRET='test-only-pos-transaction-secret';
  const user={id:5,username:'cashier5',role:'cashier',status:'active'};
  const state={sale:null,items:[],updates:0,stockouts:0,audits:0,commits:0,rollbacks:0};
  const dbQuery=async (sql,params=[]) => {
    const q=String(sql).replace(/\s+/g,' ');
    if (q.includes('FROM users WHERE id = ?')) return [[user]];
    if (q.includes('FROM sales WHERE pos_request_id')) return [state.sale ? [{sale_id:701,total_amount:250,admin_id:5}] : []];
    if (q.includes('FROM sales s') && q.includes("'Onsite POS'")) return [state.sale ? [{...state.sale,
      sale_id:701,admin_id:5,shift_id:9,sale_date:'2026-11-08T09:00:00',sales_source:'Onsite POS',
      payment_status:'Paid',operator_name:'Test Cashier',operator_username:'cashier5',operator_role:'cashier'}] : []];
    if (q.includes('FROM sale_items si')) return [state.items.map(x=>({product_id:x.productId,name:'Hammer',quantity:x.quantity,unit_price:250,subtotal:250}))];
    if (q.includes('FROM sale_adjustments WHERE sale_id')) return [[{adjustment_count:0,void_count:0}]];
    if (q.includes('FROM cashier_shifts') && q.includes("status = 'Open'")) return [[{shift_id:9,admin_id:5,status:'Open'}]];
    if (q.includes('FROM products WHERE id = ?')) return [[{id:14,name:'Hammer',price:250,stock:12,status:'active',fulfillment_rule:'all'}]];
    if (q.includes('FROM inventory_movements WHERE product_id = ?')) return [[{movement_count:1,inventory_value:900}]];
    if (q.includes('INSERT INTO sales')) {
      assert.match(q,/card_payment_reference/);
      assert.equal(params[params.length-1],'TERMINAL-TEST-782');
      state.sale={total_amount:250,delivery_fee:0,fulfillment:'pickup',customer_name:'Optional Buyer',
        payment_method:'Card',card_payment_reference:'TERMINAL-TEST-782',cash_received:null,change_amount:null};
      return [{insertId:701,affectedRows:1}];
    }
    if (q.includes('INSERT INTO sale_items')) {state.items.push({productId:Number(params[1]),quantity:Number(params[2])});return [{affectedRows:1}];}
    if (q.includes('UPDATE products SET stock')) {state.updates++;return [{affectedRows:1}];}
    if (q.includes('INSERT INTO inventory_movements')) {state.stockouts++;return [{insertId:3001,affectedRows:1}];}
    if (q.includes('INSERT INTO audit_logs')) {state.audits++;return [{insertId:9001,affectedRows:1}];}
    throw new Error(`Unexpected SQL in mocked POS checkout: ${q.slice(0,140)}`);
  };
  pool.query=dbQuery;
  pool.getConnection=async()=>({query:dbQuery,beginTransaction:async()=>{},commit:async()=>{state.commits++;},rollback:async()=>{state.rollbacks++;},release:()=>{}});
  const app=express();app.use(express.json());app.use('/api/sales',salesRouter);
  const server=await new Promise((resolve,reject)=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));s.on('error',reject);});
  const target=`http://127.0.0.1:${server.address().port}/api/sales/pos`;
  const request=async body => {
    const token=jwt.sign({id:5,username:'cashier5',role:'cashier'},process.env.JWT_SECRET,{expiresIn:'1h'});
    const response=await fetch(target,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)});
    return {status:response.status,data:await response.json()};
  };
  const payload={items:[{product:{id:14},quantity:1}],posRequestId:'pos-test-unique-id',paymentMethod:'card',
    cardPaymentConfirmed:true,cardPaymentReference:'TERMINAL-TEST-782',customerName:'Optional Buyer',fulfillment:'pickup'};
  try {
    const first=await request(payload);
    assert.equal(first.status,201,JSON.stringify(first.data));
    assert.equal(first.data.receipt.reference,'POS-000701');
    assert.equal(first.data.receipt.cardPaymentReference,'TERMINAL-TEST-782');
    assert.equal(state.commits,1);
    assert.equal(state.updates,1);
    assert.equal(state.stockouts,1);
    assert.equal(state.audits,1);
    const retry=await request(payload);
    assert.equal(retry.status,200,JSON.stringify(retry.data));
    assert.equal(retry.data.duplicate,true);
    assert.equal(retry.data.receipt.saleId,701);
    assert.equal(state.commits,1);
    const changed=await request({...payload,cardPaymentReference:'TERMINAL-OTHER-782'});
    assert.equal(changed.status,409);
    assert.equal(state.commits,1);
  } finally {
    await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));
    pool.query=oldQuery;pool.getConnection=oldConnection;
    if(oldSecret===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=oldSecret;
  }
});
