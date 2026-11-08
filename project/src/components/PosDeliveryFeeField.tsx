import { type PosDeliveryClass } from '../utils/posDeliveryPricing';

interface PosDeliveryFeeFieldProps {
  value: string;
  onChange: (value: string) => void;
  onUseSuggested: (value: string) => void;
  suggestedFee: number | null;
  loadClass: PosDeliveryClass;
  multiplier: number;
}

/** Shared Cashier / Admin / Super Admin POS pricing control, not an online rate editor. */
export function PosDeliveryFeeField({
  value, onChange, onUseSuggested, suggestedFee, loadClass, multiplier,
}: PosDeliveryFeeFieldProps) {
  return <div className="space-y-2 rounded-xl border border-[#B9D8C7] bg-[#F6FAF7] p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="text-xs font-semibold text-[#17372D]">Configured Suggested Delivery Fee</p>
        <p className="text-[11px] text-[#52645D]" aria-live="polite">
          {suggestedFee === null ? 'Select an active municipality and barangay to view the suggested rate.'
            : <>₱{suggestedFee.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · {loadClass} load{multiplier > 1 ? ` × ${multiplier} Delivery-only units` : ''}</>}
        </p>
      </div>
      <button type="button" disabled={suggestedFee === null}
        onClick={() => { if (suggestedFee !== null) onUseSuggested(suggestedFee.toFixed(2)); }}
        className="rounded-lg border border-[#B9D8C7] bg-white px-3 py-2 text-xs font-bold text-[#0D7740] hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50">
        Use Suggested Delivery Fee
      </button>
    </div>
    <label className="block text-xs font-semibold text-[#17372D]">
      Final Applied Delivery Fee (editable)
      <input type="number" inputMode="decimal" min="0" max="10000" step="0.01" required
        className="mt-1 w-full rounded-lg border border-[#DDE6E0] bg-white px-3 py-2 text-sm"
        value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
    <p className="text-[11px] text-[#52645D]">The final amount is saved with this POS sale. Editing it does not change the online delivery-rate configuration.</p>
  </div>;
}
