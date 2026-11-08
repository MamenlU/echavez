import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ordersSource = await readFile(new URL('../routes/orders.js', import.meta.url), 'utf8');
const schemaSource = await readFile(new URL('./fixtures/current-schema.sql', import.meta.url), 'utf8');

test('orders schema stays nullable while Local Delivery requires coordinates at the application layer', () => {
  assert.match(schemaSource, /`delivery_latitude` decimal\(10,7\) DEFAULT NULL/);
  assert.match(schemaSource, /`delivery_longitude` decimal\(10,7\) DEFAULT NULL/);
  assert.match(ordersSource, /!latitudeProvided && !longitudeProvided/);
  assert.match(ordersSource, /select and confirm the exact delivery location on the map/i);
});

test('delivery coordinates require a complete primitive pair and valid geographic bounds', () => {
  assert.match(ordersSource, /latitudeProvided !== longitudeProvided/);
  assert.match(ordersSource, /coordinateInputsArePrimitive/);
  assert.match(ordersSource, /latitude < -90 \|\| latitude > 90/);
  assert.match(ordersSource, /longitude < -180 \|\| longitude > 180/);
});

test('pickup and Shop & Go do not store delivery coordinates', () => {
  const deliveryBlockStart = ordersSource.indexOf("if (fulfillment === 'delivery') {");
  const transactionStart = ordersSource.indexOf('const connection = await pool.getConnection();', deliveryBlockStart);
  assert.ok(deliveryBlockStart > -1 && transactionStart > deliveryBlockStart);
  const block = ordersSource.slice(deliveryBlockStart, transactionStart);
  assert.match(block, /deliveryLatitudeForDatabase = Number\(latitude\.toFixed\(7\)\)/);
  assert.match(block, /deliveryLongitudeForDatabase = Number\(longitude\.toFixed\(7\)\)/);
});

test('Delivery-only quantity is the Delivery charge multiplier without changing the schema', () => {
  assert.match(ordersSource, /let deliveryOnlyChargeableQuantity = 0/);
  assert.match(ordersSource, /deliveryOnlyChargeableQuantity \+= quantity/);
  assert.match(ordersSource, /deliveryOnlyChargeableQuantity > 0/);
  assert.match(ordersSource, /\(baseFee \+ barangaySurcharge\) \*/);
});
