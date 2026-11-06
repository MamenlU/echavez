import { getPublicPopularProducts } from './analyticsService.js';

const PRODUCT_STOP_WORDS = new Set([
  'what', 'which', 'where', 'when', 'have', 'with', 'your', 'rayjin', 'hardware',
  'please', 'price', 'stock', 'available', 'availability', 'product', 'products',
  'do', 'you', 'is', 'are', 'the', 'a', 'an', 'of', 'for', 'my', 'can', 'i',
  'need', 'want', 'show', 'tell', 'about', 'how', 'much', 'brand', 'category',
]);

function searchTerms(message) {
  return Array.from(new Set(
    String(message || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 3 && !PRODUCT_STOP_WORDS.has(word))
  )).slice(0, 6);
}

async function productContext(database, message) {
  const terms = searchTerms(message);
  const params = [];
  const filters = terms.map((term) => {
    const like = `%${term}%`;
    params.push(like, like, like, like);
    return `(LOWER(p.name) LIKE ? OR LOWER(p.brand) LIKE ? OR LOWER(p.category) LIKE ? OR LOWER(COALESCE(p.description, '')) LIKE ?)`;
  });

  const whereSearch = filters.length ? `AND (${filters.join(' OR ')})` : '';
  const [rows] = await database.query(
    `SELECT
       p.id, p.name, p.description, p.unit, p.price, p.category, p.brand,
       p.stock, p.status, p.fulfillment_rule
     FROM products p
     INNER JOIN categories c ON c.category_id = p.category_id
     WHERE p.status = 'active'
       AND c.status = 'Active'
       ${whereSearch}
     ORDER BY CASE WHEN p.stock > 0 THEN 0 ELSE 1 END, p.name ASC
     LIMIT 8`,
    params
  );

  return rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    description: row.description || null,
    unit: row.unit,
    price: Number(row.price),
    category: row.category,
    brand: row.brand,
    stock: Number(row.stock),
    availability: Number(row.stock) > 0 ? 'In stock' : 'Out of stock',
    fulfillment: row.fulfillment_rule === 'delivery_only' ? 'Delivery only' : 'Pickup, Delivery, or Shop & Go',
  }));
}

async function deliveryContext(database) {
  const [rows] = await database.query(
    `SELECT municipality, barangay, zone, surcharge
     FROM delivery_rates
     WHERE is_active = 1
     ORDER BY municipality ASC, barangay ASC
     LIMIT 120`
  );

  const municipalities = {};
  for (const row of rows) {
    if (!municipalities[row.municipality]) municipalities[row.municipality] = [];
    municipalities[row.municipality].push({
      barangay: row.barangay,
      zone: row.zone,
      surcharge: Number(row.surcharge),
    });
  }

  return municipalities;
}

async function customerOrderContext(database, customerId, message) {
  const orderIdMatch = String(message || '').toUpperCase().match(/ORD-[A-Z0-9]{6,50}/);
  const orderId = orderIdMatch?.[0] || null;
  const params = [customerId];
  let exactFilter = '';

  if (orderId) {
    exactFilter = 'AND o.id = ?';
    params.push(orderId);
  }

  const [rows] = await database.query(
    `SELECT
       o.id, o.total, o.original_subtotal, o.discount_amount, o.service_fee,
       o.fulfillment, o.payment_method, o.payment_status, o.status,
       o.requested_pickup_date, o.requested_pickup_time,
       o.scheduled_pickup_date, o.scheduled_pickup_time,
       o.delivery_municipality, o.delivery_barangay, o.delivery_fee,
       o.admin_message, o.created_at, o.updated_at, o.completed_at
     FROM orders o
     WHERE o.user_id = ?
       ${exactFilter}
     ORDER BY o.created_at DESC
     LIMIT ${orderId ? 1 : 5}`,
    params
  );

  return rows.map((row) => ({
    id: row.id,
    total: Number(row.total),
    originalSubtotal: Number(row.original_subtotal || 0),
    discountAmount: Number(row.discount_amount || 0),
    serviceFee: Number(row.service_fee || 0),
    fulfillment: row.fulfillment,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    status: row.status,
    requestedPickupDate: row.requested_pickup_date || null,
    requestedPickupTime: row.requested_pickup_time || null,
    scheduledPickupDate: row.scheduled_pickup_date || null,
    scheduledPickupTime: row.scheduled_pickup_time || null,
    deliveryMunicipality: row.delivery_municipality || null,
    deliveryBarangay: row.delivery_barangay || null,
    deliveryFee: row.delivery_fee === null ? null : Number(row.delivery_fee),
    latestAdminMessage: row.admin_message || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at || null,
  }));
}

