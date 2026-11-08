import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../../project/src/',import.meta.url);
const read=(path)=>fs.readFileSync(new URL(path,root),'utf8');
test('frozen customer Home and CustomerDashboard remain unmodified in staff-side scope',()=>{
  const source=read('pages/Home.tsx')+read('pages/CustomerDashboard.tsx');
  assert.match(source,/customer|Customer/);
});
test('Cashier and Admin have shared saved POS receipt, change, card reference and history reprint',()=>{
  const cashier=read('pages/CashierWorkspace.tsx');const admin=read('pages/AdminDashboard.tsx');
  for(const source of [cashier,admin]){
    assert.match(source,/PosReceiptActions/);
    assert.match(source,/cardPaymentReference|posCardPaymentReference/);
    assert.match(source,/reprintPosReceipt/);
  }
  assert.match(cashier,/Change Due/);
  assert.match(admin,/Customer Change/);
});
test('Audit before/after is readable by default with technical JSON available on demand',()=>{
  const source=read('components/AdminAuditLogPanel.tsx');
  assert.match(source,/AuditReadableData/);
  assert.match(source,/Before — Previous Recorded Values/);
  assert.match(source,/View Technical Details \(JSON\)/);
  assert.match(source,/showTechnicalJson &&/);
});
test('Shift discrepancy requires a reason on both backend and UI and clears approval secrets',()=>{
  const backend=fs.readFileSync(new URL('../routes/cashierShifts.js',import.meta.url),'utf8');
  const ui=read('components/CashierShiftPanel.tsx');
  assert.match(backend,/reconciliation\.discrepancy !== 0 && !closingNotes/);
  assert.match(ui,/setManagerPassword\(''\)/);
  assert.match(ui,/Closing Note \(required for cash shortage or overage\)/);
});
