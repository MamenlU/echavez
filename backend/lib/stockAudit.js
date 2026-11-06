export const SUPPLIER_REFERENCE_MAX_LENGTH = 120;

export function normalizeSupplierReference(value, { required = false } = {}) {
  const cleaned = String(value ?? '').trim().replace(/\s+/g, ' ');

  if (!cleaned) {
    if (required) {
      throw Object.assign(
        new Error('Supplier receipt / reference number is required.'),
        { statusCode: 400 }
      );
    }
    return null;
  }

  if (cleaned.length > SUPPLIER_REFERENCE_MAX_LENGTH) {
    throw Object.assign(
      new Error(`Supplier receipt / reference number must not exceed ${SUPPLIER_REFERENCE_MAX_LENGTH} characters.`),
      { statusCode: 400 }
    );
  }

  return cleaned;
}
