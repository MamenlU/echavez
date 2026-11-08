import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Undo2,
  X,
} from 'lucide-react';
import { approvalDescription, staffIdentity } from '../utils/staffIdentity';

type AdjustmentMode = 'Return' | 'Void';

type SalesHistoryRow = {
  sale_id: number;
  reference: string;
  sales_source: 'Online Order' | 'Onsite POS';
  source_label: string;
  sale_date: string;
  payment_method: string;
  original_total_revenue?: number;
  total_revenue: number;
  total_refunds?: number;
  adjustment_state?: 'Completed' | 'Adjusted' | 'Voided';
};

type EligibilityItem = {
  sale_item_id: number;
  product_id: number;
  product_name: string;
  sold_quantity: number;
  returned_quantity: number;
  remaining_quantity: number;
  unit_price: number;
  gross_subtotal: number;
  original_refundable_amount: number;
  prior_refund_subtotal: number;
  remaining_refundable_amount: number;
  unit_refund_estimate: number;
  original_unit_cost: number | null;
};

type Eligibility = {
  sale_id: number;
  order_id: string | null;
  reference: string;
  sales_source: 'Online Order' | 'Onsite POS';
  fulfillment: string | null;
  sale_date: string;
  customer_name: string | null;
  payment_status: string;
  payment_method: string;
  original_total_amount: number;
  original_gross_merchandise: number;
  original_discount: number;
  original_net_merchandise: number;
  original_service_fee: number;
  original_delivery_fee: number;
  merchandise_refunded: number;
  service_fee_refunded: number;
  delivery_fee_refunded: number;
  total_refunded: number;
  remaining_merchandise_refundable: number;
  remaining_service_fee: number;
  remaining_delivery_fee: number;
  remaining_total_refundable: number;
  adjustment_count: number;
  void_count: number;
  can_void: boolean;
  external_refund_required: boolean;
  items: EligibilityItem[];
};

type ReturnLineState = {
  selected: boolean;
  quantity: number;
  restockable: boolean;
};

type AdjustmentHistoryRow = {
  adjustment_id: number;
  adjustment_reference: string;
  sale_id: number;
  sale_reference: string;
  adjustment_type: 'Return' | 'Void';
  reason: string;
  merchandise_refund_amount: number;
  service_fee_refund_amount: number;
  delivery_fee_refund_amount: number;
  total_refund_amount: number;
  refund_method: string;
  refund_reference: string | null;
  external_refund_confirmed: number | boolean;
  processed_at: string;
  processed_by: string | null;
  processed_by_username: string;
  processed_by_admin_id?: number;
  processed_by_role?: string | null;
  shift_id?: number | null;
  approval?: {status?: string | null; id?: number | null; name?: string | null; role?: string | null} | null;
  total_quantity: number;
  restocked_quantity: number;
  non_restocked_quantity: number;
  items_summary: string;
};

type AdjustmentDetail = {
  adjustment: AdjustmentHistoryRow & {
    sales_source: string;
    sale_date: string;
  };
  items: Array<{
    adjustment_item_id: number;
    sale_item_id: number;
    product_id: number;
    product_name: string;
    quantity: number;
    unit_refund_amount: number;
    refund_subtotal: number;
    unit_cost: number;
    restockable: number | boolean;
    restock_movement_id: number | null;
  }>;
};

interface SalesAdjustmentPanelProps {
  onChanged?: () => void | Promise<void>;
  cashierMode?: boolean;
}

