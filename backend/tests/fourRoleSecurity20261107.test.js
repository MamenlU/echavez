import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'unit-test-jwt-only';
const { default: pool } = await import('../db.js');
const { default: express } = await import('express');
const { default: jwt } = await import('jsonwebtoken');
const { default: bcrypt } = await import('bcrypt');
const { requireActionApproval, requireSuperAdmin, requireAdmin, requirePosStaff, authenticateToken } = await import('../middleware/auth.js');
const { default: ordersRouter } = await import('../routes/orders.js');
const originalQuery = pool.query;
const originalGetConnection = pool.getConnection;
const roles = { 1: 'admin', 2: 'cashier', 3: 'customer', 4: 'super_admin' };
const passwordHash = await bcrypt.hash('Test#Strong123', 6);
let operations = []; let commits = 0; let rollbacks = 0;
const state = { arrival: false, shift: true, orderStatus: 'ready', payMethod: 'cash' };
const row = (id) => ({ id, role: roles[id] || 'customer', username: `user${id}`, status: 'active', password_hash: passwordHash });
const fakeQuery = async (raw, args = []) => {
  const sql = String(raw).replace(/\s+/g,' ').trim();
  if (sql.includes('FROM users WHERE id = ? LIMIT 1')) return [[row(Number(args[0]))]];
  if (sql.includes('FROM users') && sql.includes('password_hash') && sql.includes('username = ?')) {
    const id = Number(String(args[0]).replace('user',''));
    return [[Number.isInteger(id) ? row(id) : undefined].filter(Boolean)];
  }
  if (sql.includes('FROM orders o INNER JOIN users u')) {
    return [[{ id:'ORDER-42', status: state.orderStatus, fulfillment: 'pickup',
      payment_method: state.payMethod, payment_status: 'Pending', total: 100,
      service_fee: 0, delivery_fee: 0, customer_name: 'Test Customer', arrival_verified: state.arrival ? 1 : 0 }]];
  }
  if (sql.includes('FROM order_items oi INNER JOIN products p') && sql.includes('WHERE oi.order_id IN')) {
    return [[{ order_id:'ORDER-42', quantity:1, price:100, product_name:'Hammer' }]];
  }
  if (sql.includes('FROM orders WHERE id = ? LIMIT 1 FOR UPDATE')) {
    return [[{ id:'ORDER-42', status:state.orderStatus, fulfillment:'pickup', scheduled_pickup_date:null }]];
  }
  if (sql.includes('FROM orders') && sql.includes('FOR UPDATE')) {
    return [[{ id:'ORDER-42', user_id:3, status:state.orderStatus, fulfillment:'pickup',
      total:100, service_fee:0, delivery_fee:0, payment_method:state.payMethod,
      payment_status:'Pending', scheduled_pickup_date:null, scheduled_pickup_time:null }]];
  }
  if (sql.includes('FROM order_status_history') && sql.includes('pickup_arrival_verified')) {
    return [state.arrival ? [{history_id:21}] : []];
  }
  if (sql.includes('FROM cashier_shifts') && sql.includes("status = 'Open'")) {
    return [state.shift ? [{shift_id:7,admin_id:2,status:'Open',opening_cash:500}] : []];
  }
  if (sql.includes('FROM order_items oi') && sql.includes('JOIN products p')) {
    return [[{ product_id:15, quantity:1, price:100, name:'Hammer', stock:10 }]];
  }
  if (sql.includes('FROM products') && sql.includes('FOR UPDATE')) return [[{stock:10}]];
  if (sql.includes('FROM inventory_movements') && sql.includes('movement_count')) {
    return [[{movement_count:1,inventory_value:300}]];
  }
  if (sql.startsWith('SELECT') && sql.includes('FROM payments')) return [[]];
  if (sql.startsWith('INSERT') || sql.startsWith('UPDATE')) {
    operations.push({sql,args}); return [{insertId:99, affectedRows:1}];
  }
  throw new Error(`Unexpected fake SQL: ${sql}`);
};
const connection = () => ({ query: fakeQuery,
  beginTransaction: async()=>{}, commit:async()=>{commits++;}, rollback:async()=>{rollbacks++;}, release:()=>{} });
pool.query = fakeQuery; pool.getConnection = async()=>connection();
const app = express(); app.use(express.json());
app.get('/admin', authenticateToken, requireAdmin, (_req,res)=>res.json({ok:true}));
app.get('/owner', authenticateToken, requireSuperAdmin, (_req,res)=>res.json({ok:true}));
app.get('/pos', authenticateToken, requirePosStaff, (_req,res)=>res.json({ok:true}));
app.post('/approval/open', authenticateToken, requirePosStaff, requireActionApproval('shift_open'),
  (req,res)=>res.json({approval: req.managerApproval?.role || null}));
app.post('/approval/adjust', authenticateToken, requirePosStaff, requireActionApproval('sale_adjustment'),
  (req,res)=>res.json({approval: req.managerApproval?.role || null}));
