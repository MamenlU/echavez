import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordAuditLog } from '../lib/auditService.js';
import { auditActorRole, getApprovedStaffId, makeAuditEntry, decorateAuditRows,
  enrichShiftApprovals, enrichAdjustmentApprovals } from '../lib/staffActivity.js';
import { getSalesFinancialHistory } from '../lib/financialMetrics.js';
import { getShiftMetrics } from '../lib/cashierShiftService.js';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.resolve(backendRoot, p), 'utf8');
const auditRoute = read('routes/auditLogs.js');
const shiftRoute = read('routes/cashierShifts.js');
const salesRoute = read('routes/sales.js');
const dashboard = read('../project/src/pages/AdminDashboard.tsx');
const cashier = read('../project/src/pages/CashierWorkspace.tsx');
const store = read('../project/src/components/Hero.tsx');
const customer = read('../project/src/pages/CustomerDashboard.tsx');
const footer = read('../project/src/components/Footer.tsx');

test('audit service adds immutable role-at-action snapshot and redacts approver secrets', async () => {
  const calls = [];
  const db = { async query(sql, params) { calls.push({sql,params}); return [{insertId:17}]; } };
  await recordAuditLog(db, {adminId:6, actorRole:'cashier', action:'cash_shift.open',
    entityType:'cashier_shift', entityId:18, summary:'Shift opened.',
    after:{approval:{id:3, role:'admin', status:'approved', password:'secret-test'}}});
  const stored = JSON.parse(calls[0].params[6]);
  assert.equal(stored.actor_role_at_action, 'cashier');
  assert.equal(stored.approval.id, 3);
  assert.equal(stored.approval.password, '[redacted]');
  assert.doesNotMatch(calls[0].params.join(' '), /secret-test/);
});

test('audit actor role uses historical snapshot instead of a subsequently promoted role', () => {
  assert.deepEqual(auditActorRole({actor_role_at_action:'cashier'}, 'super_admin'),
    {role:'cashier',role_source:'at_action'});
  assert.deepEqual(auditActorRole({}, 'admin'), {role:'admin',role_source:'current_account'});
});

test('failed approval verification cannot be misreported as approved', () => {
  assert.equal(getApprovedStaffId({approval:{id:5,status:'rejected'}}), null);
  const record = makeAuditEntry({audit_id:9, admin_id:4, admin_username:'cashier', admin_name:'Staff A',
    admin_role:'cashier', action:'approval.rejected', after_data:JSON.stringify({approval:{id:5,status:'rejected'}}), before_data:null});
  assert.equal(record.approval_status, 'verification_failed');
  assert.equal(record.approved_by, null);
});

test('approved distinct operator and approver are resolved from users without mutating audit rows', async () => {
  const db={async query(sql, params){assert.match(sql, /FROM users WHERE id IN \(\?\)/);assert.deepEqual(params, [[8]]);
    return [[{id:8, username:'manager', role:'admin', name:'Staff B'}]];}};
  const rows=[{audit_id:1, admin_id:5, admin_name:'Staff A',admin_username:'cashier',admin_role:'super_admin',
    action:'cash_shift.open',before_data:null, after_data:JSON.stringify({operator_role:'cashier',approval:{id:8,status:'approved',role:'admin'}})}];
  const result=await decorateAuditRows(db,rows);
  assert.equal(result[0].actor_role, 'cashier');
  assert.equal(result[0].approved_by.id,8);
  assert.equal(result[0].approved_by.role,'admin');
  assert.equal(result[0].admin_id,5);
  assert.equal(rows[0].after_data.includes('operator_role'),true);
});

test('shift approvals distinguish shift ownership and verified approver identities', async () => {
  let calls=0;
  const db={async query(sql,params){calls++;
    if (calls===1) {assert.match(sql,/al\.entity_type = 'cashier_shift'/);assert.deepEqual(params, [['42']]);
      return [[{entity_id:'42',action:'cash_shift.open',after_data:JSON.stringify({approval:{id:8,status:'approved'}})},
        {entity_id:'42',action:'cash_shift.close',after_data:JSON.stringify({approval:{id:9,status:'approved'}})}]];}
    assert.deepEqual(params, [[8,9]]);
    return [[{id:8,name:'Manager',username:'admin',role:'admin'},{id:9,name:'Owner',username:'boss',role:'super_admin'}]];
  }};
  const shifts=await enrichShiftApprovals(db,[{shift_id:42,admin_id:5,shift_owner_name:'Cashier A',shift_owner_role:'cashier'}]);
  assert.equal(shifts[0].admin_id,5);
  assert.equal(shifts[0].opening_approval.id,8);
  assert.equal(shifts[0].closing_approval.id,9);
  assert.equal(shifts[0].shift_owner_role,'cashier');
});

