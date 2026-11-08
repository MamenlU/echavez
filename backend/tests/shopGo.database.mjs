// Optional real-MariaDB check for a LOCAL XAMPP server.
// Creates and removes only a new rayjin_stage1_test_* database using synthetic rows.
// PayMongo is simulated: this does NOT charge money or verify the live gateway.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';

dotenv.config({ quiet: true });
const host = process.env.RAYJIN_TEST_DB_HOST || process.env.DB_HOST || '127.0.0.1';
if (!['localhost', '127.0.0.1', '::1'].includes(host) || process.env.DATABASE_URL) {
    throw new Error('This test only accepts a local database. Use a separate local copy with DB_HOST=127.0.0.1 and no DATABASE_URL.');
}
const name = 'rayjin_stage1_test_' + randomBytes(8).toString('hex');
const config = { host, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', multipleStatements: true };
const bootstrap = await mysql.createConnection(config);
let database, pool, server;
let created = false;
try {
    await bootstrap.query('CREATE DATABASE ' + name + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci');
    created = true;
    database = await mysql.createConnection({ ...config, database: name });
    const schema = await readFile(new URL('./fixtures/current-schema.sql', import.meta.url), 'utf8');
    if (/\b(?:USE|DROP\s+DATABASE|CREATE\s+DATABASE)\s+/i.test(schema.replace(/--[^\n]*/g, ''))) throw new Error('Fixture must contain tables only.');
    await database.query(schema);
    const migration = await readFile(new URL('../migrations/20260908_payment_verification.sql', import.meta.url), 'utf8');
    await database.query(migration);
    await database.query(migration); // additive migration must be safe to repeat
    await database.query(
        "INSERT INTO users (id, username, email, role, first_name, phone_number) VALUES (1,'fixture_admin','admin@example.test','admin','Admin','09170000001'),(2,'fixture_customer','customer@example.test','customer','Customer','09170000002'),(3,'fixture_other','other@example.test','customer','Other','09170000003');" +
        "INSERT INTO categories (category_id,category_name) VALUES (1,'Fixture Tools');" +
        "INSERT INTO suppliers (supplier_id,supplier_name) VALUES (1,'Fixture Supplier');" +
        "INSERT INTO products (id,name,price,category,category_id,supplier_id,image,stock,brand,delivery_class) VALUES (1,'Fixture Hammer',200,'Fixture Tools',1,1,'',10,'Fixture','standard');" +
        "INSERT INTO inventory_movements (product_id,admin_id,supplier_id,movement_type,quantity,supplier_price,selling_price,remarks) VALUES (1,1,1,'Stock-In',10,100,200,'Synthetic opening stock');" +
        "INSERT INTO delivery_rates (id,municipality,barangay,zone,surcharge,is_active) VALUES (1,'Initao','Poblacion','poblacion',25,1)"
    );
    process.env.NODE_ENV = 'production';
    process.env.DB_HOST = host; process.env.DB_NAME = name;
    process.env.JWT_SECRET = 'fixture-' + randomBytes(24).toString('hex');
    ({ default: pool } = await import('../db.js'));
    const { default: orders } = await import('../routes/orders.js');
    const { createPaymongoRouter } = await import('../routes/paymongo.js');
    const resources = new Map();
    let sequence = 0;
    async function simulatedGateway(url, options) {
        if (!url.startsWith('https://api.paymongo.com/v1/checkout_sessions')) throw new Error('Unexpected gateway request');
        if (options.method === 'POST') {
            const attributes = JSON.parse(options.body).data.attributes;
            const id = 'cs_fixture' + ++sequence;
            const data = { data: { id, type: 'checkout_session', attributes: { ...attributes, checkout_url: 'https://checkout.paymongo.com/' + id, livemode: false, status: 'active', payments: [] } } };
            resources.set(id, data);
            return { ok: true, json: async () => structuredClone(data) };
        }
        const data = resources.get(url.split('/').pop());
        return { ok: Boolean(data), json: async () => structuredClone(data || {}) };
    }
    const app = express();
    app.use(express.json()); app.use('/api/orders', orders);
    app.use('/api/paymongo', createPaymongoRouter({ database: pool, request: simulatedGateway, env: { PAYMONGO_SECRET_KEY: 'sk_test_fixture' } }));
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const origin = 'http://127.0.0.1:' + server.address().port;
    const customer = jwt.sign({ id: 2, role: 'customer' }, process.env.JWT_SECRET);
    const admin = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET);
    const other = jwt.sign({ id: 3, role: 'customer' }, process.env.JWT_SECRET);
    async function api(path, body, token = customer, method = 'POST', expected = 200) {
        const res = await fetch(origin + path, {
            method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            ...(method === 'GET' ? {} : { body: JSON.stringify(body) }),
        });
        const data = await res.json();
        assert.equal(res.status, expected, path + ': ' + JSON.stringify(data));
        return data;
    }
    async function row(sql, args = []) { const [rows] = await database.query(sql, args); return rows[0]; }
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const payload = { fulfillment: 'shop_go', paymentMethod: 'gcash', requestedPickupDate: tomorrow, requestedPickupTime: '12:00',
        items: [{ product: { id: 1, price: 1 }, quantity: 1 }, { product: { id: 1, price: 1 }, quantity: 1 }], total: 1, serviceFee: 0 };
    await api('/api/orders', { ...payload, requestedPickupDate: '2027-02-30' }, customer, 'POST', 400);
    await api('/api/orders', { ...payload, paymentMethod: 'cash' }, customer, 'POST', 400);
    const placed = await api('/api/orders', payload, customer, 'POST', 201);
    const id = placed.orderId;
    assert.equal(placed.productTotal, 400); assert.equal(placed.serviceFee, 50); assert.equal(placed.grandTotal, 450);
    assert.equal((await row('SELECT stock FROM products WHERE id=1')).stock, 10);
    const saved = await row('SELECT * FROM orders WHERE id=?', [id]);
    assert.equal(saved.status, 'pending'); assert.equal(Number(saved.service_fee), 50);
    assert.equal((await row('SELECT COUNT(*) AS n FROM order_items WHERE order_id=?', [id])).n, 1);
    await api('/api/orders/' + id + '/status', { status: 'approved' }, admin, 'PUT', 409);
    await api('/api/paymongo/create-link', { orderId: id }, other, 'POST', 404);
    await api('/api/paymongo/create-link', { orderId: id, amount: 1 });
    const session = await row('SELECT paymongo_link_id FROM orders WHERE id=?', [id]);
    const resource = resources.get(session.paymongo_link_id);
    assert.equal(resource.data.attributes.line_items[0].amount, 45000);
    assert.equal((await api('/api/paymongo/confirm-payment', { orderId: id })).paymentStatus, 'Pending');
    assert.equal((await api('/api/paymongo/cancel-payment', { orderId: id })).paymentStatus, 'Pending');
    assert.equal((await row('SELECT status FROM orders WHERE id=?', [id])).status, 'pending');
    resource.data.attributes.payments.push({ id: 'pay_fixture1', type: 'payment', attributes: { amount: 45000, currency: 'PHP', livemode: false, status: 'paid', source: { type: 'gcash' }, refunds: [] } });
    await Promise.all([api('/api/paymongo/confirm-payment', { orderId: id }), api('/api/paymongo/confirm-payment', { orderId: id }, admin)]);
    assert.equal((await row('SELECT COUNT(*) AS n FROM payments WHERE order_id=?', [id])).n, 1);
    assert.equal((await row('SELECT status FROM orders WHERE id=?', [id])).status, 'pending');
    assert.equal((await row('SELECT stock FROM products WHERE id=1')).stock, 10);
    await api('/api/orders/' + id + '/status', { status: 'approved' }, admin, 'PUT', 409);
    await api('/api/orders/' + id + '/shop-go-schedule', { scheduledPickupDate: tomorrow, scheduledPickupTime: '13:00', adminMessage: 'Fixture schedule' }, admin, 'PUT');
    for (const status of ['approved', 'processing', 'ready']) {
        await api('/api/orders/' + id + '/status', { status }, admin, 'PUT');
        assert.equal((await row('SELECT stock FROM products WHERE id=1')).stock, 10);
    }
    await Promise.all([api('/api/orders/' + id + '/status', { status: 'completed' }, admin, 'PUT'), api('/api/orders/' + id + '/status', { status: 'completed' }, admin, 'PUT')]);
    assert.equal((await row('SELECT stock FROM products WHERE id=1')).stock, 8);
    const sale = await row('SELECT * FROM sales WHERE order_id=?', [id]);
    assert.equal(Number(sale.total_amount), 450); assert.equal(sale.payment_method, 'gcash'); assert.equal(sale.sales_source, 'Online Order');
    assert.equal((await row('SELECT COUNT(*) AS n FROM sales WHERE order_id=?', [id])).n, 1);
    const movement = await row("SELECT * FROM inventory_movements WHERE sale_id=? AND movement_type='Stock-Out'", [sale.sale_id]);
    assert.equal(movement.quantity, 2); assert.equal(Number(movement.supplier_price), 100);
    assert.equal((await row("SELECT COUNT(*) AS n FROM inventory_movements WHERE sale_id=?", [sale.sale_id])).n, 1);
    const list = await api('/api/orders/2', undefined, customer, 'GET');
    assert.equal(list.find(order => order.id === id).payment_reference, 'pay_fixture1');
    assert.equal(list.find(order => order.id === id).payment_status, 'Paid');

    // Cash pickup and delivery regressions retain the current transitions in Stage 1.
    for (const fulfillment of ['pickup', 'delivery']) {
        const p = { fulfillment, paymentMethod: 'cash', items: [{ product: { id: 1 }, quantity: 2 }],
            deliveryContactPerson: 'Fixture Customer', deliveryContactNumber: '09170000002', deliveryMunicipality: 'Initao', deliveryBarangay: 'Poblacion',
            deliveryAddress: 'Fixture address', deliveryLandmark: '', deliveryInstructions: '' };
        const order = await api('/api/orders', p, customer, 'POST', 201);
        if (fulfillment === 'delivery') await api('/api/orders/' + order.orderId + '/delivery-review', { deliveryFee: 175, adminMessage: 'Confirmed' }, admin, 'PUT');
        for (const status of ['approved', 'processing', fulfillment === 'delivery' ? 'out_for_delivery' : 'ready', 'completed']) {
            await api('/api/orders/' + order.orderId + '/status', { status }, admin, 'PUT');
        }
        assert.equal((await row('SELECT payment_status FROM orders WHERE id=?', [order.orderId])).payment_status, 'Paid');
    }
    assert.equal((await row('SELECT stock FROM products WHERE id=1')).stock, 4);
    console.log('PASS: MariaDB migration twice; Shop & Go checkout/fees/schedule/payment/approval/completion; concurrent duplicate protection; exact sales and stock-out; customer visibility; cash pickup and delivery regression.');
    console.log('PayMongo was simulated. Browser, real gateway, Standard Pickup redesign, reports, and full defense evaluation remain separate checks.');
} finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (pool) await pool.end();
    if (database) await database.end();
    if (created && /^rayjin_stage1_test_[a-f0-9]{16}$/.test(name)) await bootstrap.query('DROP DATABASE ' + name);
    await bootstrap.end();
}
