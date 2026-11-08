import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import salesRouter from '../routes/sales.js';
import { getPosReceipt, matchesPosReceipt } from '../lib/posReceiptService.js';

const existing = {
  sale_id: 501, admin_id: 12, shift_id: 33, sale_date: '2026-11-08T10:30:00',
  sales_source: 'Onsite POS', fulfillment: 'pickup', payment_status: 'Paid',
  payment_method: 'Card', total_amount: '750.00', delivery_fee: '0.00', cash_received: null,
  change_amount: null, card_payment_reference: 'TERMINAL-2026-7788', customer_name: 'Optional Walk-in',
  operator_name: 'Example Staff', operator_username: 'example', operator_role: 'cashier',
};
const itemRows = [
  {product_id: 18, name: 'Hammer', quantity: 2, unit_price: '250.00', subtotal: '500.00'},
  {product_id: 19, name: 'Nails', quantity: 1, unit_price: '250.00', subtotal: '250.00'},
];
const db = { query: async (sql) => {
  if (sql.includes('FROM sales s') && sql.includes("'Onsite POS'")) return [[existing]];
  if (sql.includes('FROM sale_items si')) return [itemRows];
  if (sql.includes('FROM sale_adjustments WHERE sale_id')) return [[{adjustment_count:0,void_count:0}]];
  throw new Error(`Unexpected SQL: ${sql}`);
}};

test('POS receipt is generated from saved sale/items and includes operator, shift, card reference, customer', async () => {
  const receipt = await getPosReceipt(db, 501);
  assert.equal(receipt.reference, 'POS-000501');
  assert.equal(receipt.operatorRole, 'cashier');
  assert.equal(receipt.operatorName, 'Example Staff');
  assert.equal(receipt.shiftId, 33);
  assert.equal(receipt.totalAmount, 750);
  assert.equal(receipt.cardPaymentReference, 'TERMINAL-2026-7788');
  assert.equal(receipt.customerName, 'Optional Walk-in');
  assert.equal(receipt.items[0].name, 'Hammer');
  assert.equal(receipt.items[0].subtotal, 500);
  assert.equal(receipt.adjustmentState, 'Completed');
});

test('retry matches saved cart and payment, but rejects changed amount, customer, and card reference', async () => {
  const receipt = await getPosReceipt(db, 501);
  const original = {items:[{product:{id:18},quantity:2},{product:{id:19},quantity:1}],paymentMethod:'card',
    cardPaymentReference:'TERMINAL-2026-7788', pos:{fulfillment:'pickup',deliveryFee:0,customerName:'Optional Walk-in'}};
  assert.equal(matchesPosReceipt(receipt,original),true);
  assert.equal(matchesPosReceipt(receipt,{...original,cardPaymentReference:'DIFFERENT'}),false);
  assert.equal(matchesPosReceipt(receipt,{...original,pos:{...original.pos,customerName:'Other Customer'}}),false);
  assert.equal(matchesPosReceipt(receipt,{...original,items:[{product:{id:18},quantity:1},{product:{id:19},quantity:1}]}),false);
  assert.equal(matchesPosReceipt(receipt,{...original,paymentMethod:'cash',cashReceived:750}),false);
});

test('receipt read endpoint restricts cashier to own sale; admin can review all, card sale requires reference', async () => {
  const savedQuery=pool.query;
  const prevSecret=process.env.JWT_SECRET;
  process.env.JWT_SECRET='pos-final-http-test-only-signature';
  const users={12:{id:12,username:'cashier',role:'cashier',status:'active'},
    13:{id:13,username:'othercashier',role:'cashier',status:'active'},
    20:{id:20,username:'admin',role:'admin',status:'active'}};
  let mutations=0;
  pool.query=async (sql,params=[]) => {
    if (sql.includes('SELECT id, username, role, status FROM users WHERE id = ?')) return [[users[params[0]]].filter(Boolean)];
    if (sql.includes('FROM sales s') && sql.includes("'Onsite POS'")) return [[existing]];
    if (sql.includes('FROM sale_items si')) return [itemRows];
    if (sql.includes('FROM sale_adjustments WHERE sale_id')) return [[{adjustment_count:0,void_count:0}]];
    if (/INSERT INTO|UPDATE |DELETE FROM/.test(sql)) mutations++;
    throw new Error(`Unexpected test SQL ${sql.slice(0,100)}`);
  };
  const app=express();app.use(express.json());app.use('/api/sales',salesRouter);
  const server=await new Promise((resolve,reject) => {const s=app.listen(0,'127.0.0.1',()=>resolve(s));s.on('error',reject);});
  const url=`http://127.0.0.1:${server.address().port}`;
  const request=async (id,path,method='GET',body=null) => {
    const u=users[id];const token=jwt.sign({id:u.id,role:u.role,username:u.username},process.env.JWT_SECRET,{expiresIn:'1h'});
    const res=await fetch(`${url}${path}`,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:body?JSON.stringify(body):undefined});
    return {status:res.status,data:await res.json()};
  };
  try {
    const owner=await request(12,'/api/sales/pos/501/receipt');
    assert.equal(owner.status,200);
    assert.equal(owner.data.receipt.cardPaymentReference,'TERMINAL-2026-7788');
    assert.equal((await request(13,'/api/sales/pos/501/receipt')).status,403);
    assert.equal((await request(20,'/api/sales/pos/501/receipt')).status,200);
    const checkout=await request(12,'/api/sales/pos','POST',{
      items:[{product:{id:18},quantity:1}],posRequestId:'test-reference',
      paymentMethod:'card',cardPaymentConfirmed:true,fulfillment:'pickup'
    });
    assert.equal(checkout.status,400);
    assert.match(checkout.data.error,/terminal payment reference/i);
    assert.equal(mutations,0);
  } finally {
    await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));
    pool.query=savedQuery;
    if(prevSecret===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=prevSecret;
  }
});