test('cashier /mine history is owner scoped, includes no raw audit payload, and full activity requires Admin', () => {
  assert.match(auditRoute,/router\.use\(authenticateToken, requirePosStaff\)/);
  assert.match(auditRoute,/router\.get\('\/mine'/);
  assert.match(auditRoute,/FROM audit_logs WHERE admin_id = \?/);
  assert.match(auditRoute,/\[req\.user\.id, limit\]/);
  assert.match(auditRoute,/router\.use\(requireAdmin\)/);
  assert.ok(auditRoute.indexOf("router.get('/mine'") < auditRoute.indexOf('router.use(requireAdmin)'));
  assert.doesNotMatch(auditRoute.slice(auditRoute.indexOf("router.get('/mine'"),auditRoute.indexOf('router.use(requireAdmin)')),/SELECT.*before_data/s);
  assert.doesNotMatch(auditRoute,/router\.(post|put|patch|delete)\(/);
  assert.match(cashier,/section === 'activity' && <MyActivity \/>/);
});

test('staff shift monitoring is read-only Admin/Super Admin and does not change personal shift ownership', () => {
  assert.match(shiftRoute,/router\.get\('\/staff', requireAdmin/);
  assert.match(shiftRoute,/router\.get\('\/staff\/:shiftId', requireAdmin/);
  assert.ok(shiftRoute.indexOf("router.get('/staff'") < shiftRoute.indexOf("router.get('/:shiftId'"));
  assert.match(shiftRoute,/WHERE shift_id = \? AND admin_id = \?/);
  assert.match(shiftRoute,/shift_owner_id: Number\(row\.admin_id\)/);
  assert.doesNotMatch(shiftRoute,/router\.post\('\/staff/);
});

test('financial sales include operator and shift owner identity without touching profitability rules', async () => {
  let called=false;
  const db={async query(sql){called=true;
    assert.match(sql,/operator\.id = financial_sales\.admin_id/);
    assert.match(sql,/owner\.id = cs\.admin_id/);
    assert.match(sql,/operator\.role AS operator_role/);
    assert.match(sql,/financial_sales\.shift_id/);
    return [[]];}};
  const result=await getSalesFinancialHistory(db);
  assert.equal(called,true);
  assert.deepEqual(result.sales,[]);
});

test('personal POS history uses authenticated operator, not authorizing manager', () => {
  assert.match(salesRoute,/WHERE s\.admin_id = \? AND s\.sales_source = 'Onsite POS'/);
  assert.match(salesRoute,/u\.role AS operator_role/);
  assert.match(salesRoute,/u\.id = s\.admin_id/);
  assert.match(dashboard,/staffIdentity\(sale\.operator_name/);
});

test('getShiftMetrics returns shift owner id, name and role from users relationship', async () => {
  const shifts=[[{shift_id:11,admin_id:5,admin_name:'Person A',admin_username:'worker',admin_role:'cashier',
    opening_cash:100,status:'Open',opened_at:'2026-11-07',closed_at:null}]];
  const db={async query(sql){
    if(sql.includes('FROM cashier_shifts cs')){assert.match(sql,/u\.role AS admin_role/);return shifts;}
    if(sql.includes('FROM sales'))return [[{pos_transaction_count:0,cash_sales_amount:0,card_sales_amount:0,total_pos_sales_amount:0}]];
    if(sql.includes('FROM sale_adjustments'))return [[{adjustment_count:0,cash_refunds_amount:0,all_refunds_amount:0}]];
    return [[{cash_expense_count:0,cash_expenses_amount:0}]];
  }};
  const result=await getShiftMetrics(db,11);
  assert.equal(result.shift_owner_id,5);
  assert.equal(result.shift_owner_name,'Person A');
  assert.equal(result.shift_owner_role,'cashier');
  assert.equal(result.expected_cash,100);
});

test('Storefront, Customer Dashboard, and frozen footer remain outside staff-side package', () => {
  assert.match(store,/Project-ready hardware/);
  assert.match(customer,/with the right supplies/);
  assert.match(footer,/to="\/project"/);
});


test('return/void history preserves processor identity and resolves the distinct authorized approver', async () => {
  let calls = 0;
  const db = {async query(sql, params) {
    calls++;
    if (calls === 1) {
      assert.match(sql, /al\.entity_type = 'sale_adjustment'/);
      assert.deepEqual(params, [['37']]);
      return [[{entity_id:'37',after_data:JSON.stringify({operator_role:'cashier',approval:{id:8,role:'admin',status:'approved'}})}]];
    }
    assert.deepEqual(params, [[8]]);
    return [[{id:8,username:'admin8',role:'super_admin',name:'Manager B'}]];
  }};
  const [item] = await enrichAdjustmentApprovals(db, [{adjustment_id:37,processed_by_admin_id:5,processed_by_role:'super_admin'}]);
  assert.equal(item.processed_by_admin_id,5);
  assert.equal(item.processed_by_role,'cashier');
  assert.equal(item.approval.id,8);
  assert.equal(item.approval.name,'Manager B');
  assert.equal(item.approval.role,'admin'); // role at approval, not subsequently promoted role
});
