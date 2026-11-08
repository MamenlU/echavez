import { Printer, CheckCircle2 } from 'lucide-react';
import { printPosReceipt, type PosReceipt } from '../utils/posReceipt';

const peso = (n: number) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Same post-sale information and actions for Cashier, Admin and Super Admin. */
export function PosReceiptActions({ receipt, saleId, onNewSale, onRetryReceipt }: {
  receipt: PosReceipt | null;
  saleId: number;
  onNewSale: () => void;
  onRetryReceipt?: () => void;
}) {
  return <section role="status" className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left text-sm text-[#17372D]">
    <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-700" /><strong>POS sale successfully recorded</strong></div>
    <p className="text-xs">Reference: <strong>POS-{String(saleId).padStart(6, '0')}</strong></p>
    {receipt ? <>
      <div className="grid gap-2 sm:grid-cols-2">
        <p>Total: <strong>{peso(receipt.totalAmount)}</strong></p>
        <p>Payment: <strong>{receipt.paymentMethod}</strong></p>
        <p>Operator: <strong>{receipt.operatorName} · {receipt.operatorRole.replace('_', ' ')}</strong></p>
        <p>Shift: <strong>{receipt.shiftId ? `#${receipt.shiftId}` : 'Not assigned'}</strong></p>
        {receipt.customerName && <p>Customer: <strong>{receipt.customerName}</strong></p>}
        {receipt.paymentMethod === 'Cash' ? <>
          <p>Cash received: <strong>{peso(Number(receipt.cashReceived || 0))}</strong></p>
          <p className="sm:col-span-2 text-lg font-extrabold text-emerald-800">Change Due: {peso(Number(receipt.changeAmount || 0))}</p>
        </> : <p className="sm:col-span-2">Card payment reference: <strong>{receipt.cardPaymentReference}</strong></p>}
      </div>
      <button type="button" onClick={() => printPosReceipt(receipt)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900"><Printer className="h-4 w-4"/> Print Receipt</button>
    </> : <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
      The sale was saved, but its recorded receipt could not be loaded. Do not repeat the sale. Reopen it from Sales History.
      {onRetryReceipt && <button type="button" onClick={onRetryReceipt} className="ml-2 underline">Retry receipt</button>}
    </div>}
    <button type="button" onClick={onNewSale} className="ml-2 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100">New Sale</button>
  </section>;
}
