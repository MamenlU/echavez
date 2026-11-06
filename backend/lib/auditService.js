const SENSITIVE_KEY_PATTERN = /(password|passcode|token|secret|api[_-]?key|authorization|cookie|card|cvv|cvc|receipt_image|image_data|base64)/i;
const LARGE_VALUE_KEY_PATTERN = /(image|receipt)/i;

function sanitizeValue(value, key = '') {
  if (value === undefined) return null;
  if (SENSITIVE_KEY_PATTERN.test(key)) return '[redacted]';
  if (LARGE_VALUE_KEY_PATTERN.test(key) && typeof value === 'string' && value.length > 500) {
    return '[omitted]';
  }

  if (Array.isArray(value)) {
    return value.slice(0, 100).map((entry) => sanitizeValue(entry));
  }

  if (value && typeof value === 'object') {
    const output = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      output[childKey] = sanitizeValue(childValue, childKey);
    }
    return output;
  }

  if (typeof value === 'string' && value.length > 4000) {
    return `${value.slice(0, 4000)}…`;
  }

  return value;
}

function serializeAuditData(value) {
  if (value === undefined || value === null) return null;

  return JSON.stringify(sanitizeValue(value));
}

export async function recordAuditLog(db, {
  adminId,
  action,
  entityType,
  entityId = null,
  summary,
  before = null,
  after = null,
  reason = null,
}) {
  const normalizedAdminId = Number(adminId);
  const normalizedAction = String(action || '').trim();
  const normalizedEntityType = String(entityType || '').trim();
  const normalizedEntityId = entityId === undefined || entityId === null
    ? null
    : String(entityId).trim() || null;
  const normalizedSummary = String(summary || '').trim();
  const normalizedReason = reason === undefined || reason === null
    ? null
    : String(reason).trim().slice(0, 500) || null;

  if (!Number.isInteger(normalizedAdminId) || normalizedAdminId <= 0) {
    throw new Error('Audit log requires a valid Admin ID.');
  }
  if (!normalizedAction || normalizedAction.length > 80) {
    throw new Error('Audit log action is invalid.');
  }
  if (!normalizedEntityType || normalizedEntityType.length > 50) {
    throw new Error('Audit log entity type is invalid.');
  }
  if (!normalizedSummary || normalizedSummary.length > 255) {
    throw new Error('Audit log summary is invalid.');
  }

  const [result] = await db.query(
    `INSERT INTO audit_logs (
      admin_id,
      action,
      entity_type,
      entity_id,
      summary,
      before_data,
      after_data,
      reason,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      normalizedAdminId,
      normalizedAction,
      normalizedEntityType,
      normalizedEntityId,
      normalizedSummary,
      serializeAuditData(before),
      serializeAuditData(after),
      normalizedReason,
    ]
  );

  return result.insertId;
}

export function productAuditSnapshot(product) {
  if (!product) return null;
  return {
    id: Number(product.id),
    barcode: product.barcode ?? null,
    name: product.name ?? null,
    unit: product.unit ?? null,
    price: Number(product.price || 0),
    category: product.category ?? null,
    category_id: product.category_id === null || product.category_id === undefined
      ? null
      : Number(product.category_id),
    supplier_id: product.supplier_id === null || product.supplier_id === undefined
      ? null
      : Number(product.supplier_id),
    stock: Number(product.stock || 0),
    reorder_level: Number(product.reorder_level || 0),
    brand: product.brand ?? null,
    status: product.status ?? null,
    delivery_class: product.delivery_class ?? null,
    bulk_quantity_threshold: product.bulk_quantity_threshold === null || product.bulk_quantity_threshold === undefined
      ? null
      : Number(product.bulk_quantity_threshold),
    fulfillment_rule: product.fulfillment_rule ?? null,
  };
}
