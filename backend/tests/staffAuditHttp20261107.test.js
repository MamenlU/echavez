import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import auditLogsRouter from '../routes/auditLogs.js';
import cashierShiftsRouter from '../routes/cashierShifts.js';

// This is an isolated HTTP routing test with an in-memory SQL fixture.
// It never connects to or modifies a local or production database.
test('HTTP staff activity and shift endpoints enforce roles, personal scope and identity separation', async () => {
  const previousSecret = process.env.JWT_SECRET;
  const previousQuery = pool.query;
  const secret = 'test-only-staff-activity-fixture-secret-not-for-deployment';
  process.env.JWT_SECRET = secret;
  const accounts = {
    5: {id:5,username:'cashier5',role:'cashier',status:'active'},
    8: {id:8,username:'manager8',role:'admin',status:'active'},
    9: {id:9,username:'owner9',role:'super_admin',status:'active'},
  };
  const sqlCalls = [];
  pool.query = async (sql, params = []) => {
    sqlCalls.push({sql,params});
    if (sql.includes('SELECT id, username, role, status FROM users WHERE id = ?'))
      return [[accounts[Number(params[0])]].filter(Boolean)];
    if (sql.includes('FROM audit_logs WHERE admin_id = ?')) {
      assert.equal(params[0],5);
      return [[{audit_id:1,action:'sale.pos.complete',entity_type:'sale',entity_id:'21',
        summary:'Completed POS sale #21.',created_at:'2026-11-07T09:00:00'}]];
    }
    if (sql.includes('FROM audit_logs al') && sql.includes('INNER JOIN users u'))
      return [[{audit_id:2,admin_id:5,admin_name:'Cashier Person',admin_username:'cashier5',admin_role:'cashier',
        action:'cash_shift.open',entity_type:'cashier_shift',entity_id:'12',
        summary:'Opened shift.',before_data:null,after_data:JSON.stringify({actor_role_at_action:'cashier',approval:{id:8,role:'admin',status:'approved'}}),
        reason:null,created_at:'2026-11-07T09:00:00'}]];
    if (sql.includes('FROM cashier_shifts cs') && sql.includes('live_pos_count')) {
      assert.deepEqual(params,[50]);
      return [[{shift_id:12,admin_id:5,admin_username:'cashier5',admin_name:'Cashier Person',admin_role:'cashier',
        opening_cash:100,status:'Open',opened_at:'2026-11-07T09:00:00',closed_at:null,
        live_pos_count:1,live_cash_sales:250,live_card_sales:0,live_cash_refunds:0,live_cash_expenses:0,
        expected_cash:null,actual_cash:null,discrepancy:null}]];
    }
    if (sql.includes("al.entity_type = 'cashier_shift'"))
      return [[{entity_id:'12',action:'cash_shift.open',after_data:JSON.stringify({operator_role:'cashier',approval:{id:8,role:'admin',status:'approved'}})}]];
    if (sql.includes('FROM users WHERE id IN (?)')) {
      assert.deepEqual(params,[[8]]);
      return [[{id:8,username:'manager8',role:'admin',name:'Manager Person'}]];
    }
    if (sql.includes('FROM cashier_shifts cs') && sql.includes('WHERE cs.shift_id = ?'))
      return [[{shift_id:12,admin_id:5,admin_name:'Cashier Person',admin_username:'cashier5',admin_role:'cashier',opening_cash:100,status:'Open'}]];
    if (sql.includes('FROM sales') && sql.includes('WHERE shift_id = ?'))
      return [[{pos_transaction_count:1,cash_sales_amount:250,card_sales_amount:0,total_pos_sales_amount:250}]];
    if (sql.includes('FROM sale_adjustments') && sql.includes('WHERE shift_id = ?'))
      return [[{adjustment_count:0,cash_refunds_amount:0,all_refunds_amount:0}]];
    if (sql.includes('FROM expenses') && sql.includes('WHERE shift_id = ?'))
      return [[{cash_expense_count:0,cash_expenses_amount:0}]];
    throw new Error(`Unexpected query: ${sql.slice(0,170)}`);
  };
  const app = express();
  app.use(express.json());
  app.use('/api/audit-logs', auditLogsRouter);
  app.use('/api/cashier-shifts', cashierShiftsRouter);
  const server = await new Promise((resolve,reject) => {
    const listening = app.listen(0,'127.0.0.1', () => resolve(listening));
    listening.on('error',reject);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (url,id,method='GET') => {
    const user=accounts[id];
    const token=jwt.sign({id:user.id,username:user.username,role:user.role},secret,{algorithm:'HS256',expiresIn:'1h'});
    const response=await fetch(`${base}${url}`,{method,headers:{Authorization:`Bearer ${token}`}});
    return {status:response.status,body:await response.json().catch(()=>null)};
  };
  try {
    const mine=await request('/api/audit-logs/mine',5);
    assert.equal(mine.status,200);
    assert.equal(mine.body.activities[0].action,'sale.pos.complete');
    assert.equal(Object.hasOwn(mine.body.activities[0],'after_data'),false);
    assert.equal(Object.hasOwn(mine.body.activities[0],'before_data'),false);

    const cashierAll=await request('/api/audit-logs',5);
    assert.equal(cashierAll.status,403);
    const adminAll=await request('/api/audit-logs',8);
    assert.equal(adminAll.status,200);
    assert.equal(adminAll.body.logs[0].actor_role,'cashier');
    assert.equal(adminAll.body.logs[0].approved_by.id,8);
    assert.equal(adminAll.body.logs[0].approved_by.role,'admin');

    const cashierMonitoring=await request('/api/cashier-shifts/staff',5);
    assert.equal(cashierMonitoring.status,403);
    const adminMonitoring=await request('/api/cashier-shifts/staff',8);
    assert.equal(adminMonitoring.status,200);
    assert.equal(adminMonitoring.body.shifts[0].shift_owner_id,5);
    assert.equal(adminMonitoring.body.shifts[0].shift_owner_role,'cashier');
    assert.equal(adminMonitoring.body.shifts[0].opening_approval.id,8);
    assert.equal(adminMonitoring.body.shifts[0].expected_cash,350);
    const superMonitoring=await request('/api/cashier-shifts/staff',9);
    assert.equal(superMonitoring.status,200);

    const cashierOtherShift=await request('/api/cashier-shifts/12',8);
    assert.equal(cashierOtherShift.status,404); // Management must use read-only /staff/:id instead.
    const adminDetail=await request('/api/cashier-shifts/staff/12',8);
    assert.equal(adminDetail.status,200);
    assert.equal(adminDetail.body.shift.shift_owner_id,5);
    assert.equal(adminDetail.body.shift.opening_approval.name,'Manager Person');
    assert.equal(sqlCalls.some(call=>/UPDATE |INSERT INTO |DELETE FROM /.test(call.sql)),false);
  } finally {
    await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));
    pool.query=previousQuery;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET=previousSecret;
  }
});