export async function buildCustomerAiContext(database, actor, message) {
  const text = String(message || '').toLowerCase();
  const wantsDelivery = /delivery|barangay|municipality|deliver/.test(text);
  const wantsPopular = /popular|best seller|bestseller|top selling|recommend/.test(text);
  const wantsOrders = /order|status|payment|pickup|shop\s*&?\s*go|delivery/.test(text);

  const [products, delivery, orders, popular] = await Promise.all([
    productContext(database, message),
    wantsDelivery ? deliveryContext(database) : Promise.resolve(null),
    wantsOrders ? customerOrderContext(database, actor.id, message) : Promise.resolve([]),
    wantsPopular
      ? getPublicPopularProducts(database, { period: 'week', limit: 5 })
      : Promise.resolve(null),
  ]);

  return {
    customerId: Number(actor.id),
    products,
    deliveryAreas: delivery,
    ownOrders: orders,
    popularThisWeek: popular?.products || [],
    verifiedStoreRules: {
      fulfillmentMethods: ['Pickup', 'Delivery', 'Shop & Go'],
      deliveryMinimumProductSubtotal: 400,
      shopGoServiceFee: 50,
      firstOrderDiscount: '20% on the first order when product subtotal is at least ₱1,000, subject to account eligibility.',
      onlinePayments: 'GCash and Card use PayMongo; Cash is supported where the current checkout allows it.',
      deliveryOnlyRule: 'If any cart item is Delivery-only, the entire order must use Delivery.',
      paymongoPaidOrderRule: 'Successful PayMongo payment does not mean the order is completed; Admin review and fulfillment still follow.',
    },
  };
}

export async function buildAdminConversationContext(database, conversationDetail) {
  const orderId = conversationDetail?.conversation?.orderId;
  let order = null;

  if (orderId) {
    const [[row]] = await database.query(
      `SELECT
         o.id, o.user_id, o.total, o.original_subtotal, o.discount_amount,
         o.service_fee, o.delivery_fee, o.fulfillment, o.payment_method,
         o.payment_status, o.status, o.admin_message, o.created_at, o.updated_at,
         o.requested_pickup_date, o.requested_pickup_time,
         o.scheduled_pickup_date, o.scheduled_pickup_time,
         o.delivery_municipality, o.delivery_barangay
       FROM orders o
       WHERE o.id = ?
       LIMIT 1`,
      [orderId]
    );

    if (row) {
      order = {
        id: row.id,
        total: Number(row.total),
        originalSubtotal: Number(row.original_subtotal || 0),
        discountAmount: Number(row.discount_amount || 0),
        serviceFee: Number(row.service_fee || 0),
        deliveryFee: row.delivery_fee === null ? null : Number(row.delivery_fee),
        fulfillment: row.fulfillment,
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status,
        status: row.status,
        latestAdminMessage: row.admin_message || null,
        requestedPickupDate: row.requested_pickup_date || null,
        requestedPickupTime: row.requested_pickup_time || null,
        scheduledPickupDate: row.scheduled_pickup_date || null,
        scheduledPickupTime: row.scheduled_pickup_time || null,
        deliveryMunicipality: row.delivery_municipality || null,
        deliveryBarangay: row.delivery_barangay || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }
  }

  return {
    conversation: conversationDetail.conversation,
    messages: conversationDetail.messages.slice(-30).map((message) => ({
      senderType: message.senderType,
      senderName: message.senderName,
      message: message.message,
      createdAt: message.createdAt,
    })),
    order,
  };
}
