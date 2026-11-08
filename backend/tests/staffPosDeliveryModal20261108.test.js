import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('../../project/node_modules/typescript/lib/typescript.js');
const fromProject = path => readFileSync(new URL(`../../project/src/${path}`, import.meta.url), 'utf8');
const pricingSource = fromProject('utils/posDeliveryPricing.ts');
const compiledPricing = ts.transpileModule(pricingSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { getPosDeliverySuggestion } = await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(compiledPricing)}`);
const cashier = fromProject('pages/CashierWorkspace.tsx');
const admin = fromProject('pages/AdminDashboard.tsx');
const deliveryControl = fromProject('components/PosDeliveryFeeField.tsx');
const dialog = fromProject('components/ViewportDetailsDialog.tsx');
const backend = readFileSync(new URL('../routes/sales.js', import.meta.url), 'utf8');
const receipt = readFileSync(new URL('../lib/posReceiptService.js', import.meta.url), 'utf8');
const online = readFileSync(new URL('../routes/orders.js', import.meta.url), 'utf8');

const line = (qty, klass, threshold = null, rule = 'all') => ({ quantity: qty, product: { delivery_class: klass, bulk_quantity_threshold: threshold, fulfillment_rule: rule } });

test('POS uses configured active barangay surcharge and the same light/standard/bulky bases as online delivery', () => {
  for (const [klass, expected] of [['light', 90], ['standard', 180], ['bulky', 330]]) {
    const result = getPosDeliverySuggestion([line(1, klass)], { surcharge: 30 });
    assert.equal(result.suggestedFee, expected);
    assert.equal(result.multiplier, 1);
    assert.ok(online.includes(`${klass}: ${expected - 30}`), `online base fee missing for ${klass}`);
  }
});

test('POS delivery fee uses the highest cart class and bulk quantity threshold', () => {
  const result = getPosDeliverySuggestion([line(2, 'light'), line(5, 'standard', 5)], { surcharge: 125.5 });
  assert.deepEqual(result, { loadClass: 'bulky', multiplier: 1, suggestedFee: 425.5 });
});

test('Delivery-only quantities multiply the base fee and active barangay surcharge', () => {
  const result = getPosDeliverySuggestion([line(3, 'standard', null, 'delivery_only'), line(2, 'light')], { surcharge: 25 });
  assert.deepEqual(result, { loadClass: 'standard', multiplier: 3, suggestedFee: 525 });
  assert.match(online, /deliveryOnlyChargeableQuantity > 0\s*\? deliveryOnlyChargeableQuantity/);
});

test('No active configured rate means no invented suggested fee', () => {
  assert.equal(getPosDeliverySuggestion([line(1, 'standard')], null).suggestedFee, null);
  assert.equal(getPosDeliverySuggestion([line(1, 'standard')], { surcharge: NaN }).suggestedFee, null);
  assert.equal(getPosDeliverySuggestion([line(1, 'standard')], { surcharge: -10 }).suggestedFee, null);
});

test('All POS roles reuse the same suggested-fee control and pricing helper', () => {
  for (const [name, source] of [['Cashier', cashier], ['Admin/Super Admin', admin]]) {
    assert.match(source, /getPosDeliverySuggestion\(/, `${name} pricing helper missing`);
    assert.match(source, /<PosDeliveryFeeField/, `${name} delivery control missing`);
    assert.match(source, /suggestedFee=\{/);
    assert.match(source, /onUseSuggested=\{/);
  }
  assert.match(deliveryControl, /Use Suggested Delivery Fee/);
  assert.match(deliveryControl, /Final Applied Delivery Fee \(editable\)/);
  assert.match(deliveryControl, /does not change the online delivery-rate configuration/);
});

test('Cashier clears stale applied fees when selected municipality or barangay changes', () => {
  assert.match(cashier, /setMunicipality\(e\.target\.value\); setBarangay\(''\); setDeliveryFee\(''\)/);
  assert.match(cashier, /setBarangay\(e\.target\.value\); setDeliveryFee\(''\)/);
});

test('Backend preserves independent POS fee authorization, active area validation and stored applied amount', () => {
  assert.match(backend, /deliveryFee = fulfillment === 'delivery'/);
  assert.match(backend, /!Number\.isFinite\(deliveryFee\) \|\| deliveryFee < 0 \|\| deliveryFee > 10000/);
  assert.match(backend, /FROM delivery_rates[\s\S]*?is_active = 1/);
  assert.match(backend, /totalAmount = Number\(\(productSubtotal \+ pos\.deliveryFee\)/);
  assert.match(backend, /total_amount, delivery_fee, customer_name/);
  assert.match(receipt, /s\.total_amount, s\.delivery_fee/);
  assert.match(receipt, /deliveryFee: Number\(sale\.delivery_fee \|\| 0\)/);
});

test('Sales History and Inventory Movement use one portal-based viewport dialog', () => {
  assert.match(admin, /<ViewportDetailsDialog titleId="sale-detail-title"/);
  assert.match(admin, /<ViewportDetailsDialog titleId="movement-detail-title"/);
  assert.match(admin, /<\/ViewportDetailsDialog>/g);
  assert.match(dialog, /createPortal\(/);
  assert.match(dialog, /document\.body/);
  assert.match(dialog, /z-\[9999\]/);
  assert.match(dialog, /max-h-\[min\(90dvh,90vh\)\]/);
});

test('Staff modal locks background scrolling and handles Escape, Tab, focus restoration and backdrop', () => {
  assert.match(dialog, /document\.body\.style\.overflow = 'hidden'/);
  assert.match(dialog, /document\.body\.style\.overflow = previousOverflow/);
  assert.match(dialog, /event\.key === 'Escape'/);
  assert.match(dialog, /event\.key !== 'Tab'/);
  assert.match(dialog, /previousFocus\?\.focus/);
  assert.match(dialog, /event\.currentTarget === event\.target/);
});

test('Current frozen customer surfaces remain outside the final staff-side update', () => {
  assert.doesNotMatch(admin, /import .*CustomerDashboard/);
  assert.match(cashier, /<PosReceiptActions receipt=\{completedReceipt\}/);
  assert.match(admin, /<PosReceiptActions receipt=\{lastPosReceipt\}/);
});
