/**
 * Staff POS suggested delivery price. Mirrors the existing online-order rules:
 * highest delivery class (including bulk thresholds), configured active area
 * surcharge, and a per-unit multiplier for Delivery-only products.
 * This is a suggestion only; the actual POS fee remains operator-editable.
 */
export type PosDeliveryClass = 'light' | 'standard' | 'bulky';

type DeliveryProduct = {
  delivery_class?: string | null;
  bulk_quantity_threshold?: number | string | null;
  fulfillment_rule?: string | null;
};
export type PosDeliveryCartLine = { product: DeliveryProduct; quantity: number };
export type PosActiveDeliveryRate = { surcharge: number | string };

const BASE_FEES: Record<PosDeliveryClass, number> = { light: 60, standard: 150, bulky: 300 };
const CLASS_RANK: Record<PosDeliveryClass, number> = { light: 1, standard: 2, bulky: 3 };

export function getPosDeliverySuggestion(
  cart: readonly PosDeliveryCartLine[],
  selectedActiveRate: PosActiveDeliveryRate | null | undefined,
): { suggestedFee: number | null; loadClass: PosDeliveryClass; multiplier: number } {
  let loadClass: PosDeliveryClass = 'light';
  let deliveryOnlyQuantity = 0;
  for (const { product, quantity } of cart) {
    const count = Number(quantity);
    const rawClass = product.delivery_class;
    let itemClass: PosDeliveryClass = rawClass === 'light' || rawClass === 'bulky' ? rawClass : 'standard';
    const threshold = Number(product.bulk_quantity_threshold);
    if (Number.isInteger(threshold) && threshold > 0 && count >= threshold) itemClass = 'bulky';
    if (CLASS_RANK[itemClass] > CLASS_RANK[loadClass]) loadClass = itemClass;
    if (product.fulfillment_rule === 'delivery_only' && Number.isInteger(count) && count > 0) {
      deliveryOnlyQuantity += count;
    }
  }
  const multiplier = deliveryOnlyQuantity > 0 ? deliveryOnlyQuantity : 1;
  const surcharge = selectedActiveRate ? Number(selectedActiveRate.surcharge) : NaN;
  const suggestedFee = Number.isFinite(surcharge) && surcharge >= 0
    ? Number(((BASE_FEES[loadClass] + surcharge) * multiplier).toFixed(2))
    : null;
  return { suggestedFee, loadClass, multiplier };
}