const formatPeso = (value: number | string | null | undefined) =>
  `₱${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const createRequestId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sale-adjust-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const requiresExternalConfirmation = (method: string) =>
  method.trim().toLowerCase() !== 'cash';

export function SalesAdjustmentPanel({ onChanged, cashierMode = false }: SalesAdjustmentPanelProps) {
  const [sales, setSales] = useState<SalesHistoryRow[]>([]);
  const [adjustments, setAdjustments] = useState<AdjustmentHistoryRow[]>([]);
  const [search, setSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [mode, setMode] = useState<AdjustmentMode>('Return');
  const [returnLines, setReturnLines] = useState<Record<number, ReturnLineState>>({});
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('Cash');
  const [refundReference, setRefundReference] = useState('');
  const [externalRefundConfirmed, setExternalRefundConfirmed] = useState(false);
  const [serviceFeeRefundAmount, setServiceFeeRefundAmount] = useState('0');
  const [deliveryFeeRefundAmount, setDeliveryFeeRefundAmount] = useState('0');
  const [requestId, setRequestId] = useState(createRequestId());
  const [loading, setLoading] = useState(true);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [detail, setDetail] = useState<AdjustmentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [managerUsername, setManagerUsername] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const needsApproval = true; // every adjustment requires scoped step-up verification

  const token = () => localStorage.getItem('token');

  const handleSessionExpired = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.assign('/login');
  };

  const authorizedFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const authToken = token();
    if (!authToken) {
      handleSessionExpired();
      throw new Error('Admin session expired.');
    }
    const response = await fetch(input, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${authToken}`,
      },
    });
    if (response.status === 401) {
      handleSessionExpired();
      throw new Error('Admin session expired.');
    }
    return response;
  };

  const loadBaseData = async () => {
    setLoading(true);
    setError('');
    try {
      const [salesResponse, adjustmentResponse] = await Promise.all([
        authorizedFetch(cashierMode ? '/api/sales/my-pos' : '/api/sales/history'),
        authorizedFetch('/api/sale-adjustments?limit=200'),
      ]);
      const salesData = await salesResponse.json().catch(() => ({}));
      const adjustmentData = await adjustmentResponse.json().catch(() => ({}));
      if (!salesResponse.ok) throw new Error(salesData.error || 'Unable to load completed sales.');
      if (!adjustmentResponse.ok) throw new Error(adjustmentData.error || 'Unable to load sale adjustments.');
      setSales(Array.isArray(salesData.sales) ? salesData.sales : []);
      setAdjustments(Array.isArray(adjustmentData.adjustments) ? adjustmentData.adjustments : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load returns/refunds module.');
    } finally {
      setLoading(false);
    }
  };

  const loadEligibility = async (saleId: number) => {
    setEligibilityLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await authorizedFetch(`/api/sale-adjustments/sales/${saleId}/eligibility`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to load sale details.');
      const snapshot = data as Eligibility;
      setEligibility(snapshot);
      setMode('Return');
      setReason('');
      setRefundMethod(snapshot.payment_method || 'Cash');
      setRefundReference('');
      setExternalRefundConfirmed(false);
      setServiceFeeRefundAmount('0');
      setDeliveryFeeRefundAmount('0');
      setRequestId(createRequestId());
      setReturnLines(
        Object.fromEntries(
          snapshot.items.map((item) => [
            item.sale_item_id,
            {
              selected: false,
              quantity: Math.min(1, item.remaining_quantity),
              restockable: true,
            },
          ])
        )
      );
    } catch (loadError) {
      setEligibility(null);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load sale details.');
    } finally {
      setEligibilityLoading(false);
    }
  };

  useEffect(() => {
    void loadBaseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSales = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sales.filter((sale) => {
      if (!query) return true;
      return [
        sale.reference,
        sale.sales_source,
        sale.source_label,
        sale.payment_method,
        sale.adjustment_state,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [sales, search]);

  const filteredAdjustments = useMemo(() => {
    const query = historySearch.trim().toLowerCase();
    if (!query) return adjustments;
    return adjustments.filter((adjustment) =>
      [
        adjustment.adjustment_reference,
        adjustment.sale_reference,
        adjustment.adjustment_type,
        adjustment.reason,
        adjustment.refund_method,
        adjustment.refund_reference,
        adjustment.processed_by,
        adjustment.processed_by_username,
        adjustment.items_summary,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [adjustments, historySearch]);

  const selectedReturnItems = eligibility
    ? eligibility.items.filter((item) => returnLines[item.sale_item_id]?.selected)
    : [];

  const estimatedMerchandiseRefund = selectedReturnItems.reduce((sum, item) => {
    const state = returnLines[item.sale_item_id];
    const quantity = Math.max(0, Math.min(Number(state?.quantity || 0), item.remaining_quantity));
    if (quantity === item.remaining_quantity) return sum + item.remaining_refundable_amount;
    return sum + Math.min(item.remaining_refundable_amount, item.unit_refund_estimate * quantity);
  }, 0);

  const estimatedReturnTotal =
    estimatedMerchandiseRefund + Number(serviceFeeRefundAmount || 0) + Number(deliveryFeeRefundAmount || 0);

  const resetAfterSuccess = async (saleId: number) => {
    await Promise.all([loadBaseData(), loadEligibility(saleId), Promise.resolve(onChanged?.())]);
  };

  const submitReturn = async () => {
    if (!eligibility) return;
    const items = selectedReturnItems.map((item) => ({
      saleItemId: item.sale_item_id,
      quantity: Number(returnLines[item.sale_item_id]?.quantity || 0),
      restockable: returnLines[item.sale_item_id]?.restockable !== false,
    }));
    if (!items.length) {
      setError('Select at least one product to return.');
      return;
    }
    if (reason.trim().length < 5) {
      setError('Enter a clear return/refund reason of at least 5 characters.');
      return;
    }

    if (needsApproval && (!managerUsername.trim() || !managerPassword)) {
      setError('Manager username and password are required for returns/refunds.'); return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const response = await authorizedFetch('/api/sale-adjustments/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: eligibility.sale_id,
          adjustmentRequestId: requestId,
          reason: reason.trim(),
          refundMethod,
          refundReference: refundReference.trim(),
          externalRefundConfirmed,
          serviceFeeRefundAmount: Number(serviceFeeRefundAmount || 0),
          deliveryFeeRefundAmount: Number(deliveryFeeRefundAmount || 0),
          items,
          ...(needsApproval ? { managerUsername: managerUsername.trim(), managerPassword } : {}),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to record return/refund.');
      const successMessage = `${data.adjustmentReference || 'Return'} recorded successfully. Refund: ${formatPeso(data.totalRefundAmount)}.`;
      setRequestId(createRequestId());
      setManagerPassword('');
      await resetAfterSuccess(eligibility.sale_id);
      setSuccess(successMessage);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to record return/refund.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitVoid = async () => {
    if (!eligibility) return;
    if (!eligibility.can_void) {
      setError('This sale is not eligible for a full POS void.');
      return;
    }
    if (reason.trim().length < 5) {
      setError('Enter a clear void reason of at least 5 characters.');
      return;
    }

    if (needsApproval && (!managerUsername.trim() || !managerPassword)) {
      setError('Manager username and password are required for voiding a sale.'); return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const response = await authorizedFetch('/api/sale-adjustments/voids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: eligibility.sale_id,
          adjustmentRequestId: requestId,
          reason: reason.trim(),
          refundMethod,
          refundReference: refundReference.trim(),
          externalRefundConfirmed,
          ...(needsApproval ? { managerUsername: managerUsername.trim(), managerPassword } : {}),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to void POS sale.');
      const successMessage = `${data.adjustmentReference || 'Void'} recorded successfully. Refund: ${formatPeso(data.totalRefundAmount)}.`;
      setRequestId(createRequestId());
      setManagerPassword('');
      await resetAfterSuccess(eligibility.sale_id);
      setSuccess(successMessage);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to void POS sale.');
    } finally {
      setSubmitting(false);
    }
  };

  const loadAdjustmentDetail = async (adjustmentId: number) => {
    setDetailLoading(true);
    setError('');
    try {
      const response = await authorizedFetch(`/api/sale-adjustments/${adjustmentId}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to load adjustment details.');
      setDetail(data as AdjustmentDetail);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load adjustment details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const externalRequired = requiresExternalConfirmation(refundMethod);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2F7D5A]">
            Sales Control
          </p>
          <h2 className="mt-1 text-2xl font-bold font-display text-steel-950">
            Returns, Refunds &amp; Sales Voids
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-steel-500">
            Record post-sale corrections without deleting the original sale. Restockable items return to inventory using the original sale cost.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadBaseData()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#CFE0D7] bg-white px-4 py-2.5 text-xs font-bold text-[#0D7740] transition hover:bg-[#EEF8F2] disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-bold">Phase 4 safety rule</p>
          <p className="mt-1 leading-5">
            Rayjin Hardware does not automatically issue PayMongo or external card/GCash refunds. Complete the refund through the proper external channel first, then record the verified reference here. Cash refunds require an open Cashier Shift so the physical drawer remains reconcilable. Existing PayMongo verification and completed-order status are left unchanged.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-2xl border border-[#DDE6E0] bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-[#17372D]">1. Select a completed sale</h3>
            <p className="mt-1 text-xs text-steel-500">Search by POS/order reference, payment method, source, or adjustment state.</p>
          </div>

          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search completed sales..."
              className="w-full rounded-xl border border-steel-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#2F7D5A] focus:ring-2 focus:ring-[#2F7D5A]/15"
            />
          </label>

          <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {loading ? (
              <div className="flex min-h-32 items-center justify-center gap-2 text-xs text-steel-500">
                <RefreshCw className="h-4 w-4 animate-spin" /> Loading sales…
              </div>
            ) : filteredSales.length === 0 ? (
              <p className="py-8 text-center text-xs text-steel-500">No matching completed sales.</p>
            ) : (
              filteredSales.map((sale) => {
                const active = selectedSaleId === sale.sale_id;
                return (
                  <button
                    type="button"
                    key={sale.sale_id}
                    onClick={() => {
                      setSelectedSaleId(sale.sale_id);
                      void loadEligibility(sale.sale_id);
                    }}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      active
                        ? 'border-[#2F7D5A] bg-[#EEF8F2] ring-2 ring-[#2F7D5A]/10'
                        : 'border-steel-200 bg-white hover:border-[#BFD3C7] hover:bg-[#FAFCFA]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-steel-900">{sale.reference}</p>
                        <p className="mt-1 text-[10px] text-steel-500">
                          {sale.source_label} · {formatDateTime(sale.sale_date)}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${
                        sale.adjustment_state === 'Voided'
                          ? 'bg-red-50 text-red-700'
                          : sale.adjustment_state === 'Adjusted'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {sale.adjustment_state || 'Completed'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-steel-500">
                      <span>{sale.payment_method || 'Cash'}</span>
                      <span>{formatPeso(sale.total_revenue)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[#DDE6E0] bg-white p-4 shadow-sm">
          {!selectedSaleId ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center text-steel-500">
              <Undo2 className="h-9 w-9 text-steel-300" />
              <p className="mt-3 text-sm font-semibold text-steel-700">Choose a completed sale</p>
              <p className="mt-1 max-w-sm text-xs">Rayjin will check the quantities and refund amounts that remain eligible before allowing any adjustment.</p>
            </div>
          ) : eligibilityLoading ? (
            <div className="flex min-h-[420px] items-center justify-center gap-2 text-sm text-steel-500">
              <RefreshCw className="h-4 w-4 animate-spin" /> Checking sale eligibility…
            </div>
          ) : eligibility ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 border-b border-steel-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#2F7D5A]">Selected Sale</p>
                  <h3 className="mt-1 text-lg font-bold text-steel-950">{eligibility.reference}</h3>
                  <p className="mt-1 text-xs text-steel-500">
                    {eligibility.sales_source} · {eligibility.payment_method} · {formatDateTime(eligibility.sale_date)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('Return')}
                    className={`rounded-xl px-3 py-2 text-xs font-bold ${mode === 'Return' ? 'bg-[#2F7D5A] text-white' : 'border border-steel-200 bg-white text-steel-600'}`}
                  >
                    Return / Refund
                  </button>
                  <button
                    type="button"
                    disabled={!eligibility.can_void}
                    onClick={() => setMode('Void')}
                    title={eligibility.can_void ? 'Void the entire original POS sale' : 'Full void is limited to an unadjusted Onsite POS sale'}
                    className={`rounded-xl px-3 py-2 text-xs font-bold ${mode === 'Void' ? 'bg-red-600 text-white' : 'border border-red-200 bg-white text-red-700'} disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    Full POS Void
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ['Original Total', eligibility.original_total_amount],
                  ['Already Refunded', eligibility.total_refunded],
                  ['Merchandise Left', eligibility.remaining_merchandise_refundable],
                  ['Total Left', eligibility.remaining_total_refundable],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl border border-steel-100 bg-[#F8FAF8] p-3">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-steel-400">{label}</p>
                    <p className="mt-1 text-sm font-bold text-[#17372D]">{formatPeso(Number(value))}</p>
                  </div>
                ))}
              </div>

              {mode === 'Return' ? (
                <div>
                  <div className="mb-2 flex items-end justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-steel-800">2. Select returned products</h4>
                      <p className="mt-1 text-[10px] text-steel-500">Restock only items physically returned in sellable condition.</p>
                    </div>
                    <p className="text-[10px] text-steel-500">Estimated merchandise refund: <strong className="text-steel-800">{formatPeso(estimatedMerchandiseRefund)}</strong></p>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-steel-200">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-[#F4F8F5] text-[9px] uppercase tracking-wider text-steel-500">
                        <tr>
                          <th className="px-3 py-2">Return</th>
                          <th className="px-3 py-2">Product</th>
                          <th className="px-3 py-2">Sold</th>
                          <th className="px-3 py-2">Prior</th>
                          <th className="px-3 py-2">Eligible</th>
                          <th className="px-3 py-2">Qty</th>
                          <th className="px-3 py-2">Restock</th>
                          <th className="px-3 py-2">Refundable</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-steel-100">
                        {eligibility.items.map((item) => {
                          const state = returnLines[item.sale_item_id];
                          const disabled = item.remaining_quantity <= 0;
                          return (
                            <tr key={item.sale_item_id} className={disabled ? 'bg-steel-50/60 text-steel-400' : ''}>
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  disabled={disabled}
                                  checked={Boolean(state?.selected)}
                                  onChange={(event) => setReturnLines((current) => ({
                                    ...current,
                                    [item.sale_item_id]: {
                                      ...(current[item.sale_item_id] || { quantity: 1, restockable: true }),
                                      selected: event.target.checked,
                                    },
                                  }))}
                                />
                              </td>
                              <td className="min-w-[180px] px-3 py-2 font-semibold text-steel-800">{item.product_name}</td>
                              <td className="px-3 py-2">{item.sold_quantity}</td>
                              <td className="px-3 py-2">{item.returned_quantity}</td>
                              <td className="px-3 py-2 font-bold">{item.remaining_quantity}</td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min={1}
                                  max={item.remaining_quantity}
                                  disabled={disabled || !state?.selected}
                                  value={state?.quantity || 1}
                                  onChange={(event) => setReturnLines((current) => ({
                                    ...current,
                                    [item.sale_item_id]: {
                                      ...(current[item.sale_item_id] || { selected: true, restockable: true }),
                                      quantity: Math.max(1, Math.min(item.remaining_quantity, Number(event.target.value) || 1)),
                                    },
                                  }))}
                                  className="w-16 rounded-lg border border-steel-200 px-2 py-1.5 text-xs disabled:bg-steel-50"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <label className="inline-flex items-center gap-1 text-[10px]">
                                  <input
                                    type="checkbox"
                                    disabled={disabled || !state?.selected}
                                    checked={state?.restockable !== false}
                                    onChange={(event) => setReturnLines((current) => ({
                                      ...current,
                                      [item.sale_item_id]: {
                                        ...(current[item.sale_item_id] || { selected: true, quantity: 1 }),
                                        restockable: event.target.checked,
                                      },
                                    }))}
                                  />
                                  Yes
                                </label>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">{formatPeso(item.remaining_refundable_amount)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-steel-700">
                      Shop &amp; Go service-fee refund
                      <input
                        type="number"
                        min={0}
                        max={eligibility.remaining_service_fee}
                        step="0.01"
                        value={serviceFeeRefundAmount}
                        disabled={eligibility.remaining_service_fee <= 0}
                        onChange={(event) => setServiceFeeRefundAmount(event.target.value)}
                        className="mt-1 w-full rounded-xl border border-steel-200 px-3 py-2.5 text-xs disabled:bg-steel-50"
                      />
                      <span className="mt-1 block text-[9px] font-normal text-steel-400">Available: {formatPeso(eligibility.remaining_service_fee)}</span>
                    </label>
                    <label className="text-xs font-semibold text-steel-700">
                      Delivery-fee refund
                      <input
                        type="number"
                        min={0}
                        max={eligibility.remaining_delivery_fee}
                        step="0.01"
                        value={deliveryFeeRefundAmount}
                        disabled={eligibility.remaining_delivery_fee <= 0}
                        onChange={(event) => setDeliveryFeeRefundAmount(event.target.value)}
                        className="mt-1 w-full rounded-xl border border-steel-200 px-3 py-2.5 text-xs disabled:bg-steel-50"
                      />
                      <span className="mt-1 block text-[9px] font-normal text-steel-400">Available: {formatPeso(eligibility.remaining_delivery_fee)}</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
                  <p className="font-bold">Full POS Void</p>
                  <p className="mt-1 leading-5">
                    This reverses the entire unadjusted Onsite POS sale, records the full refund, and restores every sold product to inventory at its original sale cost. The original sale record is preserved for accountability.
                  </p>
                  <p className="mt-2 font-bold">Expected refund: {formatPeso(eligibility.remaining_total_refundable)}</p>
                </div>
              )}

              <div className="grid gap-3 border-t border-steel-100 pt-4 sm:grid-cols-2">
                {needsApproval && <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <p className="text-xs font-bold text-amber-900">{cashierMode ? 'Admin/Super Admin' : 'Super Admin'} verification required before this adjustment</p>
                  <input aria-label="Manager username for adjustment" placeholder="Manager username or email"
                    autoComplete="off" value={managerUsername} onChange={e => setManagerUsername(e.target.value)}
                    className="w-full rounded-lg border p-2 text-sm" />
                  <input aria-label="Manager password for adjustment" placeholder="Manager password"
                    type="password" autoComplete="off" value={managerPassword}
                    onChange={e => setManagerPassword(e.target.value)} className="w-full rounded-lg border p-2 text-sm" />
                </div>}
                <label className="text-xs font-semibold text-steel-700 sm:col-span-2">
                  3. Reason / business justification
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={500}
                    rows={2}
                    placeholder="Example: Customer returned unopened item; verified receipt and product condition."
                    className="mt-1 w-full rounded-xl border border-steel-200 px-3 py-2.5 text-xs outline-none focus:border-[#2F7D5A]"
                  />
                </label>

                <label className="text-xs font-semibold text-steel-700">
                  Refund method
                  <select
                    value={refundMethod}
                    onChange={(event) => {
                      setRefundMethod(event.target.value);
                      setExternalRefundConfirmed(false);
                    }}
                    className="mt-1 w-full rounded-xl border border-steel-200 bg-white px-3 py-2.5 text-xs"
                  >
                    {['Cash', 'Card', 'GCash', 'PayMongo', 'Other'].map((method) => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-semibold text-steel-700">
                  External refund/reference number {externalRequired ? '(required)' : '(optional)'}
                  <input
                    type="text"
                    value={refundReference}
                    onChange={(event) => setRefundReference(event.target.value)}
                    maxLength={150}
                    placeholder={externalRequired ? 'Enter verified external reference' : 'Optional cash refund note/reference'}
                    className="mt-1 w-full rounded-xl border border-steel-200 px-3 py-2.5 text-xs"
                  />
                </label>

                {externalRequired && (
                  <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-[10px] font-semibold text-amber-900 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={externalRefundConfirmed}
                      onChange={(event) => setExternalRefundConfirmed(event.target.checked)}
                      className="mt-0.5"
                    />
                    <span>I confirm that the refund was already completed/verified through the external payment channel. Rayjin Hardware is recording the result only.</span>
                  </label>
                )}
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-[#DDE6E0] bg-[#F8FAF8] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-steel-400">Expected recorded refund</p>
                  <p className="text-lg font-bold text-[#17372D]">
                    {mode === 'Void' ? formatPeso(eligibility.remaining_total_refundable) : formatPeso(estimatedReturnTotal)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={submitting || (externalRequired && !externalRefundConfirmed)}
                  onClick={() => void (mode === 'Void' ? submitVoid() : submitReturn())}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${mode === 'Void' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#2F7D5A] hover:bg-[#256548]'}`}
                >
                  {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : mode === 'Void' ? <RotateCcw className="h-4 w-4" /> : <Undo2 className="h-4 w-4" />}
                  {submitting ? 'Processing…' : mode === 'Void' ? 'Record Full POS Void' : 'Record Return / Refund'}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#DDE6E0] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-steel-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#17372D]">Adjustment History</h3>
            <p className="mt-1 text-[11px] text-steel-500">Returns/refunds and POS voids are preserved as separate transactions.</p>
          </div>
          <label className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
            <input
              type="search"
              value={historySearch}
              onChange={(event) => setHistorySearch(event.target.value)}
              placeholder="Search adjustment history..."
              className="w-full rounded-xl border border-steel-200 py-2.5 pl-9 pr-3 text-xs"
            />
          </label>
        </div>

        {filteredAdjustments.length === 0 ? (
          <div className="py-12 text-center text-xs text-steel-500">No return/refund/void records yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[#F4F8F5] text-[9px] uppercase tracking-wider text-steel-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Adjustment</th>
                  <th className="px-4 py-3">Original Sale</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Refund</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Processed By</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-100">
                {filteredAdjustments.map((adjustment) => (
                  <tr key={adjustment.adjustment_id} className="hover:bg-[#FAFCFA]">
                    <td className="whitespace-nowrap px-4 py-3 text-steel-500">{formatDateTime(adjustment.processed_at)}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-steel-900">{adjustment.adjustment_reference}</p>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${adjustment.adjustment_type === 'Void' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                        {adjustment.adjustment_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-steel-700">{adjustment.sale_reference}</td>
                    <td className="min-w-[220px] px-4 py-3 text-steel-600">{adjustment.items_summary}</td>
                    <td className="px-4 py-3 font-bold text-red-700">{formatPeso(adjustment.total_refund_amount)}</td>
                    <td className="px-4 py-3 text-steel-600">{adjustment.refund_method}</td>
                    <td className="px-4 py-3 text-steel-600">{staffIdentity(adjustment.processed_by || adjustment.processed_by_username, adjustment.processed_by_role, adjustment.processed_by_admin_id)}<p className="mt-1 text-[10px] text-slate-500">Approval: {approvalDescription(adjustment.approval)}</p></td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={detailLoading}
                        onClick={() => void loadAdjustmentDetail(adjustment.adjustment_id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-steel-200 px-2.5 py-1.5 text-[10px] font-bold text-[#2F7D5A] hover:bg-[#EEF8F2]"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detail && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-start justify-between border-b border-steel-100 bg-white px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#2F7D5A]">{detail.adjustment.adjustment_reference}</p>
                <h3 className="mt-1 text-lg font-bold text-steel-950">{detail.adjustment.adjustment_type} for {detail.adjustment.sale_reference}</h3>
                <p className="mt-1 text-xs text-steel-500">{formatDateTime(detail.adjustment.processed_at)}</p>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="rounded-lg p-2 text-steel-500 hover:bg-steel-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-steel-50 p-3"><p className="text-[9px] uppercase text-steel-400">Refund</p><p className="mt-1 font-bold">{formatPeso(detail.adjustment.total_refund_amount)}</p></div>
                <div className="rounded-xl bg-steel-50 p-3"><p className="text-[9px] uppercase text-steel-400">Method</p><p className="mt-1 font-bold">{detail.adjustment.refund_method}</p></div>
                <div className="rounded-xl bg-steel-50 p-3"><p className="text-[9px] uppercase text-steel-400">Reference</p><p className="mt-1 break-all font-bold">{detail.adjustment.refund_reference || '—'}</p></div>
                <div className="rounded-xl bg-steel-50 p-3"><p className="text-[9px] uppercase text-steel-400">Processed By</p><p className="mt-1 font-bold">{staffIdentity(detail.adjustment.processed_by || detail.adjustment.processed_by_username, detail.adjustment.processed_by_role, detail.adjustment.processed_by_admin_id)}</p></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#DDE6E0] bg-[#F7FAF8] p-3 text-xs"><strong>Verified Approver:</strong> {approvalDescription(detail.adjustment.approval)}</div>
                <div className="rounded-xl border border-[#DDE6E0] bg-[#F7FAF8] p-3 text-xs"><strong>Refund Shift:</strong> {detail.adjustment.shift_id ? `#${detail.adjustment.shift_id} (processor's shift)` : 'No shift assigned'}</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <strong>Reason:</strong> {detail.adjustment.reason}
              </div>
              <div className="overflow-x-auto rounded-xl border border-steel-200">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-[#F4F8F5] text-[9px] uppercase tracking-wider text-steel-500">
                    <tr><th className="px-3 py-2">Product</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2">Refund</th><th className="px-3 py-2">Original Cost</th><th className="px-3 py-2">Restocked</th><th className="px-3 py-2">Movement</th></tr>
                  </thead>
                  <tbody className="divide-y divide-steel-100">
                    {detail.items.map((item) => (
                      <tr key={item.adjustment_item_id}>
                        <td className="px-3 py-2 font-semibold text-steel-800">{item.product_name}</td>
                        <td className="px-3 py-2">{item.quantity}</td>
                        <td className="px-3 py-2">{formatPeso(item.refund_subtotal)}</td>
                        <td className="px-3 py-2">{formatPeso(item.unit_cost)} / unit</td>
                        <td className="px-3 py-2">{item.restockable ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-2">{item.restock_movement_id ? `#${item.restock_movement_id}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
