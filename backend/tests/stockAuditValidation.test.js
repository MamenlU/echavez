import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSupplierReference, SUPPLIER_REFERENCE_MAX_LENGTH } from '../lib/stockAudit.js';

test('supplier reference is trimmed and internal whitespace normalized', () => {
  assert.equal(normalizeSupplierReference('  DR-2026   001  ', { required: true }), 'DR-2026 001');
});

test('required supplier reference rejects blank values', () => {
  assert.throws(() => normalizeSupplierReference('   ', { required: true }), /required/i);
});

test('optional supplier reference returns null when blank', () => {
  assert.equal(normalizeSupplierReference('', { required: false }), null);
});

test('supplier reference enforces the 120-character limit', () => {
  assert.equal(SUPPLIER_REFERENCE_MAX_LENGTH, 120);
  assert.throws(() => normalizeSupplierReference('X'.repeat(121), { required: true }), /120/);
});
