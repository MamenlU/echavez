/** POS receipts always come from persisted Sale/Sale Item records, never an unsaved cart. */
export interface PosReceipt {
  saleId: number;
  reference: string;
  saleDate: string;
  operatorId: number;
  operatorName: string;
  operatorRole: string;
  shiftId: number | null;
  fulfillment: 'pickup' | 'delivery';
  paymentStatus: string;
  paymentMethod: string;
  cardPaymentReference: string | null;
  cashReceived: number | null;
  changeAmount: number | null;
  totalAmount: number;
  deliveryFee: number;
  customerName: string | null;
  contactPerson: string | null;
  contactNumber: string | null;
  municipality: string | null;
  barangay: string | null;
  address: string | null;
  landmark: string | null;
  adjustmentState: 'Completed' | 'Adjusted' | 'Voided';
  items: { productId: number; name: string; quantity: number; unitPrice: number; subtotal: number }[];
}

const peso = (value: number) => `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const row = (label: string, value: unknown) => `<div class="row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;

export function renderPosReceipt(receipt: PosReceipt, popup: Window) {
  const items = receipt.items.map(item => `<tr><td>${escapeHtml(item.name)}</td><td>${item.quantity}</td><td>${escapeHtml(peso(item.unitPrice))}</td><td>${escapeHtml(peso(item.subtotal))}</td></tr>`).join('');
  const showDelivery = receipt.fulfillment === 'delivery';
  // Escape every database string before inserting into the browser print document.
  popup.document.open();
  popup.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>Rayjin POS Receipt ${escapeHtml(receipt.reference)}</title>
<style>body{font-family:Arial,sans-serif;max-width:760px;margin:28px auto;padding:12px;color:#1d3329;font-size:13px}
header{text-align:center;border-bottom:2px solid #153b2b;padding-bottom:14px}h1{margin:0;font-size:22px}h2{font-size:14px;margin:16px 0 8px}
.row{display:flex;justify-content:space-between;gap:18px;margin:7px 0}.row strong{text-align:right}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px 4px;border-bottom:1px solid #ddd}th:nth-child(n+2),td:nth-child(n+2){text-align:right}
.total{font-size:17px;border-top:2px solid #153b2b;padding-top:8px}.muted{color:#64756a;font-size:11px}.notice{background:#fff0dd;padding:10px;border:1px solid #dcad75}
@media print{body{margin:0;padding:5mm;max-width:none}@page{margin:10mm}.no-print{display:none}}</style></head><body>
<header><h1>RAYJIN HARDWARE</h1><p>Initao, Misamis Oriental · 0935 315 0849</p><strong>POS SALES RECEIPT</strong><p>${escapeHtml(receipt.reference)} · ${escapeHtml(new Date(receipt.saleDate).toLocaleString('en-PH'))}</p></header>
${receipt.adjustmentState !== 'Completed' ? `<p class="notice">Original sale status: ${escapeHtml(receipt.adjustmentState)}. Refunds/voids are recorded separately; this is not a new sale.</p>` : ''}
<h2>Transaction</h2>${row('Operator', `${receipt.operatorName || `Staff #${receipt.operatorId}`} (${receipt.operatorRole})`)}${row('Cashier Shift', receipt.shiftId ? `#${receipt.shiftId}` : 'Not assigned')}
${row('Customer', receipt.customerName || 'Walk-in')}${row('Fulfillment', showDelivery ? 'Deliver Out' : 'Store Pickup / Walk-in')}
${showDelivery ? `${row('Contact person', receipt.contactPerson || '—')}${row('Contact number', receipt.contactNumber || '—')}${row('Delivery area', [receipt.barangay, receipt.municipality].filter(Boolean).join(', '))}${row('Address', receipt.address || '—')}${receipt.landmark ? row('Landmark', receipt.landmark) : ''}` : ''}
<h2>Items</h2><table><thead><tr><th>Product</th><th>Qty</th><th>Unit</th><th>Amount</th></tr></thead><tbody>${items}</tbody></table>
${row('Merchandise subtotal', peso(receipt.totalAmount - receipt.deliveryFee))}${showDelivery ? row('Delivery fee', peso(receipt.deliveryFee)) : ''}<div class="total">${row('TOTAL', peso(receipt.totalAmount))}</div>
${row('Payment method', receipt.paymentMethod === 'Card' ? 'Card (externally confirmed)' : receipt.paymentMethod)}
${receipt.paymentMethod === 'Cash' ? `${row('Cash received', peso(Number(receipt.cashReceived || 0)))}${row('CHANGE DUE', peso(Number(receipt.changeAmount || 0)))}` : row('Card terminal reference', receipt.cardPaymentReference || 'Not recorded')}
<p class="muted">This is a POS sales record generated from saved transaction data, not an independently verified tax invoice. Retain the external card terminal slip for card transactions.</p>
<p class="no-print"><button id="print-pos-receipt" type="button">Print</button></p></body></html>`);
  popup.document.close();
  popup.document.getElementById('print-pos-receipt')?.addEventListener('click', () => popup.print());
  popup.focus();
  setTimeout(() => popup.print(), 200);
}

export function printPosReceipt(receipt: PosReceipt) {
  const popup = window.open('', '_blank', 'width=820,height=820');
  if (!popup) { window.alert('Please allow pop-ups to print the POS receipt.'); return; }
  popup.opener = null;
  renderPosReceipt(receipt, popup);
}

export async function reprintPosReceipt(saleId: number, token: string) {
  // Open synchronously on the button click to avoid popup blockers after async fetch.
  const popup = window.open('', '_blank', 'width=820,height=820');
  if (!popup) { window.alert('Please allow pop-ups to reprint the POS receipt.'); return; }
  popup.opener = null;
  popup.document.write('<p style="font-family:Arial;padding:20px">Loading recorded POS receipt…</p>');
  try {
    const response = await fetch(`/api/sales/pos/${saleId}/receipt`, { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json();
    if (!response.ok || !result.receipt) throw new Error(result.error || 'Receipt not found.');
    renderPosReceipt(result.receipt as PosReceipt, popup);
  } catch (err) {
    popup.document.open();
    popup.document.write(`<p style="font-family:Arial;padding:20px;color:#a22">${escapeHtml(err instanceof Error ? err.message : 'Unable to load receipt.')}</p>`);
    popup.document.close();
  }
}