app.use('/orders', ordersRouter);
const server = await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const req = async(method,url,id,body)=>{
  const token=jwt.sign({id,role:roles[id],username:`user${id}`},process.env.JWT_SECRET,{expiresIn:'15m'});
  const resp=await fetch(base+url,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
    body: body===undefined?undefined:JSON.stringify(body)});
  return {status:resp.status,data:await resp.json()};
};
try {
  await test('only Super Admin manages owner-only routes; other staff retain scoped access', async()=>{
    assert.equal((await req('GET','/owner',4)).status,200);
    assert.equal((await req('GET','/owner',1)).status,403);
    assert.equal((await req('GET','/owner',2)).status,403);
    assert.equal((await req('GET','/admin',4)).status,200);
    assert.equal((await req('GET','/pos',2)).status,200);
    assert.equal((await req('GET','/pos',3)).status,403);
  });
  await test('cashier opening requires distinct Admin or Super Admin credentials; denials logged',async()=>{
    operations=[];
    assert.equal((await req('POST','/approval/open',2,{})).status,403);
    assert.equal((await req('POST','/approval/open',2,{managerUsername:'user2',managerPassword:'Test#Strong123'})).status,403);
    assert.equal((await req('POST','/approval/open',2,{managerUsername:'user1',managerPassword:'wrong'})).status,403);
    assert.ok(operations.every(x=>x.sql.includes('INSERT INTO audit_logs')),'no business writes on rejected approval');
    assert.ok(operations.length>=3,'rejected attempt must be audited');
    assert.equal((await req('POST','/approval/open',2,{managerUsername:'user1',managerPassword:'Test#Strong123'})).status,200);
    assert.equal((await req('POST','/approval/open',2,{managerUsername:'user4',managerPassword:'Test#Strong123'})).status,200);
  });
  await test('Admin sensitive adjustment requires Super Admin; Super Admin reauthenticates own action',async()=>{
    assert.equal((await req('POST','/approval/adjust',1,{managerUsername:'user1',managerPassword:'Test#Strong123'})).status,403);
    const approved=await req('POST','/approval/adjust',1,{managerUsername:'user4',managerPassword:'Test#Strong123'});
    assert.equal(approved.status,200); assert.equal(approved.data.approval,'super_admin');
    assert.equal((await req('POST','/approval/adjust',4,{})).status,403);
    assert.equal((await req('POST','/approval/adjust',4,{managerUsername:'user4',managerPassword:'Test#Strong123'})).status,200);
  });
  await test('Cashier fulfillment queue is limited and Local Delivery does not allow status change',async()=>{
    const queue=await req('GET','/orders/cashier/fulfillment?type=pickup',2);
    assert.equal(queue.status,200,JSON.stringify(queue.data));
    assert.equal(queue.data.orders[0].items[0].name,'Hammer');
    assert.ok(!('phone_number' in queue.data.orders[0]));
    assert.equal((await req('PUT','/orders/ORDER-42/status',2,{status:'approved'})).status,403);
    assert.equal((await req('POST','/orders/cashier/fulfillment/ORDER-42/arrival',2,{presentedOrderId:'WRONG',customerPresent:true})).status,400);
  });
  await test('Cashier completion is blocked without arrival, cash tender or open shift',async()=>{
    state.arrival=false;state.shift=true;operations=[];commits=0;
    let response=await req('PUT','/orders/ORDER-42/status',2,{status:'completed',cashReceived:100});
    assert.equal(response.status,409,JSON.stringify(response.data));
    assert.equal(commits,0);assert.equal(operations.length,0);
    state.arrival=true;state.shift=false;
    response=await req('PUT','/orders/ORDER-42/status',2,{status:'completed',cashReceived:100});
    assert.equal(response.status,409,JSON.stringify(response.data));
    state.shift=true;
    response=await req('PUT','/orders/ORDER-42/status',2,{status:'completed',cashReceived:10});
    assert.equal(response.status,400,JSON.stringify(response.data));
    assert.equal(commits,0);assert.equal(operations.length,0);
  });
  await test('Cashier paid cash release creates one linked online sale, stock-out and audit',async()=>{
    state.arrival=true;state.shift=true;state.orderStatus='ready';operations=[];commits=0;
    const response=await req('PUT','/orders/ORDER-42/status',2,{status:'completed',cashReceived:150});
    assert.equal(response.status,200,JSON.stringify(response.data));
    assert.equal(commits,1);
    for(const fragment of ['INSERT INTO sales','INSERT INTO sale_items','UPDATE products','INSERT INTO inventory_movements','INSERT INTO audit_logs']) {
      assert.ok(operations.some(x=>x.sql.includes(fragment)),fragment);
    }
    const sale=operations.find(x=>x.sql.includes('INSERT INTO sales'));
    assert.equal(sale.args[1],2,'Cashier is recorded as actor');
    assert.equal(sale.args[2],7,'Sale links to Cashier shift');
    assert.ok(operations.some(x=>x.sql.includes('INSERT INTO audit_logs') && JSON.stringify(x.args).includes('pickup.handover')));
  });
} finally {
  pool.query=originalQuery;pool.getConnection=originalGetConnection;
  await new Promise(resolve=>server.close(resolve));
}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
test('local schema migration and Super Admin provisioning cannot modify production by default',()=>{
  const migration=read('migrations/20261107_super_admin_role_MANUAL_REVIEW.sql');
  assert.match(migration,/`echavez_cashier_test`\.`users`/);
  assert.match(migration,/ENUM\('customer','admin','cashier','super_admin'\)/);
  assert.doesNotMatch(migration,/DROP TABLE|TRUNCATE TABLE|DELETE FROM/i);
  assert.match(read('routes/auth.js'), /router\.post\('\/staff\/admins', authenticateToken, requireSuperAdmin/);
});
