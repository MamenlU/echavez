import assert from 'node:assert/strict';
import {
  SUPPORTED_DELIVERY_AREAS,
  SUPPORTED_DELIVERY_MUNICIPALITIES,
  normalizeDeliveryMunicipality,
  normalizeDeliveryBarangay,
} from '../lib/deliveryAreas.js';

assert.deepEqual(SUPPORTED_DELIVERY_MUNICIPALITIES, [
  'Initao',
  'Libertad',
  'Naawan',
  'Gitagum',
]);

assert.equal(normalizeDeliveryMunicipality(' naawan '), 'Naawan');
assert.equal(normalizeDeliveryMunicipality('Manticao'), null);
assert.equal(normalizeDeliveryBarangay('Initao', 'poblacion'), 'Poblacion');
assert.equal(normalizeDeliveryBarangay('Libertad', 'Santo Niño'), 'Santo Niño');
assert.equal(normalizeDeliveryBarangay('Naawan', 'Mat-i'), 'Mat-i');
assert.equal(normalizeDeliveryBarangay('Gitagum', 'Carlos P. Garcia'), 'Carlos P. Garcia');
assert.equal(normalizeDeliveryBarangay('Naawan', 'Aluna'), null);
assert.equal(SUPPORTED_DELIVERY_AREAS.Initao.length, 16);
assert.equal(SUPPORTED_DELIVERY_AREAS.Libertad.length, 9);
assert.equal(SUPPORTED_DELIVERY_AREAS.Naawan.length, 10);
assert.equal(SUPPORTED_DELIVERY_AREAS.Gitagum.length, 11);

console.log('PASS: approved municipalities and municipality/barangay validation.');
