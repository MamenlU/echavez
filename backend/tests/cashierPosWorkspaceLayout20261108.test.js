import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cashier = readFileSync(path.join(root, 'project/src/pages/CashierWorkspace.tsx'), 'utf8');
const admin = readFileSync(path.join(root, 'project/src/pages/AdminDashboard.tsx'), 'utf8');
const styles = readFileSync(path.join(root, 'project/src/styles/cashierWorkspaceLayout.css'), 'utf8');

test('desktop Cashier navigation retains seven sections and can collapse without disabling navigation', () => {
  for (const name of ['Overview', 'POS / New Sale', 'Fulfillment Assistance', 'My Cashier Shift', 'My Transactions', 'Returns & Voids', 'My Activity']) {
    assert.ok(cashier.includes(`label: '${name}'`), `Missing navigation: ${name}`);
  }
  assert.match(cashier, /sidebarCollapsed \? 64 : sidebarWidth/);
  assert.match(cashier, /Expand My Workspace navigation/);
  assert.match(cashier, /Collapse My Workspace navigation/);
  assert.match(cashier, /aria-label=\{item\.label\}/);
  assert.match(cashier, /aria-current=\{section === item\.id/);
  assert.match(cashier, /lg:sr-only/);
  assert.match(cashier, /lg:hidden/);
});

test('sidebar width is bounded, persistent and supports pointer and keyboard resizing', () => {
  assert.match(cashier, /rayjin_cashier_sidebar_width/);
  assert.match(cashier, /rayjin_cashier_sidebar_collapsed/);
  assert.match(cashier, /stored >= 200 && stored <= 320/);
  assert.match(cashier, /aria-valuemin=\{200\} aria-valuemax=\{320\} aria-valuenow=\{sidebarWidth\}/);
  assert.match(cashier, /setPointerCapture\(event\.pointerId\)/);
  assert.match(cashier, /releasePointerCapture\(event\.pointerId\)/);
  for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) assert.ok(cashier.includes(key));
});

test('Cashier POS uses available content width and internally bounded product/cart scrolling', () => {
  assert.match(styles, /container: cashier-workspace \/ inline-size/);
  assert.match(styles, /@container cashier-workspace \(min-width: 780px\)/);
  assert.match(styles, /minmax\(0, 1\.15fr\) minmax\(0, 1fr\)/);
  assert.match(styles, /max-height: min\(52dvh, 480px\)/);
  assert.match(styles, /max-height: min\(27dvh, 220px\)/);
  assert.match(cashier, /className="cashier-pos-grid"/);
  assert.match(cashier, /aria-label="Available POS products"/);
  assert.match(cashier, /aria-label="POS cart items"/);
  assert.doesNotMatch(cashier, /lg:sticky lg:top-6/);
});

test('completed Cashier sale replaces the editable checkout and moves receipt into view', () => {
  assert.match(cashier, /completedSaleId !== null \? \(/);
  assert.match(cashier, /ref=\{completedSaleFocusRef\}/);
  assert.match(cashier, /scrollIntoView\(/);
  assert.match(cashier, /<PosReceiptActions receipt=\{completedReceipt\} saleId=\{completedSaleId\}/);
  assert.match(cashier, /onNewSale=\{\(\) => \{/);
  const receiptStart = cashier.indexOf('{completedSaleId !== null ? (');
  const originalForm = cashier.indexOf('{cart.length === 0 &&', receiptStart);
  assert.ok(receiptStart >= 0 && originalForm > receiptStart, 'Receipt panel must precede editable checkout branch');
  assert.match(cashier, /\) : \(\s*<>\s*\{cart.length === 0/);
});

test('Cashier checkout preserves approved customer, fulfillment, payment and receipt controls', () => {
  for (const label of ['Customer name (optional for pickup)', 'Find registered customer (optional)', 'Store pickup / walk-in', 'Deliver Out', 'Cash received', 'Change Due:', 'External card terminal reference (required)', 'Card payment already confirmed', 'Complete POS sale']) {
    // confirmation checkbox includes explanatory sentence, not identical wording
    if (label === 'Card payment already confirmed') assert.match(cashier, /Card payment already confirmed on the external terminal/);
    else assert.ok(cashier.includes(label), `POS function missing: ${label}`);
  }
  assert.match(cashier, /posRequestId: pendingPosRequest\.current\.id/);
  assert.match(cashier, /staffFetch\('\/api\/sales\/pos'/);
  assert.match(cashier, /<PosReceiptActions/);
});

test('Admin and Super Admin POS retains same transaction engine and removes unnecessary product-panel stretch', () => {
  assert.match(admin, /activeTab === 'pos'/);
  assert.match(admin, /lg:grid-cols-12/);
  assert.doesNotMatch(admin, /lg:items-stretch/);
  assert.match(admin, /max-h-\[min\(52dvh,500px\)\]/);
  assert.match(admin, /<PosReceiptActions receipt=\{lastPosReceipt\}/);
  assert.match(admin, /handleCheckoutPOS/);
});
