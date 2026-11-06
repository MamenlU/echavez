import React, {
  useState,
  useEffect,
  useRef
} from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AdminMessages } from '../components/AdminMessages';
import { AdminDashboardOverview } from '../components/AdminDashboardOverview';
import { AdminSidebar, type AdminSidebarTab } from '../components/AdminSidebar';
import { InventoryAdjustmentPanel } from '../components/InventoryAdjustmentPanel';
import { AdminAuditLogPanel } from '../components/AdminAuditLogPanel';
import { SalesAdjustmentPanel } from '../components/SalesAdjustmentPanel';
import { PurchaseOrdersPanel, type PurchaseOrderReceiveTarget } from '../components/PurchaseOrdersPanel';
import { ReorderSuggestionsPanel } from '../components/ReorderSuggestionsPanel';
import { CashierShiftPanel, CashierShiftStatusBanner } from '../components/CashierShiftPanel';
import { ExpenseManagementPanel } from '../components/ExpenseManagementPanel';

import { 
  ClipboardList, ScanBarcode, ArrowLeftRight,
  AlertTriangle, CheckCircle, ShoppingCart, 
  Search, MapPin, Save, RefreshCw, UsersRound, Mail,
  Phone, CalendarDays, Eye, UserCheck, UserX, Menu, X,
  FileBarChart, Printer, Download, ArrowUp, Wrench
} from 'lucide-react';

type AdminTab =
  | 'overview'
  | 'customers'
  | 'orders'
  | 'messages'
  | 'deliveryRates'
  | 'products'
  | 'purchaseOrders'
  | 'reorderSuggestions'
  | 'receiveStock'
  | 'inventoryAdjustment'
  | 'categories'
  | 'suppliers'
  | 'cashierShift'
  | 'expenses'
  | 'pos'
  | 'sales'
  | 'saleAdjustments'
  | 'movementHistory'
  | 'reports'
  | 'auditLogs';

type ReportType =
  | 'management'
  | 'sales'
  | 'inventory'
  | 'lowStock'
  | 'stockMovement';

const adminTabs: AdminTab[] = [
  'overview',
  'customers',
  'orders',
  'messages',
  'deliveryRates',
  'products',
  'purchaseOrders',
  'reorderSuggestions',
  'receiveStock',
  'inventoryAdjustment',
  'categories',
  'suppliers',
  'cashierShift',
  'expenses',
  'pos',
  'sales',
  'saleAdjustments',
  'movementHistory',
  'reports',
  'auditLogs',
];

const escapeCsvValue = (value: unknown) =>
  `"${String(value ?? '').replace(/"/g, '""')}"`;

const escapeReportHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatPeso = (value: number) =>
  `₱${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

type DeliveryLoadClass =
  | 'light'
  | 'standard'
  | 'bulky';

type DeliveryZone =
  | 'poblacion'
  | 'near'
  | 'medium'
  | 'far';

interface DeliveryRateSetting {
  id: number;
  municipality: string;
  barangay: string;
  zone: DeliveryZone;
  surcharge: number;
  is_active: boolean;
  updated_at?: string;
}

interface DeliveryAreasResponse {
  municipalities: string[];
  barangays: Record<string, string[]>;
}

interface AdminUser {
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

interface CustomerAccount {
  id: number;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  status: 'active' | 'inactive' | 'banned';
  created_at: string;
  last_login: string | null;
  total_orders: number;
  completed_orders: number;
  active_orders: number;
  total_spent: number;
}

interface CustomerOrderSummary {
  id: string;
  total: number;
  original_subtotal?: number | string | null;
  discount_amount?: number | string | null;
  fulfillment: 'pickup' | 'delivery' | 'shop_go';
  payment_method: string;
  status: Order['status'];
  service_fee: number | null;
  delivery_fee: number | null;
  created_at: string;
}
interface Product {
  id: number;
  barcode: string | null;
  name: string;
  description: string | null;
  unit: string;
  price: number;
  category: string;
  supplier_id: number | null;
  image: string;
  stock: number;
  reorder_level: number;
  brand: string;
  status?: 'active' | 'inactive';
  delivery_class?: DeliveryLoadClass;
  bulk_quantity_threshold?: number | null;
  fulfillment_rule?: 'all' | 'delivery_only';
}
interface Category {
  category_id: number;
  category_name: string;
  description: string | null;
  status: 'Active' | 'Inactive';
}

interface Supplier {
  supplier_id: number;
  supplier_name: string;
  contact_person: string | null;
  contact_number: string | null;
  address: string | null;
  lead_time_days: number | null;
  status: 'Active' | 'Inactive';
}

interface InventoryMovement {
  movement_id: number;
  product_id: number;
  product_name: string;
  barcode?: string | null;
  category?: string | null;

  admin_id: number;
  recorded_by?: string | null;

  supplier_id: number | null;
  supplier_name: string | null;

  sale_id: number | null;
  order_id: string | null;

  movement_type: 'Stock-In' | 'Stock-Out';
  movement_reason?: string | null;
  sale_adjustment_item_id?: number | null;
  quantity: number;

  supplier_price: number;
  selling_price: number;

  movement_date: string;
  remarks: string | null;
  receipt_path?: string | null;
  supplier_reference?: string | null;
  source_label?: string | null;
  reference_label?: string | null;
}

interface SalesHistoryItem {
  sale_id: number;
  order_id: string | null;
  admin_id: number;
  sales_source: 'Online Order' | 'Onsite POS';
  // Backward-compatible total-revenue alias from the API.
  revenue: number;
  gross_merchandise_sales: number;
  discount_amount: number;
  merchandise_refunds: number;
  net_merchandise_sales: number;
  service_fee_refunds: number;
  service_revenue: number;
  delivery_fee_refunds: number;
  delivery_revenue: number;
  fee_revenue: number;
  total_refunds: number;
  original_total_revenue: number;
  total_revenue: number;
  payment_status: 'Paid' | 'Cancelled';
  sale_date: string;
  item_count: number;
  total_quantity: number;
  net_quantity: number;
  returned_quantity: number;
  items_summary: string;
  original_cogs: number;
  cogs_reversed: number;
  cogs: number;
  gross_profit: number;
  gross_profit_margin: number;
  reference: string;
  source_label: 'Pickup' | 'Shop & Go' | 'Delivery' | 'POS';
  payment_method: string;
  adjustment_count: number;
  void_count: number;
  adjustment_state: 'Completed' | 'Adjusted' | 'Voided';
}

interface SalesSummary {
  total_sales: number;
  total_gross_merchandise_sales: number;
  total_discounts: number;
  total_merchandise_refunds: number;
  total_net_merchandise_sales: number;
  total_service_fee_refunds: number;
  total_delivery_fee_refunds: number;
  total_service_revenue: number;
  total_delivery_revenue: number;
  total_fee_revenue: number;
  total_refunds: number;
  total_revenue: number;
  total_original_cogs: number;
  total_cogs_reversed: number;
  total_cogs: number;
  total_gross_profit: number;
  total_gross_profit_margin: number;
  total_items_sold: number;
  total_items_returned: number;
  total_adjustments: number;
  total_voided_sales: number;
}

interface ManagementOverviewReport {
  profitability: {
    today: {
      grossProfit: number;
      serviceDeliveryRevenue: number;
      operatingExpenses: number;
      estimatedNetProfit: number;
      expenseCount: number;
    };
    month: {
      from: string;
      to: string;
      grossProfit: number;
      serviceDeliveryRevenue: number;
      operatingExpenses: number;
      estimatedNetProfit: number;
      expenseCount: number;
    };
  };
  purchasing: {
    openPurchaseOrders: number;
    partiallyReceivedOrders: number;
    outstandingUnits: number;
    outstandingExpectedCost: number;
  };
  replenishment: {
    needsReorder: number;
    coveredByOpenPo: number;
    setupRequired: number;
    healthy: number;
    suggestedUnits: number;
  };
  saleAdjustmentsToday: {
    adjustmentCount: number;
    returnCount: number;
    voidCount: number;
    refundAmount: number;
    merchandiseRefundAmount: number;
  };
  cashier: {
    hasOpenShift: boolean;
    currentShift: null | {
      shiftId: number;
      expectedCash: number;
      transactionCount: number;
    };
    lastClosedShift: null | {
      shiftId: number;
      discrepancy: number;
      closedAt: string;
    };
  };
}

interface CartItem {
  product: Product;
  quantity: number;
  order_item_price?: number | string | null;
  order_item_subtotal?: number | string | null;
}

interface PosDeliveryReceipt {
  saleId: number;
  saleDate: string;

  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];

  productSubtotal: number;
  deliveryFee: number;
  total: number;

  customerName: string;
  contactPerson: string;
  contactNumber: string;
  municipality: string;
  barangay: string;
  address: string;
  landmark: string;

  paymentMethod: 'cash' | 'card';
  cashReceived: number | null;
  changeAmount: number | null;
}

interface Order {
  id: string;
  date: string;
  created_at?: string | null;
  items: CartItem[];
  total: number;
  original_subtotal?: number | string | null;
  discount_amount?: number | string | null;

  fulfillment:
    | 'pickup'
    | 'delivery'
    | 'shop_go';

  paymentMethod:
    | 'card'
    | 'gcash'
    | 'cash';

  payment_method?: string;
  payment_status?: 'Pending' | 'Paid' | 'Failed' | 'Cancelled' | string | null;

  customer_first_name?: string | null;
  customer_last_name?: string | null;
  customer_phone_number?: string | null;
  customer_email?: string | null;

  requested_pickup_date?: string | null;
  requested_pickup_time?: string | null;

  scheduled_pickup_date?: string | null;
  scheduled_pickup_time?: string | null;

  admin_message?: string | null;
  message_history?: Array<{
  id: number;
  message: string;
  created_at: string;
}>;

  delivery_contact_person?: string | null;
  delivery_contact_number?: string | null;
  delivery_municipality?: string | null;
  delivery_barangay?: string | null;
  delivery_address?: string | null;
  delivery_landmark?: string | null;
  delivery_instructions?: string | null;
  delivery_latitude?: number | string | null;
  delivery_longitude?: number | string | null;
  delivery_fee?: number | string | null;
  service_fee?: number | string | null;
  previous_status?: string | null;
  delivery_load_class?:
    | 'light'
    | 'standard'
    | 'bulky'
    | null;

  status:
    | 'pending'
    | 'awaiting_payment'
    | 'approved'
    | 'processing'
    | 'ready'
    | 'out_for_delivery'
    | 'failed_delivery'
    | 'deactivated'
    | 'completed'
    | 'cancelled'
    | 'rejected';
}

const formatPaymentMethod = (method: string) => {
  if (method === 'gcash') return 'GCash (PayMongo)';
  if (method === 'card') return 'Card (PayMongo)';
  if (method === 'paymongo') return 'PayMongo';
  return 'Cash';
};

const PAID_ONLINE_ORDER_LOCK_MESSAGE =
  'This order has a successfully verified PayMongo payment. Reject and Cancel actions are unavailable because refund processing is not supported by this system.';

const isPaidOnlineOrder = (order: Order) => {
  const paymentMethod = String(
    order.payment_method ||
    order.paymentMethod ||
    'cash'
  )
    .trim()
    .toLowerCase();

  const paymentPaid =
    String(order.payment_status || '')
      .trim()
      .toLowerCase() === 'paid';

  return (
    ['card', 'gcash', 'paymongo'].includes(
      paymentMethod
    ) &&
    paymentPaid
  );
};

let adminSessionRedirecting = false;

const normalizePickupDateForInput = (
  value?: string | null
) => {
  if (!value) {
    return '';
  }

  const text = String(value);

  // Already a plain MySQL YYYY-MM-DD date.
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return text.slice(0, 10);
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, '0');

  const day =
    String(
      date.getDate()
    ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const normalizePickupTimeForInput = (
  value?: string | null
) => {
  if (!value) {
    return '';
  }

  return String(value).slice(0, 5);
};

const handleAdminSessionExpired = () => {
  // Prevent several protected API requests from showing
  // multiple expiry alerts at the same time.
  if (adminSessionRedirecting) {
    return;
  }

  adminSessionRedirecting = true;

  localStorage.removeItem('token');
  localStorage.removeItem('user');

  alert(
    'Your Admin session has expired. Please log in again.'
  );

  window.location.assign('/login');
};

export function AdminDashboard() {
const [searchParams, setSearchParams] = useSearchParams();
const requestedTab = searchParams.get('tab');
const dashboardMainRef = useRef<HTMLElement>(null);
const [isSidebarOpen, setIsSidebarOpen] = useState(false);
const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() =>
  localStorage.getItem('rayjin_admin_sidebar_collapsed') === '1'
);
const [salesTableView, setSalesTableView] = useState<'compact' | 'full'>('compact');
const [movementTableView, setMovementTableView] = useState<'compact' | 'full'>('compact');
const [reportTableView, setReportTableView] = useState<'compact' | 'full'>('compact');
const [selectedSaleHistory, setSelectedSaleHistory] = useState<SalesHistoryItem | null>(null);
const [selectedMovementHistory, setSelectedMovementHistory] = useState<InventoryMovement | null>(null);

useEffect(() => {
  localStorage.setItem('rayjin_admin_sidebar_collapsed', isSidebarCollapsed ? '1' : '0');
}, [isSidebarCollapsed]);

const activeTab: AdminTab =
  requestedTab && adminTabs.includes(requestedTab as AdminTab)
    ? (requestedTab as AdminTab)
    : 'overview';

const scrollAdminContentToTop = (
  behavior: ScrollBehavior = 'smooth'
) => {
  window.requestAnimationFrame(() => {
    if (window.innerWidth >= 1024) {
      dashboardMainRef.current?.scrollTo({
        top: 0,
        behavior,
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior,
      });
    }
  });
};

const setActiveTab = (tab: AdminTab) => {
  const nextSearchParams =
    new URLSearchParams(searchParams);

  nextSearchParams.set('tab', tab);
  setSearchParams(nextSearchParams);

  scrollAdminContentToTop('smooth');
};

   useEffect(() => {
  scrollAdminContentToTop('auto');
}, [activeTab]);


const [reportType, setReportType] = useState<ReportType>('management');
const [reportSearch, setReportSearch] = useState('');
const [reportDateFrom, setReportDateFrom] = useState('');
const [reportDateTo, setReportDateTo] = useState('');
const [reportCategory, setReportCategory] = useState('all');
const [reportGeneratedAt, setReportGeneratedAt] = useState(new Date());
const [managementOverviewReport, setManagementOverviewReport] = useState<ManagementOverviewReport | null>(null);
const [managementOverviewError, setManagementOverviewError] = useState('');

const [reportMovementType, setReportMovementType] = useState<
  'all' | 'Stock-In' | 'Stock-Out'
>('all');

const [reportMovementDateFrom, setReportMovementDateFrom] =
  useState('');

const [reportMovementDateTo, setReportMovementDateTo] =
  useState('');

const [user, setUser] = useState<AdminUser>({
  username: 'admin',
  email: 'admin@system.com'
});  
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerStatusFilter, setCustomerStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all');
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerAccount | null>(null);
  const [customerOrders, setCustomerOrders] =
    useState<CustomerOrderSummary[]>([]);
  const [customerOrdersLoading, setCustomerOrdersLoading] =
    useState(false);
  const [updatingCustomerId, setUpdatingCustomerId] =
    useState<number | null>(null);
  const [customersMessage, setCustomersMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryMovements, setInventoryMovements] =
  useState<InventoryMovement[]>([]);
  const [salesHistory, setSalesHistory] =
  useState<SalesHistoryItem[]>([]);

const [salesSummary, setSalesSummary] =
  useState<SalesSummary>({
    total_sales: 0,
    total_gross_merchandise_sales: 0,
    total_discounts: 0,
    total_merchandise_refunds: 0,
    total_net_merchandise_sales: 0,
    total_service_fee_refunds: 0,
    total_delivery_fee_refunds: 0,
    total_service_revenue: 0,
    total_delivery_revenue: 0,
    total_fee_revenue: 0,
    total_refunds: 0,
    total_revenue: 0,
    total_original_cogs: 0,
    total_cogs_reversed: 0,
    total_cogs: 0,
    total_gross_profit: 0,
    total_gross_profit_margin: 0,
    total_items_sold: 0,
    total_items_returned: 0,
    total_adjustments: 0,
    total_voided_sales: 0,
  });

  const [salesDatePreset, setSalesDatePreset] = useState<
  'all' | 'today' | 'week' | 'month' | 'custom'
>('all');

const [salesDateFrom, setSalesDateFrom] = useState('');
const [salesDateTo, setSalesDateTo] = useState('');
const [salesSearch, setSalesSearch] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editSupplierData, setEditSupplierData] = useState({
  supplier_name: '',
  contact_person: '',
  contact_number: '',
  address: '',
  lead_time_days: ''
});
const [editSupplierStatus, setEditSupplierStatus] = useState<
  'idle' | 'success' | 'error'
>('idle');

const [editSupplierError, setEditSupplierError] = useState('');
  const [newSupplier, setNewSupplier] = useState({
  supplier_name: '',
  contact_person: '',
  contact_number: '',
  address: '',
  lead_time_days: ''
});
const [supplierStatus, setSupplierStatus] = useState<
  'idle' | 'success' | 'error'
>('idle');

const [supplierError, setSupplierError] = useState('');
const [supplierSearch, setSupplierSearch] = useState('');

const [
  supplierStatusFilter,
  setSupplierStatusFilter
] = useState<'all' | 'active' | 'inactive'>('all');

const [editCategoryData, setEditCategoryData] = useState({
  category_name: '',
  description: ''
});

const [editCategoryStatus, setEditCategoryStatus] = useState<
  'idle' | 'success' | 'error'
>('idle');

const [editCategoryError, setEditCategoryError] = useState('');
  const [newCategory, setNewCategory] = useState({
  category_name: '',
  description: ''
});

const [categoryStatus, setCategoryStatus] = useState<
  'idle' | 'success' | 'error'
>('idle');

const [categoryError, setCategoryError] = useState('');
const [categorySearch, setCategorySearch] = useState('');

const [
  categoryStatusFilter,
  setCategoryStatusFilter
] = useState<'all' | 'active' | 'inactive'>('all');

const [orders, setOrders] = useState<Order[]>([]);
const [adminMessageDrafts, setAdminMessageDrafts] =
  useState<Record<string, string>>({});
const [expandedAdminOrderUpdates, setExpandedAdminOrderUpdates] =
  useState<Record<string, boolean>>({});
const [recentlyUpdatedOrderId, setRecentlyUpdatedOrderId] =
  useState<string | null>(null);
const orderCardRefs =
  useRef<Record<string, HTMLDivElement | null>>({});

const [pickupDeadlineNow, setPickupDeadlineNow] =
  useState(() => Date.now());

useEffect(() => {
  const timer = window.setInterval(() => {
    setPickupDeadlineNow(Date.now());
  }, 60 * 1000);

  return () => {
    window.clearInterval(timer);
  };
}, []);

// Fulfillment Center filters.
// These only filter the already-loaded Admin order list.
// They do not modify order records or backend data.
const [orderSearch, setOrderSearch] = useState('');
const [orderDateFilter, setOrderDateFilter] = useState('');
const [orderStatusFilter, setOrderStatusFilter] =
  useState<'all' | Order['status']>('all');

const [deliveryRateSettings, setDeliveryRateSettings] =
  useState<DeliveryRateSetting[]>([]);
const [deliveryAreas, setDeliveryAreas] = useState<DeliveryAreasResponse>({
  municipalities: ['Initao', 'Libertad', 'Naawan', 'Gitagum'],
  barangays: {},
});
const [newDeliveryRate, setNewDeliveryRate] = useState({
  municipality: '',
  barangay: '',
  zone: '' as '' | DeliveryZone,
  surcharge: '',
  is_active: false,
});
const [addingDeliveryRate, setAddingDeliveryRate] = useState(false);

  const [deliveryRatesLoading, setDeliveryRatesLoading] =
    useState(false);
  const [savingDeliveryRateId, setSavingDeliveryRateId] =
    useState<number | null>(null);
  const [deliveryRatesMessage, setDeliveryRatesMessage] =
    useState<{
      type: 'success' | 'error';
      text: string;
    } | null>(null);
  const [posCart, setPosCart] = useState<CartItem[]>([]);
  
  const [posSearch, setPosSearch] = useState('');
  const [posFulfillment, setPosFulfillment] = useState<'pickup' | 'delivery'>('pickup');

  const posCartRequiresDelivery = posCart.some((item) => {
    const liveProduct = products.find((product) => product.id === item.product.id);
    return (liveProduct?.fulfillment_rule || item.product.fulfillment_rule || 'all') === 'delivery_only';
  });

  useEffect(() => {
    if (posCartRequiresDelivery && posFulfillment !== 'delivery') {
      setPosFulfillment('delivery');
    }
  }, [posCartRequiresDelivery, posFulfillment]);

  const [posDeliveryDetails, setPosDeliveryDetails] = useState({
    customer_name: '',
    contact_person: '',
    contact_number: '',
    municipality: '',
    barangay: '',
    address: '',
    landmark: '',
    delivery_fee: '',
  });
  const [posStatus, setPosStatus] =
  useState<'idle' | 'success'>('idle');

const [posSubmitting, setPosSubmitting] =
  useState(false);

const [
  lastPosDeliveryReceipt,
  setLastPosDeliveryReceipt
] = useState<PosDeliveryReceipt | null>(null);

  const [posPaymentMethod, setPosPaymentMethod] =
  useState<'cash' | 'card'>('cash');

const [posCashReceived, setPosCashReceived] =
  useState('');

const [
  posCardPaymentConfirmed,
  setPosCardPaymentConfirmed
] = useState(false);

  const [posBarcodeInput, setPosBarcodeInput] =
  useState('');

const [posBarcodeMessage, setPosBarcodeMessage] =
  useState('');

const [posBarcodeStatus, setPosBarcodeStatus] =
  useState<'idle' | 'success' | 'error'>('idle');

const posBarcodeInputRef =
  useRef<HTMLInputElement>(null);

  const posProductPanelRef = useRef<HTMLDivElement>(null);
const posCartPanelRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (activeTab !== 'pos') return;

  const productPanel = posProductPanelRef.current;
  const cartPanel = posCartPanelRef.current;

  if (!productPanel || !cartPanel) return;

  const syncPosPanelHeight = () => {
    // On tablet/mobile, let the stacked layout size naturally.
    if (window.innerWidth < 1024) {
      productPanel.style.height = '';
      return;
    }

    // Use more of the available desktop viewport so manual product
    // selection can display more products without changing POS logic.
    const minimumHeight = Math.max(580, window.innerHeight - 190);

    // Let the cart/checkout determine the height when it becomes taller.
    const cartHeight = cartPanel.getBoundingClientRect().height;

    productPanel.style.height =
      `${Math.max(minimumHeight, Math.ceil(cartHeight))}px`;
  };

  syncPosPanelHeight();

  const observer = new ResizeObserver(syncPosPanelHeight);
  observer.observe(cartPanel);

  window.addEventListener('resize', syncPosPanelHeight);

  return () => {
    observer.disconnect();
    window.removeEventListener('resize', syncPosPanelHeight);
    productPanel.style.height = '';
  };
}, [activeTab]);

const [newProduct, setNewProduct] = useState({
  name: '',
  description: '',
  unit: '',
  barcode: '',
  price: '',
  category: '',
  supplier_id: '',
  image: '🛠️',
  stock: '',
  reorder_level: '10',
  brand: '',
  status: 'active' as 'active' | 'inactive',
  delivery_class: 'standard' as DeliveryLoadClass,
  bulk_quantity_threshold: '',
  fulfillment_rule: 'all' as 'all' | 'delivery_only',
  opening_supplier_price: '',
  opening_supplier_reference: '',
  opening_receipt_image: ''
});

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productStatus, setProductStatus] = useState<'idle' | 'success'>('idle');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('all');

const [inventoryStockFilter, setInventoryStockFilter] = useState<
  'all' | 'normal' | 'low' | 'out'
>('all');

const [
  inventoryStatusFilter,
  setInventoryStatusFilter
] = useState<'all' | 'active' | 'inactive'>('all');

const [movementSearch, setMovementSearch] =
  useState('');

const [movementTypeFilter, setMovementTypeFilter] =
  useState<'all' | 'Stock-In' | 'Stock-Out'>('all');

const [movementSourceFilter, setMovementSourceFilter] =
  useState('all');

const [movementCategoryFilter, setMovementCategoryFilter] =
  useState('all');

const [movementDateFrom, setMovementDateFrom] =
  useState('');

const [movementDateTo, setMovementDateTo] =
  useState('');

// Kept only for compatibility with the hidden legacy opening-inventory form.
// New opening stock is recorded atomically by Add Product / Opening Inventory.
const [openingInventory, setOpeningInventory] = useState({
  product_id: '', supplier_id: '', supplier_price: '',
});
const [openingInventoryStatus, setOpeningInventoryStatus] = useState<
  'idle' | 'loading' | 'success' | 'error'
>('idle');
const [openingInventoryMessage, setOpeningInventoryMessage] = useState('');

const [stockReceiving, setStockReceiving] = useState({
  product_id: '',
  supplier_id: '',
  quantity: '',
  supplier_price: '',
  supplier_reference: '',
  selling_price: '',
  receipt_image: '',
  purchase_order_item_id: '',
  purchase_order_id: '',
  purchase_order_number: '',
  purchase_order_remaining_quantity: ''
});

const [stockReceivingProductQuery, setStockReceivingProductQuery] = useState('');
const [stockReceivingSupplierQuery, setStockReceivingSupplierQuery] = useState('');
const [stockReceivingRequestId, setStockReceivingRequestId] = useState(() => crypto.randomUUID());
const [stockReceivingReceiptInputKey, setStockReceivingReceiptInputKey] = useState(0);

const [stockReceivingStatus, setStockReceivingStatus] = useState<
  'idle' | 'loading' | 'success' | 'error'
>('idle');

const [stockReceivingMessage, setStockReceivingMessage] = useState('');


const fetchCustomers = async () => {
  const token = localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  setCustomersLoading(true);

  try {
    const res = await fetch('/api/customers', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json().catch(() => []);

    if (res.status === 401 || res.status === 403) {
      handleAdminSessionExpired();
      return;
    }

    if (!res.ok) {
      setCustomersMessage({
        type: 'error',
        text: data.error || 'Unable to load customer accounts.',
      });
      return;
    }

    setCustomers(
      data.map((customer: CustomerAccount) => ({
        ...customer,
        total_orders: Number(customer.total_orders || 0),
        completed_orders: Number(customer.completed_orders || 0),
        active_orders: Number(customer.active_orders || 0),
        total_spent: Number(customer.total_spent || 0),
      }))
    );
  } catch (err) {
    console.error('Error fetching customers:', err);

    setCustomersMessage({
      type: 'error',
      text: 'Unable to connect to the customer service.',
    });
  } finally {
    setCustomersLoading(false);
  }
};

const fetchCustomerOrders = async (customer: CustomerAccount) => {
  const token = localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  setSelectedCustomer(customer);
  setCustomerOrders([]);
  setCustomerOrdersLoading(true);

  try {
    const res = await fetch(`/api/customers/${customer.id}/orders`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json().catch(() => []);

    if (res.status === 401 || res.status === 403) {
      handleAdminSessionExpired();
      return;
    }

    if (!res.ok) {
      setCustomersMessage({
        type: 'error',
        text: data.error || 'Unable to load this customer\'s orders.',
      });
      return;
    }

    setCustomerOrders(
      data.map((order: CustomerOrderSummary) => ({
        ...order,
        total: Number(order.total || 0),
        delivery_fee:
          order.delivery_fee === null
            ? null
            : Number(order.delivery_fee),
        service_fee:
          order.service_fee === null
            ? null
            : Number(order.service_fee),
      }))
    );
  } catch (err) {
    console.error('Error fetching customer orders:', err);

    setCustomersMessage({
      type: 'error',
      text: 'Unable to connect to the customer order service.',
    });
  } finally {
    setCustomerOrdersLoading(false);
  }
};

const handleUpdateCustomerStatus = async (
  customer: CustomerAccount
) => {
  const nextStatus =
    customer.status === 'active' ? 'inactive' : 'active';

  const actionLabel =
    nextStatus === 'active' ? 'activate' : 'deactivate';

  if (
    !window.confirm(
      `Are you sure you want to ${actionLabel} ${
        [customer.first_name, customer.last_name]
          .filter(Boolean)
          .join(' ') || customer.username
      }?`
    )
  ) {
    return;
  }

  const token = localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  setUpdatingCustomerId(customer.id);
  setCustomersMessage(null);

  try {
    const res = await fetch(`/api/customers/${customer.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: nextStatus }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401 || res.status === 403) {
      handleAdminSessionExpired();
      return;
    }

    if (!res.ok) {
      setCustomersMessage({
        type: 'error',
        text: data.error || `Unable to ${actionLabel} this customer.`,
      });
      return;
    }

    setCustomers((currentCustomers) =>
      currentCustomers.map((currentCustomer) =>
        currentCustomer.id === customer.id
          ? { ...currentCustomer, status: nextStatus }
          : currentCustomer
      )
    );

    setSelectedCustomer((currentCustomer) =>
      currentCustomer?.id === customer.id
        ? { ...currentCustomer, status: nextStatus }
        : currentCustomer
    );

    setCustomersMessage({
      type: 'success',
      text: data.message || `Customer ${actionLabel}d successfully.`,
    });
  } catch (err) {
    console.error('Error updating customer status:', err);

    setCustomersMessage({
      type: 'error',
      text: 'Unable to connect to the customer service.',
    });
  } finally {
    setUpdatingCustomerId(null);
  }
};


  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) setProducts(await res.json());
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const handleOpeningInventory = async (event: React.FormEvent) => {
    event.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return handleAdminSessionExpired();
    setOpeningInventoryStatus('loading');
    setOpeningInventoryMessage('');
    try {
      const response = await fetch('/api/inventory/opening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          product_id: Number(openingInventory.product_id),
          supplier_id: openingInventory.supplier_id ? Number(openingInventory.supplier_id) : null,
          supplier_price: Number(openingInventory.supplier_price),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to record opening inventory.');
      setOpeningInventoryStatus('success');
      setOpeningInventoryMessage(data.message || 'Opening inventory recorded successfully.');
      await Promise.all([fetchProducts(), fetchInventoryMovements()]);
    } catch (error) {
      setOpeningInventoryStatus('error');
      setOpeningInventoryMessage(error instanceof Error ? error.message : 'Unable to record opening inventory.');
    }
  };

const fetchInventoryMovements = async () => {
  const token = localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  try {
    const res = await fetch('/api/inventory/movements', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401 || res.status === 403) {
      handleAdminSessionExpired();
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));

      console.error(
        'Unable to fetch inventory movements:',
        data.error || `HTTP ${res.status}`
      );

      return;
    }

    const data = await res.json();

    setInventoryMovements(data);

  } catch (err) {
    console.error(
      'Error fetching inventory movements:',
      err
    );
  }
};

const fetchManagementOverviewReport = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  try {
    const res = await fetch('/api/analytics/admin', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401 || res.status === 403) {
      handleAdminSessionExpired();
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setManagementOverviewError(data.error || 'Unable to load the management summary.');
      return;
    }

    const data = await res.json();
    setManagementOverviewReport(data.managementOverview || null);
    setManagementOverviewError('');
  } catch (error) {
    console.error('Error fetching management summary:', error);
    setManagementOverviewError('Unable to connect to the management-summary service.');
  }
};

const fetchSalesHistory = async () => {
  const token = localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  try {
    const res = await fetch('/api/sales/history', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401 || res.status === 403) {
      handleAdminSessionExpired();
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));

      console.error(
        'Unable to fetch sales history:',
        data.error || `HTTP ${res.status}`
      );

      return;
    }

    const data = await res.json();

    setSalesHistory(data.sales || []);

    setSalesSummary(
      data.summary || {
        total_sales: 0,
        total_gross_merchandise_sales: 0,
        total_discounts: 0,
        total_merchandise_refunds: 0,
        total_net_merchandise_sales: 0,
        total_service_fee_refunds: 0,
        total_delivery_fee_refunds: 0,
        total_service_revenue: 0,
        total_delivery_revenue: 0,
        total_fee_revenue: 0,
        total_refunds: 0,
        total_revenue: 0,
        total_original_cogs: 0,
        total_cogs_reversed: 0,
        total_cogs: 0,
        total_gross_profit: 0,
        total_gross_profit_margin: 0,
        total_items_sold: 0,
        total_items_returned: 0,
        total_adjustments: 0,
        total_voided_sales: 0,
      }
    );

  } catch (err) {
    console.error(
      'Error fetching sales history:',
      err
    );
  }
};

const handleStockReceiving = async (e: React.FormEvent) => {
  e.preventDefault();

  const token = localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  if (!stockReceiving.product_id) {
    setStockReceivingStatus('error');
    setStockReceivingMessage('Please select a product.');
    return;
  }

  if (!stockReceiving.supplier_id) {
    setStockReceivingStatus('error');
    setStockReceivingMessage('Please select a supplier.');
    return;
  }

  const quantity = Number(stockReceiving.quantity);
  const supplierPrice = Number(stockReceiving.supplier_price);

  if (!Number.isInteger(quantity) || quantity <= 0) {
    setStockReceivingStatus('error');
    setStockReceivingMessage(
      'Received quantity must be a whole number greater than zero.'
    );
    return;
  }

  if (
    stockReceiving.purchase_order_item_id &&
    Number(stockReceiving.purchase_order_remaining_quantity || 0) > 0 &&
    quantity > Number(stockReceiving.purchase_order_remaining_quantity)
  ) {
    setStockReceivingStatus('error');
    setStockReceivingMessage(
      `Received quantity cannot exceed the ${stockReceiving.purchase_order_remaining_quantity} unit(s) remaining on ${stockReceiving.purchase_order_number}.`
    );
    return;
  }

  if (
    !stockReceiving.supplier_price ||
    supplierPrice <= 0
  ) {
    setStockReceivingStatus('error');
    setStockReceivingMessage(
      'Supplier cost must be greater than zero.'
    );
    return;
  }

  const supplierReference = stockReceiving.supplier_reference.trim();
  if (supplierReference.length > 120) {
    setStockReceivingStatus('error');
    setStockReceivingMessage('Supplier reference number must not exceed 120 characters.');
    return;
  }

  let sellingPrice: number | undefined;

  if (stockReceiving.selling_price) {
    sellingPrice = Number(
      stockReceiving.selling_price
    );

    if (sellingPrice <= 0) {
      setStockReceivingStatus('error');
      setStockReceivingMessage(
        'Selling price must be greater than zero.'
      );
      return;
    }
  }

  setStockReceivingStatus('loading');
  setStockReceivingMessage('');

  try {
    const res = await fetch('/api/inventory/receive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        product_id: Number(
          stockReceiving.product_id
        ),
        supplier_id: Number(
          stockReceiving.supplier_id
        ),
        quantity,
        supplier_price: supplierPrice,
        supplier_reference: supplierReference || null,
        ...(sellingPrice !== undefined && {
          selling_price: sellingPrice,
        }),
        receipt_image: stockReceiving.receipt_image || null,
        receivingRequestId: stockReceivingRequestId,
        ...(stockReceiving.purchase_order_item_id && {
          purchase_order_item_id: Number(stockReceiving.purchase_order_item_id),
        }),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401 || res.status === 403) {
      handleAdminSessionExpired();
      return;
    }

    if (!res.ok) {
      setStockReceivingStatus('error');
      setStockReceivingMessage(
        data.error ||
        'Unable to receive stock.'
      );
      return;
    }

    setStockReceivingStatus('success');
    setStockReceivingMessage(
      data.message ||
      'Stock received successfully!'
    );

    setStockReceiving({
      product_id: '',
      supplier_id: '',
      quantity: '',
      supplier_price: '',
      supplier_reference: '',
      selling_price: '',
      receipt_image: '',
      purchase_order_item_id: '',
      purchase_order_id: '',
      purchase_order_number: '',
      purchase_order_remaining_quantity: '',
    });

    setStockReceivingProductQuery('');
    setStockReceivingSupplierQuery('');
    setStockReceivingRequestId(crypto.randomUUID());
    setStockReceivingReceiptInputKey((current) => current + 1);

    await Promise.all([fetchProducts(), fetchInventoryMovements()]);

  } catch (err) {
    console.error(
      'Stock receiving error:',
      err
    );

    setStockReceivingStatus('error');
    setStockReceivingMessage(
      'Unable to connect to the inventory service.'
    );
  }
};

const handlePurchaseOrderReceiveItem = (target: PurchaseOrderReceiveTarget) => {
  setStockReceiving({
    product_id: String(target.product_id),
    supplier_id: String(target.supplier_id),
    quantity: String(target.remaining_quantity),
    supplier_price: Number(target.expected_unit_cost).toFixed(2),
    supplier_reference: '',
    selling_price: Number(target.current_selling_price).toFixed(2),
    receipt_image: '',
    purchase_order_item_id: String(target.purchase_order_item_id),
    purchase_order_id: String(target.purchase_order_id),
    purchase_order_number: target.po_number,
    purchase_order_remaining_quantity: String(target.remaining_quantity),
  });
  setStockReceivingProductQuery(target.product_name);
  setStockReceivingSupplierQuery(target.supplier_name);
  setStockReceivingRequestId(crypto.randomUUID());
  setStockReceivingReceiptInputKey((current) => current + 1);
  setStockReceivingStatus('idle');
  setStockReceivingMessage('');
  setActiveTab('receiveStock');
};

const handleReceiptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    setStockReceiving((current) => ({ ...current, receipt_image: '' }));
    setStockReceivingStatus('error');
    setStockReceivingMessage('Receipt must be a JPG, PNG, or WEBP image.');
    event.target.value = '';
    setStockReceivingReceiptInputKey((current) => current + 1);
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    setStockReceiving((current) => ({ ...current, receipt_image: '' }));
    setStockReceivingStatus('error');
    setStockReceivingMessage('Receipt image must not exceed 5 MB.');
    event.target.value = '';
    setStockReceivingReceiptInputKey((current) => current + 1);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => setStockReceiving((current) => ({
    ...current,
    receipt_image: String(reader.result || ''),
  }));
  reader.readAsDataURL(file);
};

  const fetchCategories = async () => {
  try {
    const res = await fetch('/api/categories');

    if (res.ok) {
      const data = await res.json();
      setCategories(data);
    }
  } catch (err) {
    console.error('Error fetching categories:', err);
  }
};

const fetchAllCategories = async () => {
  const token = localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  try {
    const res = await fetch('/api/categories/admin/all', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401 || res.status === 403) {
      handleAdminSessionExpired();
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));

      console.error(
        'Failed to fetch all categories:',
        data.error || `HTTP ${res.status}`
      );

      return;
    }

    const data = await res.json();
    setAllCategories(data);

  } catch (err) {
    console.error(
      'Error fetching all categories:',
      err
    );
  }
};

const fetchSuppliers = async () => {
  const token = localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  try {
    const res = await fetch('/api/suppliers', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401 || res.status === 403) {
      handleAdminSessionExpired();
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));

      console.error(
        'Failed to fetch suppliers:',
        data.error || `HTTP ${res.status}`
      );

      return;
    }

    const data = await res.json();
    setSuppliers(data);

  } catch (err) {
    console.error(
      'Error fetching suppliers:',
      err
    );
  }
};

const handleStartEditSupplier = (supplier: Supplier) => {
  setEditingSupplier(supplier);

  setEditSupplierData({
    supplier_name: supplier.supplier_name,
    contact_person: supplier.contact_person || '',
    contact_number: supplier.contact_number || '',
    address: supplier.address || '',
    lead_time_days: supplier.lead_time_days === null || supplier.lead_time_days === undefined
      ? ''
      : String(supplier.lead_time_days)
  });
};

const handleUpdateSupplier = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!editingSupplier) {
    return;
  }

  const token = localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  if (!editSupplierData.supplier_name.trim()) {
    setEditSupplierStatus('error');
    setEditSupplierError('Supplier name is required.');
    return;
  }

  try {
    const res = await fetch(
      `/api/suppliers/${editingSupplier.supplier_id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          supplier_name: editSupplierData.supplier_name,
          contact_person: editSupplierData.contact_person,
          contact_number: editSupplierData.contact_number,
          address: editSupplierData.address,
          lead_time_days: editSupplierData.lead_time_days === ''
            ? null
            : Number(editSupplierData.lead_time_days),
        }),
      }
    );

    const data = await res.json().catch(() => ({}));

    if (res.status === 401 || res.status === 403) {
      handleAdminSessionExpired();
      return;
    }

    if (!res.ok) {
      setEditSupplierStatus('error');
      setEditSupplierError(
        data.error || 'Unable to update supplier.'
      );
      return;
    }

    setEditSupplierStatus('success');
    setEditSupplierError('');

    await fetchSuppliers();

    setTimeout(() => {
      setEditSupplierStatus('idle');
      setEditingSupplier(null);
    }, 1500);

  } catch (err) {
    console.error('Error updating supplier:', err);

    setEditSupplierStatus('error');
    setEditSupplierError('Unable to update supplier.');
  }
};

const handleToggleSupplierStatus = async (supplier: Supplier) => {
  const token = localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  const nextStatus: 'Active' | 'Inactive' =
    supplier.status === 'Active'
      ? 'Inactive'
      : 'Active';

  const action =
    nextStatus === 'Inactive'
      ? 'deactivate'
      : 'activate';

  const confirmed = confirm(
    `Are you sure you want to ${action} "${supplier.supplier_name}"?`
  );

  if (!confirmed) {
    return;
  }

  try {
    const res = await fetch(
      `/api/suppliers/${supplier.supplier_id}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      }
    );

    const data = await res.json().catch(() => ({}));

    if (res.status === 401 || res.status === 403) {
      handleAdminSessionExpired();
      return;
    }

    if (!res.ok) {
      alert(
        data.error ||
        `Unable to ${action} supplier.`
      );
      return;
    }

    await fetchSuppliers();

  } catch (err) {
    console.error(
      'Error updating supplier status:',
      err
    );

    alert(
      `Unable to ${action} supplier.`
    );
  }
};

const handleAddSupplier = async (e: React.FormEvent) => {
  e.preventDefault();

  const token = localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  if (!newSupplier.supplier_name.trim()) {
    setSupplierStatus('error');
    setSupplierError('Supplier name is required.');
    return;
  }

  try {
    const res = await fetch('/api/suppliers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        supplier_name: newSupplier.supplier_name,
        contact_person: newSupplier.contact_person,
        contact_number: newSupplier.contact_number,
        address: newSupplier.address,
        lead_time_days: newSupplier.lead_time_days === ''
          ? null
          : Number(newSupplier.lead_time_days),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401 || res.status === 403) {
      handleAdminSessionExpired();
      return;
    }

    if (!res.ok) {
      setSupplierStatus('error');
      setSupplierError(
        data.error || 'Unable to add supplier.'
      );
      return;
    }

    setNewSupplier({
      supplier_name: '',
      contact_person: '',
      contact_number: '',
      address: '',
      lead_time_days: '',
    });

    setSupplierError('');
    setSupplierStatus('success');

    await fetchSuppliers();

    setTimeout(() => {
      setSupplierStatus('idle');
    }, 2000);

  } catch (err) {
    console.error('Error adding supplier:', err);

    setSupplierStatus('error');
    setSupplierError('Unable to add supplier.');
  }
};

const handleStartEditCategory = (category: Category) => {
  setEditingCategory(category);

  setEditCategoryData({
    category_name: category.category_name,
    description: category.description || ''
  });

  setEditCategoryStatus('idle');
  setEditCategoryError('');
};

const handleUpdateCategory = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!editingCategory) {
    return;
  }

  const token = localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  if (!editCategoryData.category_name.trim()) {
    setEditCategoryStatus('error');
    setEditCategoryError('Category name is required.');
    return;
  }

  try {
    const res = await fetch(
      `/api/categories/${editingCategory.category_id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category_name: editCategoryData.category_name,
          description: editCategoryData.description,
        }),
      }
    );

    const data = await res.json().catch(() => ({}));

    if (res.status === 401 || res.status === 403) {
      handleAdminSessionExpired();
      return;
    }

    if (!res.ok) {
      setEditCategoryStatus('error');
      setEditCategoryError(
        data.error || 'Unable to update category.'
      );
      return;
    }

    setEditCategoryStatus('success');
    setEditCategoryError('');

    await fetchAllCategories();
    await fetchCategories();
    await fetchProducts();

    setTimeout(() => {
      setEditCategoryStatus('idle');
      setEditingCategory(null);
    }, 1500);

  } catch (err) {
    console.error('Error updating category:', err);

    setEditCategoryStatus('error');
    setEditCategoryError('Unable to update category.');
  }
};

const handleToggleCategoryStatus = async (category: Category) => {
  const token = localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  const nextStatus: 'Active' | 'Inactive' =
    category.status === 'Active'
      ? 'Inactive'
      : 'Active';

  const action =
    nextStatus === 'Inactive'
      ? 'deactivate'
      : 'activate';

  const confirmed = confirm(
    `Are you sure you want to ${action} "${category.category_name}"?`
  );

  if (!confirmed) {
    return;
  }

  try {
    const res = await fetch(
      `/api/categories/${category.category_id}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      }
    );

    const data = await res.json().catch(() => ({}));

    if (res.status === 401 || res.status === 403) {
      handleAdminSessionExpired();
      return;
    }

    if (!res.ok) {
      alert(
        data.error ||
        `Unable to ${action} category.`
      );
      return;
    }

    await fetchAllCategories();
    await fetchCategories();

  } catch (err) {
    console.error(
      'Error updating category status:',
      err
    );

    alert(
      `Unable to ${action} category.`
    );
  }
};

const handleAddCategory = async (e: React.FormEvent) => {
  e.preventDefault();

  const token = localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  if (!newCategory.category_name.trim()) {
    setCategoryStatus('error');
    setCategoryError('Category name is required.');
    return;
  }

  try {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        category_name: newCategory.category_name,
        description: newCategory.description,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401 || res.status === 403) {
      handleAdminSessionExpired();
      return;
    }

    if (!res.ok) {
      setCategoryStatus('error');
      setCategoryError(
        data.error || 'Unable to add category.'
      );
      return;
    }

    setNewCategory({
      category_name: '',
      description: '',
    });

    setCategoryError('');
    setCategoryStatus('success');

    await fetchAllCategories();
    await fetchCategories();

    setTimeout(() => {
      setCategoryStatus('idle');
    }, 2000);

  } catch (err) {
    console.error('Error adding category:', err);

    setCategoryStatus('error');
    setCategoryError('Unable to add category.');
  }
};


const fetchOrders = async () => {
  const token = localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  try {
    const res = await fetch('/api/orders', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401 || res.status === 403) {
      handleAdminSessionExpired();
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));

      console.error(
        'Unable to fetch Admin orders:',
        data.error || `HTTP ${res.status}`
      );

      return;
    }

    const data = await res.json();
    setOrders(data);

  } catch (err) {
    console.error(
      'Error fetching orders:',
      err
    );
  }
};

const focusUpdatedOrder = (
  orderId: string
) => {
  setRecentlyUpdatedOrderId(
    orderId
  );

  window.setTimeout(() => {
    orderCardRefs.current[
      orderId
    ]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, 150);

  window.setTimeout(() => {
    setRecentlyUpdatedOrderId(
      (current) =>
        current === orderId
          ? null
          : current
    );
  }, 2200);
};

const fetchDeliveryAreas = async () => {
  const token = localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  try {
    const res = await fetch('/api/orders/delivery-areas', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401 || res.status === 403) {
      handleAdminSessionExpired();
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data.municipalities) && data.barangays) {
      setDeliveryAreas(data);
    }
  } catch (err) {
    console.error('Error fetching supported delivery areas:', err);
  }
};

const fetchDeliveryRateSettings = async () => {
  const token = localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  setDeliveryRatesLoading(true);
  setDeliveryRatesMessage(null);

  try {
    const res = await fetch(
      '/api/orders/delivery-rates/admin',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (res.status === 401 || res.status === 403) {
      handleAdminSessionExpired();
      return;
    }

    const data = await res.json().catch(() => []);

    if (!res.ok) {
      setDeliveryRatesMessage({
        type: 'error',
        text:
          data.error ||
          'Unable to load delivery-rate settings.',
      });
      return;
    }

    setDeliveryRateSettings(
      data.map((rate: DeliveryRateSetting) => ({
        ...rate,
        surcharge: Number(rate.surcharge),
        is_active: Boolean(Number(rate.is_active)),
      }))
    );
  } catch (err) {
    console.error(
      'Error fetching delivery-rate settings:',
      err
    );

    setDeliveryRatesMessage({
      type: 'error',
      text: 'Unable to connect to the delivery-rate service.',
    });
  } finally {
    setDeliveryRatesLoading(false);
  }
};

const updateDeliveryRateDraft = (
  rateId: number,
  changes: Partial<DeliveryRateSetting>
) => {
  setDeliveryRateSettings((currentRates) =>
    currentRates.map((rate) =>
      rate.id === rateId
        ? { ...rate, ...changes }
        : rate
    )
  );
};

const handleSaveDeliveryRate = async (
  rate: DeliveryRateSetting
) => {
  const surcharge = Number(rate.surcharge);

  if (
    !Number.isFinite(surcharge) ||
    surcharge < 0 ||
    surcharge > 5000
  ) {
    setDeliveryRatesMessage({
      type: 'error',
      text: 'Surcharge must be from ₱0 to ₱5,000.',
    });
    return;
  }

  const token = localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  setSavingDeliveryRateId(rate.id);
  setDeliveryRatesMessage(null);

  try {
    const res = await fetch(
      `/api/orders/delivery-rates/${rate.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          zone: rate.zone,
          surcharge,
          is_active: rate.is_active,
        }),
      }
    );

    const data = await res.json().catch(() => ({}));

    if (res.status === 401 || res.status === 403) {
      handleAdminSessionExpired();
      return;
    }

    if (!res.ok) {
      setDeliveryRatesMessage({
        type: 'error',
        text:
          data.error ||
          `Unable to update ${rate.barangay}.`,
      });
      return;
    }

    if (data.rate) {
      updateDeliveryRateDraft(rate.id, {
        ...data.rate,
        surcharge: Number(data.rate.surcharge),
        is_active: Boolean(Number(data.rate.is_active)),
      });
    }

    setDeliveryRatesMessage({
      type: 'success',
      text: `${rate.barangay} delivery rate was saved.`,
    });
  } catch (err) {
    console.error('Error saving delivery rate:', err);

    setDeliveryRatesMessage({
      type: 'error',
      text: 'Unable to connect to the delivery-rate service.',
    });
  } finally {
    setSavingDeliveryRateId(null);
  }
};

useEffect(() => {
  if (
    activeTab === 'pos' &&
    posStatus === 'idle'
  ) {
    const focusTimer = window.setTimeout(() => {
      posBarcodeInputRef.current?.focus();
    }, 100);

    return () => {
      window.clearTimeout(focusTimer);
    };
  }
}, [activeTab, posStatus]);

useEffect(() => {
  if (activeTab === 'categories') {
    fetchAllCategories();
  }
}, [activeTab]);

useEffect(() => {
  if (activeTab === 'movementHistory' || activeTab === 'receiveStock') {
    fetchInventoryMovements();
  }
}, [activeTab]);

useEffect(() => {
  if (activeTab === 'sales') {
    fetchSalesHistory();
  }
}, [activeTab]);

useEffect(() => {
  if (activeTab === 'reports') {
    Promise.all([
      fetchManagementOverviewReport(),
      fetchSalesHistory(),
      fetchProducts(),
      fetchSuppliers(),
      fetchInventoryMovements(),
    ]).then(() => setReportGeneratedAt(new Date()));
  }
}, [activeTab]);

useEffect(() => {
  if (activeTab === 'deliveryRates' || activeTab === 'pos') {
    fetchDeliveryAreas();
    fetchDeliveryRateSettings();
  }
}, [activeTab]);

useEffect(() => {
  if (activeTab === 'customers') {
    fetchCustomers();
  }
}, [activeTab]);

useEffect(() => {
  // Load Admin User details
  const userStr = localStorage.getItem('user');
  if (userStr) setUser(JSON.parse(userStr));

  fetchProducts();
  fetchCategories();
  fetchOrders();
  fetchSuppliers();
  fetchInventoryMovements();
  fetchSalesHistory();
}, []);

  // Order status transitions (Pending -> Processing -> Ready -> Completed)
  // Order status transitions:
//
// Pending -> Approved
// Approved -> Processing
// Processing -> Ready
// Ready -> Completed
//
// Awaiting-payment orders cannot be manually advanced
// until payment has been confirmed.
const handleAdvanceOrderStatus = async (
  orderId: string
) => {
  const order = orders.find(
    (o) => o.id === orderId
  );

  if (!order) {
    return;
  }

  if (
    order.status === 'pending' &&
    order.fulfillment === 'shop_go' &&
    !(
      order.scheduled_pickup_date &&
      order.scheduled_pickup_time
    )
  ) {
    alert(
      'Confirm the final Shop & Go pickup schedule before approving this order.'
    );
    return;
  }

  if (
    order.status === 'pending' &&
    order.fulfillment === 'delivery' &&
    (
      order.delivery_fee === null ||
      order.delivery_fee === undefined ||
      !Number.isFinite(Number(order.delivery_fee))
    )
  ) {
    alert(
  'This delivery order does not have a valid system-calculated delivery fee. Please review the delivery-rate configuration before approval.'
);
    return;
  }

  const token =
    localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  let nextStatus:
    | 'approved'
    | 'processing'
    | 'ready'
    | 'out_for_delivery'
    | 'completed';

  if (order.status === 'pending') {
    nextStatus = 'approved';

} else if (order.status === 'approved') {

  if (order.fulfillment === 'pickup') {
    const confirmed = window.confirm(
      `Confirm that the customer is physically present and has presented Order ID ${order.id}.\n\n` +
      'Continue only after the Order ID has been verified. ' +
      'The order will now move to Processing and preparation may begin.'
    );

    if (!confirmed) {
      return;
    }
  }

  nextStatus = 'processing';

} else if (order.status === 'processing') {
    nextStatus = order.fulfillment === 'delivery'
      ? 'out_for_delivery'
      : 'ready';

  } else if (order.status === 'ready') {

  if (order.fulfillment === 'pickup') {
    const paymentMethod =
      order.payment_method ||
      order.paymentMethod ||
      'cash';

    if (paymentMethod === 'cash') {
      const confirmed = window.confirm(
        'Confirm that the customer has paid in cash and received the Standard Pickup order. Completing this order will record the sale and deduct inventory.'
      );

      if (!confirmed) return;

    } else {
      const confirmed = window.confirm(
        'Confirm that the Standard Pickup order has been released to the customer. Completing this order will record the sale and deduct inventory.'
      );

      if (!confirmed) return;
    }
  }

  nextStatus = 'completed';

} else if (
  order.status === 'out_for_delivery'
) {
  nextStatus = 'completed';

  } else if (
    order.status === 'awaiting_payment'
  ) {
    alert(
      'This order is still awaiting payment confirmation and cannot be approved yet.'
    );
    return;

  } else {
    return;
  }

  try {
    const res = await fetch(
      `/api/orders/${orderId}/status`,
      {
        method: 'PUT',

        headers: {
          'Content-Type':
            'application/json',

          Authorization:
            `Bearer ${token}`,
        },

        body: JSON.stringify({
  status: nextStatus,

  ...(order.fulfillment === 'pickup' &&
  order.status === 'approved' &&
  nextStatus === 'processing'
    ? {
        pickupOrderIdVerified: true,
      }
    : {}),
}),
      }
    );

    const data =
      await res
        .json()
        .catch(() => ({}));

    if (
      res.status === 401 ||
      res.status === 403
    ) {
      handleAdminSessionExpired();
      return;
    }

    if (!res.ok) {
      alert(
        data.error ||
        'Failed to update order status.'
      );
      return;
    }

    await fetchOrders();
    focusUpdatedOrder(orderId);

    if (nextStatus === 'completed') {
      await Promise.all([
        fetchProducts(),
        fetchSalesHistory(),
        fetchInventoryMovements(),
      ]);
    }

  } catch (err) {
    console.error(
      'Error updating status:',
      err
    );

    alert(
      'Unable to update the order status.'
    );
  }
};



const handleRejectOrder = async (orderId: string) => {
  const targetOrder =
  orders.find(
    (order) => order.id === orderId
  );

if (
  targetOrder &&
  isPaidOnlineOrder(targetOrder)
) {
  alert(
    PAID_ONLINE_ORDER_LOCK_MESSAGE
  );
  return;
}

  const token = localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  const confirmed = confirm(
    'Are you sure you want to reject this order?'
  );

  if (!confirmed) {
    return;
  }

  try {
    const res = await fetch(
      `/api/orders/${orderId}/status`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'rejected',
        }),
      }
    );

    const data = await res.json().catch(() => ({}));

    if (res.status === 401 || res.status === 403) {
      handleAdminSessionExpired();
      return;
    }

    if (!res.ok) {
      alert(
        data.error || 'Failed to reject order.'
      );
      return;
    }

    await fetchOrders();
    focusUpdatedOrder(orderId);

  } catch (err) {
    console.error(
      'Error rejecting order:',
      err
    );

    alert(
      'Unable to reject the order.'
    );
  }
};

const handleSaveShopGoSchedule = async (
  orderId: string,
  e: React.FormEvent<HTMLFormElement>
) => {
  e.preventDefault();

  const order =
    orders.find(
      (candidate) =>
        candidate.id === orderId
    );

  if (!order) {
    return;
  }

  if (order.status !== 'pending') {
    alert(
      order.status === 'awaiting_payment'
        ? 'The final Shop & Go schedule can be confirmed only after successful payment verification.'
        : 'The confirmed Shop & Go schedule is locked after the order leaves Pending status.'
    );
    return;
  }

  const token =
    localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  const form =
    new FormData(e.currentTarget);

  const scheduledPickupDate =
    String(
      form.get('scheduledPickupDate') || ''
    ).trim();

  const scheduledPickupTime =
    String(
      form.get('scheduledPickupTime') || ''
    ).trim();

  if (
    !scheduledPickupDate ||
    !scheduledPickupTime
  ) {
    alert(
      'Please provide the final Shop & Go pickup date and time.'
    );
    return;
  }

  try {
    const res = await fetch(
      `/api/orders/${orderId}/shop-go-schedule`,
      {
        method: 'PUT',

        headers: {
          'Content-Type':
            'application/json',

          Authorization:
            `Bearer ${token}`,
        },

body: JSON.stringify({
  scheduledPickupDate,
  scheduledPickupTime,
}),
      }
    );

    const data =
      await res
        .json()
        .catch(() => ({}));

    if (
      res.status === 401 ||
      res.status === 403
    ) {
      handleAdminSessionExpired();
      return;
    }

    if (!res.ok) {
      alert(
        data.error ||
        'Unable to save the Shop & Go pickup schedule.'
      );
      return;
    }

    await fetchOrders();

    alert(
      'Shop & Go pickup schedule saved successfully.'
    );

  } catch (err) {
    console.error(
      'Shop & Go schedule error:',
      err
    );

    alert(
      'Unable to save the Shop & Go pickup schedule.'
    );
  }
};

const handleGenerateBarcode = async () => {
  const token = localStorage.getItem('token');
  if (!token) return handleAdminSessionExpired();
  try {
    const response = await fetch('/api/products/generate-barcode', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) return handleAdminSessionExpired();
    if (!response.ok) return alert(data.error || 'Unable to generate a product code.');
    setNewProduct((current) => ({ ...current, barcode: data.barcode }));
  } catch (error) {
    console.error('Product code generation error:', error);
    alert('Unable to connect to the product service.');
  }
};

const handleSaveAdminMessage = async (
  orderId: string,
  message: string
): Promise<boolean> => {
  const cleanMessage = message.trim();

  if (!cleanMessage) {
    alert('Please enter a customer message before updating.');
    return false;
  }

  const token = localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return false;
  }

  try {
    const response = await fetch(
      `/api/orders/${orderId}/admin-message`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adminMessage: cleanMessage,
        }),
      }
    );

    const data = await response
      .json()
      .catch(() => ({}));

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      handleAdminSessionExpired();
      return false;
    }

    if (!response.ok) {
      alert(
        data.error ||
          'Unable to update the message.'
      );
      return false;
    }

    await fetchOrders();

    // Clear only this order's composer after
    // the message has been successfully saved.
    setAdminMessageDrafts((current) => ({
      ...current,
      [orderId]: '',
    }));

    alert(
      data.message ||
        'Message updated successfully.'
    );

    return true;

  } catch (error) {
    console.error(
      'Admin message error:',
      error
    );

    alert(
      'Unable to connect to the order service.'
    );

    return false;
  }
};

const handleOrderAction = async (
  order: Order,
  action: 'failed_delivery' | 'deactivate' | 'reactivate' | 'cancel' | 'cancel_permanently'
) => {

  if (
  (
    action === 'cancel' ||
    action === 'cancel_permanently'
  ) &&
  isPaidOnlineOrder(order)
) {
  alert(
    PAID_ONLINE_ORDER_LOCK_MESSAGE
  );
  return;
}

  const labels = {
    failed_delivery: 'mark this order as Failed Delivery',
    deactivate: 'temporarily deactivate this order',
    reactivate: 'reactivate this order',
    cancel: 'cancel this order',
    cancel_permanently: 'permanently cancel this order',
  };
  if (!confirm(`Are you sure you want to ${labels[action]}?`)) return;
  const reason = action === 'reactivate'
    ? prompt('Optional reactivation note:', '') || ''
    : prompt('Enter the Admin reason that the customer will see:', '') || '';
  if (action !== 'reactivate' && !reason.trim()) {
    alert('An Admin reason is required.');
    return;
  }
  const token = localStorage.getItem('token');
  if (!token) return handleAdminSessionExpired();
  try {
    const response = await fetch(`/api/orders/${order.id}/action`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, reason }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) return handleAdminSessionExpired();
    if (!response.ok) return alert(data.error || 'Unable to update the order.');
    alert(data.message || 'Order updated successfully.');
    await fetchOrders();
    focusUpdatedOrder(order.id);
  } catch (error) {
    console.error('Order action error:', error);
    alert('Unable to connect to the order service.');
  }
};

const handleAddDeliveryRate = async () => {
  const surcharge = Number(newDeliveryRate.surcharge);

  if (!newDeliveryRate.municipality || !newDeliveryRate.barangay) {
    setDeliveryRatesMessage({
      type: 'error',
      text: 'Select a municipality and barangay.',
    });
    return;
  }

  if (!newDeliveryRate.zone) {
    setDeliveryRatesMessage({
      type: 'error',
      text: 'Select a delivery zone.',
    });
    return;
  }

  if (
    newDeliveryRate.surcharge.trim() === '' ||
    !Number.isFinite(surcharge) ||
    surcharge < 0 ||
    surcharge > 5000
  ) {
    setDeliveryRatesMessage({
      type: 'error',
      text: 'Enter the client-approved surcharge from ₱0 to ₱5,000.',
    });
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) return handleAdminSessionExpired();

  setAddingDeliveryRate(true);
  setDeliveryRatesMessage(null);

  try {
    const res = await fetch('/api/orders/delivery-rates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        municipality: newDeliveryRate.municipality,
        barangay: newDeliveryRate.barangay,
        zone: newDeliveryRate.zone,
        surcharge,
        is_active: newDeliveryRate.is_active,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401 || res.status === 403) {
      handleAdminSessionExpired();
      return;
    }

    if (!res.ok) {
      setDeliveryRatesMessage({
        type: 'error',
        text: data.error || 'Unable to add the delivery area.',
      });
      return;
    }

    setNewDeliveryRate({
      municipality: '',
      barangay: '',
      zone: '',
      surcharge: '',
      is_active: false,
    });
    setDeliveryRatesMessage({
      type: 'success',
      text: data.message || 'Delivery area added successfully.',
    });
    await fetchDeliveryRateSettings();
  } catch (err) {
    console.error('Error adding delivery rate:', err);
    setDeliveryRatesMessage({
      type: 'error',
      text: 'Unable to connect to the delivery-rate service.',
    });
  } finally {
    setAddingDeliveryRate(false);
  }
};

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpeningReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setNewProduct((current) => ({ ...current, opening_receipt_image: '' }));
      alert('Opening supplier receipt must be a JPG, PNG, or WEBP image.');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setNewProduct((current) => ({ ...current, opening_receipt_image: '' }));
      alert('Opening supplier receipt must not exceed 5 MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewProduct((current) => ({
        ...current,
        opening_receipt_image: String(reader.result || ''),
      }));
    };
    reader.readAsDataURL(file);
  };

  const renderProductImage = (image: string, category: string, imgClass = "w-8 h-8 object-contain rounded-lg", spanClass = "text-3xl") => {
    if (image && (image.startsWith('/') || image.startsWith('http') || image.startsWith('data:'))) {
      return <img src={image} alt="" className={imgClass} />;
    }
    const emojiMap: Record<string, string> = {
      'Construction': '🧱',
      'Paint': '🎨',
      'Plumbing': '🚰',
      'Fasteners': '🔩',
      'Tools': '🔧',
      'Electrical': '💡'
    };
    return <span className={`${spanClass} select-none`}>{image && !image.startsWith('data:') && !image.startsWith('/') && !image.startsWith('http') ? image : (emojiMap[category] || '📦')}</span>;
  };

  // Add or Update dynamic product
  const handleSaveProduct = async (e: React.FormEvent) => {
  e.preventDefault();

  const token = localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  if (
  !newProduct.name.trim() ||
  !newProduct.unit.trim() ||
  !newProduct.price ||
  newProduct.stock.trim() === '' ||
  newProduct.reorder_level.trim() === ''
) {
  alert(
    'Product name, unit of measurement, selling price, stock quantity, and reorder level are required.'
  );
  return;
}

const reorderLevel = Number(
  newProduct.reorder_level
);

if (
  !Number.isInteger(reorderLevel) ||
  reorderLevel < 0 ||
  reorderLevel > 100000
) {
  alert(
    'Reorder level must be a whole number from 0 to 100,000.'
  );
  return;
}

  if (
    !editingProduct &&
    Number(newProduct.stock) > 0 &&
    Number(newProduct.opening_supplier_price) <= 0
  ) {
    alert('Enter the opening supplier cost for the opening stock.');
    return;
  }

  if (
    !editingProduct &&
    newProduct.opening_supplier_reference.trim().length > 120
  ) {
    alert('Supplier reference number must not exceed 120 characters.');
    return;
  }

  if (newProduct.bulk_quantity_threshold) {
    const threshold = Number(
      newProduct.bulk_quantity_threshold
    );

    if (
      !Number.isInteger(threshold) ||
      threshold < 1 ||
      threshold > 100000
    ) {
      alert(
        'Bulk quantity threshold must be a whole number from 1 to 100,000.'
      );
      return;
    }
  }

  try {
    const isEditing = editingProduct !== null;

    const url = isEditing
      ? `/api/products/${editingProduct.id}`
      : '/api/products';

    const method = isEditing
      ? 'PUT'
      : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
  name: newProduct.name.trim(),

  description:
    newProduct.description.trim() || null,

  unit:
    newProduct.unit.trim(),

  barcode:
    newProduct.barcode.trim() || null,

  price:
    parseFloat(newProduct.price),

  category:
    newProduct.category,

  supplier_id:
    newProduct.supplier_id
      ? Number(newProduct.supplier_id)
      : null,

  image:
    newProduct.image,

  stock:
    parseInt(newProduct.stock, 10),

  reorder_level:
    Number(newProduct.reorder_level),

  brand:
    newProduct.brand || 'Generic',

  status:
    newProduct.status || 'active',

  delivery_class:
    newProduct.delivery_class,

  bulk_quantity_threshold:
    newProduct.delivery_class === 'bulky' ||
    !newProduct.bulk_quantity_threshold
      ? null
      : Number(
          newProduct.bulk_quantity_threshold
        ),

  fulfillment_rule:
    newProduct.fulfillment_rule,

  opening_supplier_price:
    newProduct.opening_supplier_price
      ? Number(
          newProduct.opening_supplier_price
        )
      : null,

  opening_supplier_reference:
    !isEditing && Number(newProduct.stock) > 0
      ? newProduct.opening_supplier_reference.trim() || null
      : null,

  opening_receipt_image:
    !isEditing && Number(newProduct.stock) > 0
      ? newProduct.opening_receipt_image || null
      : null,
}),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401 || res.status === 403) {
      handleAdminSessionExpired();
      return;
    }

    if (!res.ok) {
      console.error(
        'Product save failed:',
        data
      );

      alert(
        data.error || 'Unable to save product.'
      );

      return;
    }

    await fetchProducts();

setNewProduct({
  name: '',
  description: '',
  unit: '',
  barcode: '',
  price: '',
  category: '',
  supplier_id: '',
  image: '🛠️',
  stock: '',
  reorder_level: '10',
  brand: '',
  status: 'active',
  delivery_class: 'standard',
  bulk_quantity_threshold: '',
  fulfillment_rule: 'all',
  opening_supplier_price: '',
  opening_supplier_reference: '',
  opening_receipt_image: '',
});

    setEditingProduct(null);
    setProductStatus('success');

    setTimeout(() => {
      setProductStatus('idle');
    }, 2000);

  } catch (err) {
    console.error(
      'Error saving product:',
      err
    );

    alert(
      'Unable to save product.'
    );
  }
};

  // Activate/deactivate product without deleting transaction history.
const handleToggleProductStatus = async (product: Product) => {
  const currentStatus =
    (product.status || 'active').toLowerCase() === 'inactive'
      ? 'inactive'
      : 'active';

  const nextStatus: 'active' | 'inactive' =
    currentStatus === 'active'
      ? 'inactive'
      : 'active';

  const action =
    nextStatus === 'inactive'
      ? 'deactivate'
      : 'activate';

  const confirmed = confirm(
    `Are you sure you want to ${action} "${product.name}"?`
  );

  if (!confirmed) {
    return;
  }

  const token = localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  try {
    const res = await fetch(
      `/api/products/${product.id}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      }
    );

    const data = await res.json().catch(() => ({}));

    if (res.status === 401 || res.status === 403) {
      handleAdminSessionExpired();
      return;
    }

    if (!res.ok) {
      alert(
        data.error ||
          `Unable to ${action} product.`
      );
      return;
    }

    // If a product is deactivated while it is already in the current
    // POS cart, remove it immediately so it cannot be sold by mistake.
    if (nextStatus === 'inactive') {
      setPosCart((currentCart) =>
        currentCart.filter(
          (item) => item.product.id !== product.id
        )
      );
    }

    await fetchProducts();

  } catch (err) {
    console.error(
      'Error updating product status:',
      err
    );

    alert(
      `Unable to ${action} product.`
    );
  }
};

  // POS operations
  const handleAddToPosCart = (
  product: Product
) => {
  if (
    (product.status || 'active').toLowerCase() !== 'active' ||
    product.stock <= 0
  ) {
    return false;
  }

  const existing = posCart.find(
    (item) =>
      item.product.id === product.id
  );

  if (existing) {
    if (
      existing.quantity >= product.stock
    ) {
      return false;
    }

    setPosCart(
      posCart.map((item) =>
        item.product.id === product.id
          ? {
              ...item,
              quantity:
                item.quantity + 1,
            }
          : item
      )
    );

  } else {
    setPosCart([
      ...posCart,
      {
        product,
        quantity: 1,
      },
    ]);
  }

  return true;
};

const handlePosBarcodeScan = (
  e: React.FormEvent
) => {
  e.preventDefault();

  const barcode =
    posBarcodeInput.trim();

  if (!barcode) {
    setPosBarcodeStatus('error');

    setPosBarcodeMessage(
      'Please scan or enter a barcode.'
    );

    posBarcodeInputRef.current?.focus();
    return;
  }

  const product = products.find(
    (item) =>
      item.barcode?.trim() === barcode
  );

  if (!product) {
    setPosBarcodeStatus('error');

    setPosBarcodeMessage(
      `No product found for barcode: ${barcode}`
    );

    setPosBarcodeInput('');

    window.setTimeout(() => {
      posBarcodeInputRef.current?.focus();
    }, 0);

    return;
  }

  if (
    (product.status || 'active').toLowerCase() !== 'active'
  ) {
    setPosBarcodeStatus('error');

    setPosBarcodeMessage(
      `${product.name} is inactive and cannot be added to a new POS sale.`
    );

    setPosBarcodeInput('');

    window.setTimeout(() => {
      posBarcodeInputRef.current?.focus();
    }, 0);

    return;
  }

  if (product.stock <= 0) {
    setPosBarcodeStatus('error');

    setPosBarcodeMessage(
      `${product.name} is out of stock.`
    );

    setPosBarcodeInput('');

    window.setTimeout(() => {
      posBarcodeInputRef.current?.focus();
    }, 0);

    return;
  }

  const added =
    handleAddToPosCart(product);

  if (!added) {
    setPosBarcodeStatus('error');

    setPosBarcodeMessage(
      `Cannot add more ${product.name}. Cart quantity has reached the available stock of ${product.stock}.`
    );

    setPosBarcodeInput('');

    window.setTimeout(() => {
      posBarcodeInputRef.current?.focus();
    }, 0);

    return;
  }

  setPosBarcodeStatus('success');

  setPosBarcodeMessage(
    `${product.name} added to the POS cart.`
  );

  setPosBarcodeInput('');

  window.setTimeout(() => {
    posBarcodeInputRef.current?.focus();
  }, 0);
};

  const handleUpdatePosQty = (
  productId: number,
  amount: number
) => {
  setPosCart((currentCart) => {
    const existing = currentCart.find(
      (item) =>
        item.product.id === productId
    );

    if (!existing) {
      return currentCart;
    }

    const newQty =
      existing.quantity + amount;

    // Keep the current minus-button behavior:
    // decreasing 1 to 0 removes the item.
    if (newQty <= 0) {
      return currentCart.filter(
        (item) =>
          item.product.id !== productId
      );
    }

    // Never allow POS quantity to exceed
    // the product's current available stock.
    if (
      newQty >
      Number(existing.product.stock)
    ) {
      return currentCart;
    }

    return currentCart.map(
      (item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity: newQty,
            }
          : item
    );
  });
};

const handleSetPosQty = (
  productId: number,
  value: string
) => {
  const parsedQty =
    Number(value);

  // Reject blank, invalid, decimal,
  // zero, and negative quantities.
  if (
    !Number.isFinite(parsedQty) ||
    !Number.isInteger(parsedQty) ||
    parsedQty < 1
  ) {
    return;
  }

  setPosCart((currentCart) =>
    currentCart.map((item) => {
      if (
        item.product.id !==
        productId
      ) {
        return item;
      }

      const availableStock =
        Number(item.product.stock);

      // Clamp manually entered quantity
      // to current available stock.
      const validQty =
        Math.min(
          parsedQty,
          availableStock
        );

      return {
        ...item,
        quantity: validQty,
      };
    })
  );
};

  const handlePrintOrderSlip = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=900,height=760');

    if (!printWindow) {
      alert('The print window was blocked by the browser. Please allow pop-ups for this site and try again.');
      return;
    }

    printWindow.opener = null;

    const fulfillmentLabel =
      order.fulfillment === 'shop_go'
        ? 'Shop & Go'
        : order.fulfillment === 'delivery'
          ? 'Delivery'
          : 'Pickup';

    const statusLabel =
      order.status === 'ready'
        ? 'Ready for Pickup'
        : order.status === 'awaiting_payment'
          ? 'Awaiting Payment'
          : order.status === 'out_for_delivery'
            ? 'Out for Delivery'
            : order.status === 'failed_delivery'
              ? 'Failed Delivery'
              : order.status.split('_').join(' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

    const rawPaymentStatus = String(order.payment_status || 'Pending');
    const paymentStatusLabel =
      rawPaymentStatus.toLowerCase() === 'pending'
        ? 'Pending / Not Paid'
        : rawPaymentStatus;

    const customerName = [order.customer_first_name, order.customer_last_name]
      .filter(Boolean)
      .join(' ') || 'Customer information unavailable';

    const orderDate = order.created_at
      ? new Date(order.created_at).toLocaleString('en-PH', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : 'Unavailable';

    const itemRows = order.items
      .map((item) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.order_item_price ?? item.product.price ?? 0);
        const subtotal = Number(item.order_item_subtotal ?? quantity * unitPrice);

        return `
          <tr>
            <td>${escapeReportHtml(item.product.name)}</td>
            <td class="center">${quantity}</td>
            <td class="right">${formatPeso(unitPrice)}</td>
            <td class="right">${formatPeso(subtotal)}</td>
          </tr>
        `;
      })
      .join('');

    const serviceFee = Number(order.service_fee || 0);
    const deliveryFee = Number(order.delivery_fee || 0);
    const discountAmount = Number(order.discount_amount || 0);
    const originalSubtotal = Number(
      order.original_subtotal ?? (Number(order.total || 0) + discountAmount)
    );
    const grandTotal = Number(order.total || 0) + serviceFee + deliveryFee;

    const shopGoSection =
      order.fulfillment === 'shop_go'
        ? `
          <div class="section">
            <div class="section-title">Shop &amp; Go Pickup Information</div>
            <div class="detail-grid">
              <div>
                <div class="label">Requested Pickup</div>
                <div class="value">${escapeReportHtml(
                  [order.requested_pickup_date, order.requested_pickup_time]
                    .filter(Boolean)
                    .join(' · ') || 'Not specified'
                )}</div>
              </div>
              <div>
                <div class="label">Confirmed Pickup</div>
                <div class="value">${escapeReportHtml(
                  [order.scheduled_pickup_date, order.scheduled_pickup_time]
                    .filter(Boolean)
                    .join(' · ') || 'Not yet confirmed'
                )}</div>
              </div>
            </div>
          </div>
        `
        : '';

    const deliverySection =
      order.fulfillment === 'delivery'
        ? `
          <div class="section">
            <div class="section-title">Delivery Information</div>
            <div class="detail-grid">
              <div>
                <div class="label">Contact Person</div>
                <div class="value">${escapeReportHtml(order.delivery_contact_person || customerName)}</div>
              </div>
              <div>
                <div class="label">Contact Number</div>
                <div class="value">${escapeReportHtml(order.delivery_contact_number || order.customer_phone_number || 'Not provided')}</div>
              </div>
              <div>
                <div class="label">Municipality</div>
                <div class="value">${escapeReportHtml(order.delivery_municipality || 'Initao')}</div>
              </div>
              <div>
                <div class="label">Barangay</div>
                <div class="value">${escapeReportHtml(order.delivery_barangay || 'Not provided')}</div>
              </div>
              <div>
                <div class="label">Load Class</div>
                <div class="value">${escapeReportHtml(order.delivery_load_class || 'Not available')}</div>
              </div>
              <div class="detail-full">
                <div class="label">Delivery Address</div>
                <div class="value">${escapeReportHtml(order.delivery_address || 'Not provided')}</div>
              </div>
              <div class="detail-full">
                <div class="label">Landmark / Instructions</div>
                <div class="value">${escapeReportHtml(
                  [order.delivery_landmark, order.delivery_instructions]
                    .filter(Boolean)
                    .join(' · ') || 'None provided'
                )}</div>
              </div>
            </div>
          </div>
        `
        : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Rayjin Hardware Order Slip - ${escapeReportHtml(order.id)}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 30px; font-family: Arial, Helvetica, sans-serif; color: #1f2937; background: #fff; }
            .slip { max-width: 820px; margin: 0 auto; border: 1px solid #d1d5db; padding: 28px; }
            .header { text-align: center; border-bottom: 2px solid #1f513a; padding-bottom: 18px; margin-bottom: 22px; }
            .header h1 { margin: 0; font-size: 24px; color: #1f513a; }
            .header h2 { margin: 6px 0 0; font-size: 16px; letter-spacing: 1px; }
            .status-row { margin-top: 12px; display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; }
            .badge { display: inline-block; border: 1px solid #b7c8be; border-radius: 999px; padding: 5px 10px; font-size: 11px; font-weight: 700; }
            .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 24px; margin-bottom: 20px; font-size: 13px; }
            .section { margin-top: 20px; }
            .section-title { font-size: 13px; font-weight: bold; text-transform: uppercase; color: #1f513a; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; margin-bottom: 10px; }
            .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; font-size: 13px; }
            .detail-full { grid-column: 1 / -1; }
            .label { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
            .value { margin-top: 2px; font-weight: 600; white-space: pre-wrap; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 9px 7px; text-align: left; }
            th { background: #f3f7f4; color: #1f513a; font-size: 10px; text-transform: uppercase; }
            .center { text-align: center; }
            .right { text-align: right; }
            .summary { width: 340px; margin-left: auto; margin-top: 18px; }
            .summary-row { display: flex; justify-content: space-between; gap: 20px; padding: 5px 0; font-size: 13px; }
            .total { margin-top: 5px; padding-top: 9px; border-top: 2px solid #1f513a; font-size: 16px; }
            .note { border: 1px solid #dbe7df; background: #f7faf8; border-radius: 8px; padding: 12px; font-size: 12px; line-height: 1.5; white-space: pre-wrap; }
            .footer { margin-top: 34px; border-top: 1px solid #d1d5db; padding-top: 12px; text-align: center; font-size: 10px; color: #6b7280; }
            @media print { body { padding: 0; } .slip { border: none; max-width: none; } }
          </style>
        </head>
        <body>
          <div class="slip">
            <div class="header">
              <h1>RAYJIN HARDWARE</h1>
              <h2>ORDER / FULFILLMENT SLIP</h2>
              <div class="status-row">
                <span class="badge">Order Status: ${escapeReportHtml(statusLabel)}</span>
                <span class="badge">Payment: ${escapeReportHtml(paymentStatusLabel)}</span>
                <span class="badge">${escapeReportHtml(fulfillmentLabel)}</span>
              </div>
            </div>

            <div class="meta">
              <div><div class="label">Order Reference</div><div class="value">${escapeReportHtml(order.id)}</div></div>
              <div><div class="label">Order Date</div><div class="value">${escapeReportHtml(orderDate)}</div></div>
              <div><div class="label">Customer Name</div><div class="value">${escapeReportHtml(customerName)}</div></div>
              <div><div class="label">Customer Contact</div><div class="value">${escapeReportHtml(order.customer_phone_number || 'Not provided')}</div></div>
              <div><div class="label">Email</div><div class="value">${escapeReportHtml(order.customer_email || 'Not provided')}</div></div>
              <div><div class="label">Payment Method</div><div class="value">${escapeReportHtml(formatPaymentMethod(order.payment_method || order.paymentMethod || 'cash'))}</div></div>
            </div>

            ${shopGoSection}
            ${deliverySection}

            <div class="section">
              <div class="section-title">Ordered Products</div>
              <table>
                <thead><tr><th>Product</th><th class="center">Qty</th><th class="right">Unit Price</th><th class="right">Subtotal</th></tr></thead>
                <tbody>${itemRows}</tbody>
              </table>
            </div>

            <div class="summary">
              ${discountAmount > 0 ? `<div class="summary-row"><span>Original Product Subtotal</span><strong>${formatPeso(originalSubtotal)}</strong></div>` : ''}
              ${discountAmount > 0 ? `<div class="summary-row"><span>First-Order Discount (20%)</span><strong>-${formatPeso(discountAmount)}</strong></div>` : ''}
              <div class="summary-row"><span>Product Subtotal</span><strong>${formatPeso(Number(order.total || 0))}</strong></div>
              ${serviceFee > 0 ? `<div class="summary-row"><span>Shop & Go Service Fee</span><strong>${formatPeso(serviceFee)}</strong></div>` : ''}
              ${deliveryFee > 0 || order.fulfillment === 'delivery' ? `<div class="summary-row"><span>Delivery Fee</span><strong>${formatPeso(deliveryFee)}</strong></div>` : ''}
              <div class="summary-row total"><span>Total Amount</span><strong>${formatPeso(grandTotal)}</strong></div>
            </div>

            <div class="footer">
              Generated from Rayjin Hardware Admin Fulfillment Center. Status and payment information reflect the order record at the time this slip was printed.
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    window.setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handlePrintPosDeliverySlip = (
  receipt: PosDeliveryReceipt | null =
    lastPosDeliveryReceipt
) => {
  if (!receipt) {
    alert('No completed POS delivery is available to print.');
    return;
  }

  const printWindow = window.open(
    '',
    '_blank',
    'width=900,height=700'
  );

  if (!printWindow) {
    alert(
      'The print window was blocked by the browser. Please allow pop-ups for this site and try again.'
    );
    return;
  }

  printWindow.opener = null;

  const itemRows = receipt.items
    .map(
      (item) => `
        <tr>
          <td>${escapeReportHtml(item.name)}</td>
          <td class="center">${item.quantity}</td>
          <td class="right">${formatPeso(item.unitPrice)}</td>
          <td class="right">${formatPeso(item.subtotal)}</td>
        </tr>
      `
    )
    .join('');

  const landmark =
    receipt.landmark.trim() || '—';

  const paymentLabel =
    receipt.paymentMethod === 'cash'
      ? 'Cash'
      : 'Card';

  const cashSection =
    receipt.paymentMethod === 'cash'
      ? `
        <div class="summary-row">
          <span>Cash Received</span>
          <strong>${formatPeso(
            receipt.cashReceived ?? 0
          )}</strong>
        </div>

        <div class="summary-row">
          <span>Change</span>
          <strong>${formatPeso(
            receipt.changeAmount ?? 0
          )}</strong>
        </div>
      `
      : '';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />

        <title>
          Rayjin Hardware Delivery Slip - Sale #${receipt.saleId}
        </title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 30px;
            font-family: Arial, Helvetica, sans-serif;
            color: #1f2937;
            background: #ffffff;
          }

          .slip {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #d1d5db;
            padding: 28px;
          }

          .header {
            text-align: center;
            border-bottom: 2px solid #1f513a;
            padding-bottom: 18px;
            margin-bottom: 22px;
          }

          .header h1 {
            margin: 0;
            font-size: 24px;
            color: #1f513a;
          }

          .header h2 {
            margin: 6px 0 0;
            font-size: 16px;
            letter-spacing: 1px;
          }

          .meta {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 22px;
            font-size: 13px;
          }

          .section {
            margin-top: 20px;
          }

          .section-title {
            font-size: 13px;
            font-weight: bold;
            text-transform: uppercase;
            color: #1f513a;
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 6px;
            margin-bottom: 10px;
          }

          .detail-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 24px;
            font-size: 13px;
          }

          .detail-full {
            grid-column: 1 / -1;
          }

          .label {
            color: #6b7280;
            font-size: 11px;
            text-transform: uppercase;
          }

          .value {
            margin-top: 2px;
            font-weight: 600;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 12px;
          }

          th,
          td {
            border-bottom: 1px solid #e5e7eb;
            padding: 9px 7px;
            text-align: left;
          }

          th {
            background: #f3f7f4;
            color: #1f513a;
            font-size: 11px;
            text-transform: uppercase;
          }

          .center {
            text-align: center;
          }

          .right {
            text-align: right;
          }

          .summary {
            width: 320px;
            margin-left: auto;
            margin-top: 18px;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            padding: 5px 0;
            font-size: 13px;
          }

          .total {
            margin-top: 5px;
            padding-top: 9px;
            border-top: 2px solid #1f513a;
            font-size: 16px;
          }

          .footer {
            margin-top: 35px;
            border-top: 1px solid #d1d5db;
            padding-top: 12px;
            text-align: center;
            font-size: 10px;
            color: #6b7280;
          }

          @media print {
            body {
              padding: 0;
            }

            .slip {
              border: none;
              max-width: none;
            }
          }
        </style>
      </head>

      <body>
        <div class="slip">

          <div class="header">
            <h1>RAYJIN HARDWARE</h1>
            <h2>POS DELIVERY SLIP</h2>
          </div>

          <div class="meta">
            <div>
              <div class="label">Sale Reference</div>
              <div class="value">
                POS-${receipt.saleId}
              </div>
            </div>

            <div>
              <div class="label">Date / Time</div>
              <div class="value">
                ${escapeReportHtml(
                  new Date(
                    receipt.saleDate
                  ).toLocaleString('en-PH')
                )}
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">
              Delivery Information
            </div>

            <div class="detail-grid">

              <div>
                <div class="label">Customer Name</div>
                <div class="value">
                  ${escapeReportHtml(
                    receipt.customerName
                  )}
                </div>
              </div>

              <div>
                <div class="label">Contact Person</div>
                <div class="value">
                  ${escapeReportHtml(
                    receipt.contactPerson
                  )}
                </div>
              </div>

              <div>
                <div class="label">Contact Number</div>
                <div class="value">
                  ${escapeReportHtml(
                    receipt.contactNumber
                  )}
                </div>
              </div>

              <div>
                <div class="label">Municipality</div>
                <div class="value">
                  ${escapeReportHtml(
                    receipt.municipality
                  )}
                </div>
              </div>

              <div>
                <div class="label">Barangay</div>
                <div class="value">
                  ${escapeReportHtml(
                    receipt.barangay
                  )}
                </div>
              </div>

              <div class="detail-full">
                <div class="label">
                  Complete Delivery Address
                </div>

                <div class="value">
                  ${escapeReportHtml(
                    receipt.address
                  )}
                </div>
              </div>

              <div class="detail-full">
                <div class="label">Landmark</div>
                <div class="value">
                  ${escapeReportHtml(landmark)}
                </div>
              </div>

            </div>
          </div>

          <div class="section">
            <div class="section-title">
              Purchased Items
            </div>

            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th class="center">Qty</th>
                  <th class="right">Unit Price</th>
                  <th class="right">Subtotal</th>
                </tr>
              </thead>

              <tbody>
                ${itemRows}
              </tbody>
            </table>
          </div>

          <div class="summary">

            <div class="summary-row">
              <span>Product Subtotal</span>
              <strong>
                ${formatPeso(
                  receipt.productSubtotal
                )}
              </strong>
            </div>

            <div class="summary-row">
              <span>Delivery Fee</span>
              <strong>
                ${formatPeso(
                  receipt.deliveryFee
                )}
              </strong>
            </div>

            <div class="summary-row total">
              <span>Total</span>
              <strong>
                ${formatPeso(receipt.total)}
              </strong>
            </div>

            <div class="summary-row">
              <span>Payment Method</span>
              <strong>${paymentLabel}</strong>
            </div>

            ${cashSection}

          </div>

          <div class="footer">
            Generated from Rayjin Hardware POS / New Sale.
            This delivery slip corresponds to a successfully
            recorded POS transaction.
          </div>

        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 250);
};

const handleCheckoutPOS = async (
  e: React.FormEvent
) => {
  e.preventDefault();

  if (posSubmitting) {
    return;
  }

  if (posCart.length === 0) {
    return;
  }

  const token =
    localStorage.getItem('token');

  if (!token) {
    handleAdminSessionExpired();
    return;
  }

  const productSubtotal = posCart.reduce(
    (sum, item) =>
      sum +
      Number(item.product.price) *
        item.quantity,
    0
  );
  const deliveryFee = posFulfillment === 'delivery'
    ? Number(posDeliveryDetails.delivery_fee)
    : 0;

  if (posCartRequiresDelivery && posFulfillment !== 'delivery') {
    alert('This POS cart contains a Delivery-only product. Use Deliver Out to continue.');
    setPosFulfillment('delivery');
    return;
  }

  if (posFulfillment === 'delivery') {
    if (
      !posDeliveryDetails.customer_name.trim() ||
      !posDeliveryDetails.contact_person.trim() ||
      !posDeliveryDetails.contact_number.trim() ||
      !posDeliveryDetails.municipality ||
      !posDeliveryDetails.barangay ||
      !posDeliveryDetails.address.trim()
    ) {
      alert('Complete all required Deliver Out customer and address fields.');
      return;
    }
    if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
      alert('Enter a valid final delivery fee.');
      return;
    }
  }

  const total = productSubtotal + deliveryFee;

  let normalizedCashReceived:
    number | null = null;

  // -----------------------------------
  // Validate payment
  // -----------------------------------

  if (posPaymentMethod === 'cash') {
    if (!posCashReceived.trim()) {
      alert(
        'Please enter the cash received from the customer.'
      );
      return;
    }

    const cash =
      Number(posCashReceived);

    if (
      !Number.isFinite(cash) ||
      cash < 0
    ) {
      alert(
        'Please enter a valid cash amount.'
      );
      return;
    }

    if (cash < total) {
      alert(
        `Insufficient cash received.\n\n` +
        `Total Bill: ₱${total.toFixed(2)}\n` +
        `Cash Received: ₱${cash.toFixed(2)}`
      );
      return;
    }

    normalizedCashReceived =
      Number(cash.toFixed(2));
  }

  if (
    posPaymentMethod === 'card' &&
    !posCardPaymentConfirmed
  ) {
    alert(
      'Please confirm that the external card payment was successfully processed.'
    );
    return;
  }

  // -----------------------------------
  // Preserve current retry protection
  // -----------------------------------

  const cartSnapshot =
    posCart.map((item) => ({
      product: item.product,
      quantity: item.quantity,
    }));

  const cartSignature =
    cartSnapshot
      .map(
        (item) =>
          `${item.product.id}:${item.quantity}`
      )
      .sort()
      .join('|') + `|${posFulfillment}|${deliveryFee}|${posDeliveryDetails.contact_number}|${posDeliveryDetails.municipality}|${posDeliveryDetails.barangay}`;

  const pendingRequestKey =
    'rayjin_pos_pending_request';

  let savedPendingRequest: {
    id: string;
    signature: string;
  } | null = null;

  try {
    const saved =
      sessionStorage.getItem(
        pendingRequestKey
      );

    if (saved) {
      savedPendingRequest =
        JSON.parse(saved);
    }

  } catch {
    sessionStorage.removeItem(
      pendingRequestKey
    );
  }

  let posRequestId: string;

  if (
    savedPendingRequest &&
    savedPendingRequest.signature ===
      cartSignature
  ) {
    posRequestId =
      savedPendingRequest.id;

  } else {
    posRequestId =
      crypto.randomUUID();

    sessionStorage.setItem(
      pendingRequestKey,
      JSON.stringify({
        id: posRequestId,
        signature: cartSignature,
      })
    );
  }

  setPosSubmitting(true);

  try {
    const response = await fetch(
      '/api/sales/pos',
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',

          Authorization:
            `Bearer ${token}`,
        },

        body: JSON.stringify({
          items: cartSnapshot,
          posRequestId,

          paymentMethod:
            posPaymentMethod,

          cashReceived:
            posPaymentMethod === 'cash'
              ? normalizedCashReceived
              : null,

          cardPaymentConfirmed:
            posPaymentMethod === 'card'
              ? posCardPaymentConfirmed
              : false,
          fulfillment: posFulfillment,
          deliveryFee,
          customerName: posDeliveryDetails.customer_name,
          deliveryContactPerson: posDeliveryDetails.contact_person,
          deliveryContactNumber: posDeliveryDetails.contact_number,
          deliveryMunicipality: posDeliveryDetails.municipality,
          deliveryBarangay: posDeliveryDetails.barangay,
          deliveryAddress: posDeliveryDetails.address,
          deliveryLandmark: posDeliveryDetails.landmark,
        }),
      }
    );

    const data =
      await response
        .json()
        .catch(() => ({}));

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      setPosStatus('idle');

      handleAdminSessionExpired();
      return;
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        'POS transaction could not be completed.'
      );
    }

    // Backend confirmed the sale.
    // Preserve the completed Deliver Out transaction
// before clearing the POS form so it can be printed.
if (posFulfillment === 'delivery') {
  const completedDeliveryReceipt: PosDeliveryReceipt = {
    saleId: Number(data.saleId),

    saleDate: new Date().toISOString(),

    items: cartSnapshot.map((item) => {
      const unitPrice =
        Number(item.product.price);

      return {
        name: item.product.name,
        quantity: item.quantity,
        unitPrice,
        subtotal:
          unitPrice * item.quantity,
      };
    }),

    productSubtotal,
    deliveryFee,
    total,

    customerName:
      posDeliveryDetails.customer_name.trim(),

    contactPerson:
      posDeliveryDetails.contact_person.trim(),

    contactNumber:
      posDeliveryDetails.contact_number.trim(),

    municipality:
      posDeliveryDetails.municipality,

    barangay:
      posDeliveryDetails.barangay,

    address:
      posDeliveryDetails.address.trim(),

    landmark:
      posDeliveryDetails.landmark.trim(),

    paymentMethod:
      posPaymentMethod,

    cashReceived:
      posPaymentMethod === 'cash'
        ? normalizedCashReceived
        : null,

    changeAmount:
      posPaymentMethod === 'cash' &&
      normalizedCashReceived !== null
        ? Number(
            (
              normalizedCashReceived -
              total
            ).toFixed(2)
          )
        : null,
  };

  setLastPosDeliveryReceipt(
    completedDeliveryReceipt
  );
}

    sessionStorage.removeItem(
      pendingRequestKey
    );

    setPosCart([]);

    // Reset payment form.
    setPosPaymentMethod('cash');
    setPosCashReceived('');
    setPosCardPaymentConfirmed(false);
    setPosFulfillment('pickup');
    setPosDeliveryDetails({
      customer_name: '', contact_person: '', contact_number: '', municipality: '', barangay: '',
      address: '', landmark: '', delivery_fee: '',
    });

    setPosStatus('success');

    // Successful sale must not look failed
    // just because dashboard refreshing fails.
    try {
      await Promise.all([
        fetchProducts(),
        fetchOrders(),
        fetchSalesHistory(),
        fetchInventoryMovements(),
      ]);

    } catch (refreshError) {
      console.error(
        'POS sale succeeded, but dashboard refresh failed:',
        refreshError
      );
    }

    if (posFulfillment !== 'delivery') {
  setTimeout(() => {
    setPosStatus('idle');
  }, 1500);
}

  } catch (err) {
    console.error(
      'POS Checkout failed:',
      err
    );

    setPosStatus('idle');

    if (err instanceof Error) {
      alert(err.message);

    } else {
      alert(
        'POS checkout failed. Please try again.'
      );
    }

  } finally {
    setPosSubmitting(false);
  }
};

  // Stats calculation
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const processingCount = orders.filter(o => o.status === 'processing').length;
  const getProductReorderLevel = (product: Product) => {
  const reorderLevel = Number(product.reorder_level);

  return Number.isInteger(reorderLevel) &&
    reorderLevel >= 0
    ? reorderLevel
    : 10;
};

const isBelowReorderLevel = (
  product: Product
) =>
  Number(product.stock) <
  getProductReorderLevel(product);

const lowStockProducts = products.filter(
  (product) =>
    Number(product.stock) === 0 ||
    isBelowReorderLevel(product)
);
  const orderStatusPriority: Record<Order['status'], number> = {
    pending: 1,
    awaiting_payment: 2,
    approved: 3,
    processing: 4,
    ready: 5,
    out_for_delivery: 5,
    failed_delivery: 6,
    deactivated: 7,
    completed: 8,
    cancelled: 9,
    rejected: 10,
  };
  const getAdminOrderWorkflow = (order: Order) => (
    order.fulfillment === 'delivery'
      ? [
          { key: 'pending', label: 'Pending' },
          { key: 'approved', label: 'Approved' },
          { key: 'processing', label: 'Processing' },
          { key: 'out_for_delivery', label: 'Out for Delivery' },
          { key: 'completed', label: 'Completed' },
        ]
      : order.fulfillment === 'pickup'
  ? [
      { key: 'pending', label: 'Pending' },
      { key: 'approved', label: 'Awaiting Arrival' },
      { key: 'processing', label: 'Processing' },
      { key: 'ready', label: 'Ready for Pickup' },
      { key: 'completed', label: 'Completed' },
    ]
        : [
            { key: 'pending', label: 'Pending' },
            { key: 'approved', label: 'Approved' },
            { key: 'processing', label: 'Processing' },
            { key: 'ready', label: 'Ready for Express Pickup' },
            { key: 'completed', label: 'Completed' },
          ]
  );
  const getAdminOrderProgressStatus = (order: Order) => {
    if (order.status === 'awaiting_payment') {
  return 'pending';
}
    if (['failed_delivery', 'deactivated'].includes(order.status)) {
      return order.previous_status || 'pending';
    }
    return order.status;
  };

const hasSuccessfulOnlinePayment = (
  order: Order
) => isPaidOnlineOrder(order);

const pickupArrivalDeadline = (
  order: Order
) => {
  if (!order.created_at) {
    return null;
  }

  const createdAt =
    new Date(order.created_at);

  if (
    Number.isNaN(
      createdAt.getTime()
    )
  ) {
    return null;
  }

  return new Date(
    createdAt.getTime() +
      48 * 60 * 60 * 1000
  );
};

const deliveryVerificationDeadline = (
  order: Order
) => {
  if (
    order.fulfillment !== 'delivery' ||
    !order.created_at
  ) {
    return null;
  }

  const createdAt =
    new Date(order.created_at);

  if (
    Number.isNaN(
      createdAt.getTime()
    )
  ) {
    return null;
  }

  return new Date(
    createdAt.getTime() +
      48 * 60 * 60 * 1000
  );
};

const paymentReviewPoint = (
  order: Order
) => {
  const value =
    order.created_at ||
    order.date;

  if (!value) {
    return null;
  }

  const createdAt =
    new Date(value);

  if (
    Number.isNaN(
      createdAt.getTime()
    )
  ) {
    return null;
  }

  return new Date(
    createdAt.getTime() +
      48 * 60 * 60 * 1000
  );
};

const hasReachedPaymentReviewPoint = (
  order: Order
) => {
  const reviewPoint = paymentReviewPoint(order);

  return Boolean(
    reviewPoint &&
      pickupDeadlineNow >= reviewPoint.getTime()
  );
};

const canCancelStandardOrder = (
  order: Order
) => {
  if (order.fulfillment === 'delivery') {
    return false;
  }

  if (
    ['approved', 'processing', 'ready'].includes(
      order.status
    )
  ) {
    return true;
  }

  return (
    order.status === 'awaiting_payment' &&
    hasReachedPaymentReviewPoint(order)
  );
};

const canPermanentlyCancelDelivery = (
  order: Order
) => {
  if (order.fulfillment !== 'delivery') {
    return false;
  }

  if (
    [
      'approved',
      'processing',
      'deactivated',
      'failed_delivery',
    ].includes(order.status)
  ) {
    return true;
  }

  return (
    order.status === 'awaiting_payment' &&
    hasReachedPaymentReviewPoint(order)
  );
};

const canDeactivateDeliveryOrder = (
  order: Order
) =>
  order.fulfillment === 'delivery' &&
  ['approved', 'processing'].includes(order.status);

const shopGoVerificationDeadline = (
  order: Order
) => {
  if (
    order.fulfillment !== 'shop_go' ||
    !order.created_at
  ) {
    return null;
  }

  const createdAt =
    new Date(order.created_at);

  if (
    Number.isNaN(
      createdAt.getTime()
    )
  ) {
    return null;
  }

  return new Date(
    createdAt.getTime() +
      48 * 60 * 60 * 1000
  );
};

const shopGoScheduleDateTime = (
  dateValue?: string | null,
  timeValue?: string | null
) => {
  if (!dateValue || !timeValue) {
    return null;
  }

  const rawDate =
    String(dateValue);

  let datePart = '';

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      rawDate
    )
  ) {
    datePart = rawDate;
  } else {
    const parsedDate =
      new Date(rawDate);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return null;
    }

    const parts =
      new Intl.DateTimeFormat(
        'en-US',
        {
          timeZone:
            'Asia/Manila',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }
      ).formatToParts(
        parsedDate
      );

    const year =
      parts.find(
        (part) =>
          part.type === 'year'
      )?.value;

    const month =
      parts.find(
        (part) =>
          part.type === 'month'
      )?.value;

    const day =
      parts.find(
        (part) =>
          part.type === 'day'
      )?.value;

    if (
      !year ||
      !month ||
      !day
    ) {
      return null;
    }

    datePart =
      `${year}-${month}-${day}`;
  }

  const timeMatch =
    String(timeValue).match(
      /^(\d{1,2}):(\d{2})/
    );

  if (!timeMatch) {
    return null;
  }

  const hour =
    timeMatch[1].padStart(
      2,
      '0'
    );

  const minute =
    timeMatch[2];

  const value =
    new Date(
      `${datePart}T${hour}:${minute}:00+08:00`
    );

  if (
    Number.isNaN(
      value.getTime()
    )
  ) {
    return null;
  }

  return value;
};

const formatPickupDeadline = (
  value: Date
) => {
  const datePart =
    new Intl.DateTimeFormat(
      'en-PH',
      {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }
    ).format(value);

  const timePart =
    new Intl.DateTimeFormat(
      'en-PH',
      {
        timeZone: 'Asia/Manila',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }
    ).format(value);

  return `${datePart} at ${timePart} (PHT)`;
};

const formatPickupTimeRemaining = (
  deadline: Date
) => {
  const difference =
    deadline.getTime() -
    pickupDeadlineNow;

  if (difference <= 0) {
    return 'Deadline reached';
  }

  const totalMinutes =
    Math.ceil(
      difference /
      (60 * 1000)
    );

  const days =
    Math.floor(
      totalMinutes /
      (24 * 60)
    );

  const hours =
    Math.floor(
      (totalMinutes %
        (24 * 60)) /
      60
    );

  const minutes =
    totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m remaining`;
  }

  return `${hours}h ${minutes}m remaining`;
};


const pickup48HourPolicyApplies = (
  order: Order
) => {
  return (
    order.fulfillment === 'pickup' &&
    !hasSuccessfulOnlinePayment(order) &&
    [
      'pending',
      'approved'
    ].includes(order.status)
  );
};

const delivery48HourPolicyApplies = (
  order: Order
) => {
  return (
    order.fulfillment === 'delivery' &&
    order.status === 'pending' &&
    !hasSuccessfulOnlinePayment(order)
  );
};

const shopGo48HourPolicyApplies = (
  order: Order
) => {
  const paymentMethod =
    String(
      order.payment_method ||
      order.paymentMethod ||
      'cash'
    )
      .trim()
      .toLowerCase();

  return (
    order.fulfillment === 'shop_go' &&
    order.status === 'pending' &&
    paymentMethod === 'cash'
  );
};

const getPickupVerificationStatus = (
  order: Order
) => {
  if (order.status === 'pending') {
    return 'Awaiting Admin Approval';
  }

  if (order.status === 'approved') {
    return 'Awaiting Customer Arrival / Order ID Verification';
  }

  return getAdminOrderStatusLabel(order);
};

 const getAdminOrderStatusLabel = (order: Order) => {
  if (order.fulfillment === 'pickup') {
    if (order.status === 'pending') {
      return 'For Approval';
    }

    if (order.status === 'awaiting_payment') {
      return 'Required Payment';
    }

    if (order.status === 'approved') {
      return 'Awaiting Customer Arrival';
    }
  }

  if (
    order.fulfillment === 'shop_go' &&
    order.status === 'ready'
  ) {
    return 'Ready for Express Pickup';
  }

  if (order.status === 'ready') {
    return 'Ready for Pickup';
  }

  return order.status.split('_').join(' ');
};
  const sortedOrders = [...orders].sort((first, second) => {
    const priorityDifference = orderStatusPriority[first.status] - orderStatusPriority[second.status];
    if (priorityDifference !== 0) return priorityDifference;

    const firstDate =
      new Date(
        first.created_at ||
        first.date
      ).getTime();

    const secondDate =
      new Date(
        second.created_at ||
        second.date
      ).getTime();

    return secondDate - firstDate;
  });

const getAdminOrderGroup = (
  order: Order
): 'active' | 'completed' | 'closed' => {
  if (order.status === 'completed') {
    return 'completed';
  }

  if (
    order.status === 'cancelled' ||
    order.status === 'rejected'
  ) {
    return 'closed';
  }

  return 'active';
};

const getAdminOrderGroupLabel = (
  group: 'active' | 'completed' | 'closed'
) => {
  if (group === 'completed') {
    return 'Completed';
  }

  if (group === 'closed') {
    return 'Closed Orders';
  }

  return 'Active / In Progress';
};

const getAdminOrderGroupDescription = (
  group: 'active' | 'completed' | 'closed'
) => {
  if (group === 'completed') {
    return 'Finished online orders retained for transaction history.';
  }

  if (group === 'closed') {
    return 'Cancelled or rejected online order records.';
  }

  return 'Orders that still need payment, review, preparation, pickup, or delivery.';
};

  // Convert each order's stored date into the same local YYYY-MM-DD
// format used by the HTML date filter. This avoids UTC/date-shift issues.
const getOrderDateFilterValue = (order: Order) => {
  const rawDate =
    order.created_at ||
    order.date;

  if (!rawDate) {
    return '';
  }

  const parsedDate = new Date(rawDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(rawDate).slice(0, 10);
  }

  const year =
    parsedDate.getFullYear();

  const month =
    String(parsedDate.getMonth() + 1)
      .padStart(2, '0');

  const day =
    String(parsedDate.getDate())
      .padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const normalizedOrderSearch =
  orderSearch.trim().toLowerCase();

const filteredOrders =
  sortedOrders.filter((order) => {
    const matchesSearch =
      !normalizedOrderSearch ||
      order.id
        .toLowerCase()
        .includes(normalizedOrderSearch);

    const matchesDate =
      !orderDateFilter ||
      getOrderDateFilterValue(order) ===
        orderDateFilter;

    const matchesStatus =
      orderStatusFilter === 'all' ||
      order.status === orderStatusFilter;

    return (
      matchesSearch &&
      matchesDate &&
      matchesStatus
    );
  });

const hasActiveOrderFilters =
  Boolean(
    orderSearch.trim() ||
    orderDateFilter ||
    orderStatusFilter !== 'all'
  );

const clearOrderFilters = () => {
  setOrderSearch('');
  setOrderDateFilter('');
  setOrderStatusFilter('all');
};



  // Dashboard-only summaries. These reuse the existing order, sales, and
  // inventory state, so the redesigned overview remains connected to the
  // current backend instead of showing placeholder values.
  const completedOrderCount = orders.filter(
    (order) => order.status === 'completed'
  ).length;

  const dashboardPendingCount = orders.filter(
    (order) =>
      order.status === 'pending' ||
      order.status === 'awaiting_payment'
  ).length;

  const dashboardProcessingCount = orders.filter(
    (order) =>
      order.status === 'approved' ||
      order.status === 'processing' ||
      order.status === 'ready' ||
      order.status === 'out_for_delivery' ||
      order.status === 'failed_delivery' ||
      order.status === 'deactivated'
  ).length;

  const dashboardCancelledCount = orders.filter(
    (order) =>
      order.status === 'cancelled' ||
      order.status === 'rejected'
  ).length;

  const dashboardSalesDays = Array.from(
    { length: 7 },
    (_, index) => {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - (6 - index));

      const revenue = salesHistory.reduce(
        (total, sale) => {
          const saleDate = new Date(sale.sale_date);

          const isSameDay =
            saleDate.getFullYear() === day.getFullYear() &&
            saleDate.getMonth() === day.getMonth() &&
            saleDate.getDate() === day.getDate();

          if (
            Number.isNaN(saleDate.getTime()) ||
            !isSameDay ||
            sale.payment_status !== 'Paid'
          ) {
            return total;
          }

          return total + Number(sale.revenue || 0);
        },
        0
      );

      return {
        label: day.toLocaleDateString('en-US', {
          weekday: 'short',
        }),
        revenue,
      };
    }
  );

  const posProductSubtotal = posCart.reduce(
  (sum, item) =>
    sum +
    Number(item.product.price) *
      item.quantity,
  0
);

const posDeliveryClassRank: Record<DeliveryLoadClass, number> = {
  light: 1,
  standard: 2,
  bulky: 3,
};
const posLoadClass = posCart.reduce<DeliveryLoadClass>((highest, item) => {
  const itemClass = item.product.delivery_class || 'standard';
  const threshold = Number(item.product.bulk_quantity_threshold || 0);
  const resolvedClass: DeliveryLoadClass = threshold > 0 && item.quantity >= threshold
    ? 'bulky'
    : itemClass;
  return posDeliveryClassRank[resolvedClass] > posDeliveryClassRank[highest]
    ? resolvedClass
    : highest;
}, 'light');
const posSelectedRate = deliveryRateSettings.find(
  (rate) =>
    rate.municipality === posDeliveryDetails.municipality &&
    rate.barangay === posDeliveryDetails.barangay &&
    rate.is_active
);
const posAvailableBarangays = deliveryRateSettings.filter(
  (rate) => rate.municipality === posDeliveryDetails.municipality && rate.is_active
);
const posSuggestedDeliveryFee = posFulfillment === 'delivery' && posSelectedRate
  ? ({ light: 60, standard: 150, bulky: 300 }[posLoadClass] + Number(posSelectedRate.surcharge))
  : 0;
const posFinalDeliveryFee = posFulfillment === 'delivery'
  ? Number(posDeliveryDetails.delivery_fee || 0)
  : 0;
const posTotal = posProductSubtotal + (Number.isFinite(posFinalDeliveryFee) ? posFinalDeliveryFee : 0);

const posCashReceivedAmount =
  posCashReceived.trim() === ''
    ? 0
    : Number(posCashReceived);

const posCashIsValid =
  Number.isFinite(posCashReceivedAmount);

const posCashIsEnough =
  posPaymentMethod === 'cash' &&
  posCashIsValid &&
  posCashReceived.trim() !== '' &&
  posCashReceivedAmount >= posTotal;

const posChange =
  posCashIsEnough
    ? Number(
        (
          posCashReceivedAmount -
          posTotal
        ).toFixed(2)
      )
    : 0;

const filteredPosProducts =
  products.filter((product) => {
    const productIsActive =
      (product.status || 'active').toLowerCase() === 'active';

    if (!productIsActive) {
      return false;
    }

    const query =
      posSearch.trim().toLowerCase();

    return (
      !query ||
      product.name
        .toLowerCase()
        .includes(query) ||
      product.brand
        .toLowerCase()
        .includes(query) ||
      product.category
        .toLowerCase()
        .includes(query) ||
      (product.barcode || '')
        .toLowerCase()
        .includes(query)
    );
  });

  const filteredInventoryProducts =
  products.filter((product) => {
    const query =
      inventorySearch.trim().toLowerCase();

    const matchesSearch =
      !query ||
      product.name
        .toLowerCase()
        .includes(query) ||
      product.brand
        .toLowerCase()
        .includes(query) ||
      product.category
        .toLowerCase()
        .includes(query) ||
      (product.status || 'active')
        .toLowerCase()
        .includes(query);

    const matchesCategory =
      inventoryCategoryFilter === 'all' ||
      product.category ===
        inventoryCategoryFilter;

    const productStatus =
      (product.status || 'active')
        .toLowerCase();

    const matchesStatus =
      inventoryStatusFilter === 'all' ||
      productStatus === inventoryStatusFilter;

    let matchesStock = true;

    if (inventoryStockFilter === 'normal') {
      matchesStock =
        product.stock > 0 &&
        !isBelowReorderLevel(product);
    }

    if (inventoryStockFilter === 'low') {
      matchesStock =
        product.stock > 0 &&
        isBelowReorderLevel(product);
    }

    if (inventoryStockFilter === 'out') {
      matchesStock =
        product.stock === 0;
    }

    return (
      matchesSearch &&
      matchesCategory &&
      matchesStatus &&
      matchesStock
    );
  });



const filteredCategories = allCategories
  .filter((category) => {
    const query =
      categorySearch.trim().toLowerCase();

    const matchesSearch =
      !query ||
      category.category_name
        .toLowerCase()
        .includes(query) ||
      (category.description || '')
        .toLowerCase()
        .includes(query) ||
      category.status
        .toLowerCase()
        .includes(query);

    const categoryStatus =
      category.status.toLowerCase();

    const matchesStatus =
      categoryStatusFilter === 'all' ||
      categoryStatus === categoryStatusFilter;

    return (
      matchesSearch &&
      matchesStatus
    );
  })
  .sort((a, b) => {
    const aInactive =
      a.status.toLowerCase() === 'inactive';

    const bInactive =
      b.status.toLowerCase() === 'inactive';

    if (aInactive === bInactive) {
      return a.category_name.localeCompare(
        b.category_name
      );
    }

    return aInactive ? 1 : -1;
  });

const filteredSuppliers = suppliers
  .filter((supplier) => {
    const query =
      supplierSearch.trim().toLowerCase();

    const matchesSearch =
      !query ||
      supplier.supplier_name
        .toLowerCase()
        .includes(query) ||
      (supplier.contact_person || '')
        .toLowerCase()
        .includes(query) ||
      (supplier.contact_number || '')
        .toLowerCase()
        .includes(query) ||
      (supplier.address || '')
        .toLowerCase()
        .includes(query) ||
      supplier.status
        .toLowerCase()
        .includes(query);

    const supplierStatus =
      supplier.status.toLowerCase();

    const matchesStatus =
      supplierStatusFilter === 'all' ||
      supplierStatus ===
        supplierStatusFilter;

    return (
      matchesSearch &&
      matchesStatus
    );
  })
  .sort((a, b) => {
    const aInactive =
      a.status.toLowerCase() === 'inactive';

    const bInactive =
      b.status.toLowerCase() === 'inactive';

    if (aInactive === bInactive) {
      return a.supplier_name.localeCompare(
        b.supplier_name
      );
    }

    return aInactive ? 1 : -1;
  });


// =====================================================
// INVENTORY MOVEMENT FILTERING
// =====================================================

const filteredInventoryMovements =
  inventoryMovements.filter((movement) => {

    const query =
      movementSearch
        .trim()
        .toLowerCase();

    const product =
      products.find(
        (p) =>
          p.id === movement.product_id
      );

    const movementCategory =
      product?.category || '';

    const reference =
  movement.reference_label ||
  (movement.order_id
    ? movement.order_id
    : movement.sale_id
    ? `Sale #${movement.sale_id}`
    : '');

    const matchesSearch =
      !query ||
      movement.product_name
        .toLowerCase()
        .includes(query) ||
      (movement.supplier_name || '')
        .toLowerCase()
        .includes(query) ||
      (movement.remarks || '')
        .toLowerCase()
        .includes(query) ||
      (movement.supplier_reference || '')
        .toLowerCase()
        .includes(query) ||
      reference
        .toLowerCase()
        .includes(query);

    const matchesType =
      movementTypeFilter === 'all' ||
      movement.movement_type ===
        movementTypeFilter;

    const matchesSource =
      movementSourceFilter === 'all' ||
      movement.source_label === movementSourceFilter;

    const matchesCategory =
      movementCategoryFilter === 'all' ||
      movementCategory ===
        movementCategoryFilter;

    const movementDate =
      new Date(
        movement.movement_date
      );

    let matchesDate = true;

    if (movementDateFrom) {
      const fromDate =
        new Date(
          `${movementDateFrom}T00:00:00`
        );

      if (movementDate < fromDate) {
        matchesDate = false;
      }
    }

    if (movementDateTo) {
      const toDate =
        new Date(
          `${movementDateTo}T23:59:59.999`
        );

      if (movementDate > toDate) {
        matchesDate = false;
      }
    }

    return (
      matchesSearch &&
      matchesType &&
      matchesSource &&
      matchesCategory &&
      matchesDate
    );
  });

const recentStockInMovements = inventoryMovements
  .filter((movement) => movement.movement_type === 'Stock-In')
  .slice(0, 5);

const openAllStockInMovements = () => {
  setMovementSearch('');
  setMovementTypeFilter('Stock-In');
  setMovementSourceFilter('all');
  setMovementCategoryFilter('all');
  setMovementDateFrom('');
  setMovementDateTo('');
  setActiveTab('movementHistory');
};

const productSelectorLabel = (product: Product) =>
  `${product.name} — ${product.barcode || 'No barcode'} — Stock: ${product.stock}`;

const supplierSelectorLabel = (supplier: Supplier) =>
  `${supplier.supplier_name}${supplier.contact_person ? ` — ${supplier.contact_person}` : ''}`;

const getSalesDateRange = () => {
  const now = new Date();

  let start: Date | null = null;
  let end: Date | null = null;

  if (salesDatePreset === 'today') {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);

    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  }

  if (salesDatePreset === 'week') {
    start = new Date(now);

    const day = start.getDay();
    const daysSinceMonday =
      day === 0 ? 6 : day - 1;

    start.setDate(
      start.getDate() - daysSinceMonday
    );

    start.setHours(0, 0, 0, 0);

    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  }

  if (salesDatePreset === 'month') {
    start = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    start.setHours(0, 0, 0, 0);

    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  }

  if (salesDatePreset === 'custom') {
    if (salesDateFrom) {
      start = new Date(
        `${salesDateFrom}T00:00:00`
      );
    }

    if (salesDateTo) {
      end = new Date(
        `${salesDateTo}T23:59:59.999`
      );
    }
  }

  return { start, end };
};

const {
  start: salesStartDate,
  end: salesEndDate,
} = getSalesDateRange();

const normalizedSalesSearch =
  salesSearch.trim().toLowerCase();

const filteredSalesHistory = salesHistory.filter(
  (sale) => {
    const saleDate = new Date(sale.sale_date);

    if (Number.isNaN(saleDate.getTime())) {
      return false;
    }

    if (
      salesStartDate &&
      saleDate < salesStartDate
    ) {
      return false;
    }

    if (
      salesEndDate &&
      saleDate > salesEndDate
    ) {
      return false;
    }

    const searchableText = [
      sale.sale_id,
      sale.reference,
      sale.items_summary,
      sale.source_label,
      sale.sales_source,
      sale.payment_method,
      sale.payment_status,
      sale.adjustment_state,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesSearch =
      !normalizedSalesSearch ||
      searchableText.includes(
        normalizedSalesSearch
      );

    return matchesSearch;
  }
);

const filteredSalesSummary = (() => {
  const summary = filteredSalesHistory.reduce(
    (totals, sale) => {
      totals.total_sales += 1;
      totals.total_gross_merchandise_sales += Number(sale.gross_merchandise_sales || 0);
      totals.total_discounts += Number(sale.discount_amount || 0);
      totals.total_merchandise_refunds += Number(sale.merchandise_refunds || 0);
      totals.total_net_merchandise_sales += Number(sale.net_merchandise_sales || 0);
      totals.total_service_fee_refunds += Number(sale.service_fee_refunds || 0);
      totals.total_delivery_fee_refunds += Number(sale.delivery_fee_refunds || 0);
      totals.total_service_revenue += Number(sale.service_revenue || 0);
      totals.total_delivery_revenue += Number(sale.delivery_revenue || 0);
      totals.total_fee_revenue += Number(sale.fee_revenue || 0);
      totals.total_refunds += Number(sale.total_refunds || 0);
      totals.total_revenue += Number(sale.total_revenue || sale.revenue || 0);
      totals.total_original_cogs += Number(sale.original_cogs || 0);
      totals.total_cogs_reversed += Number(sale.cogs_reversed || 0);
      totals.total_cogs += Number(sale.cogs || 0);
      totals.total_gross_profit += Number(sale.gross_profit || 0);
      totals.total_items_sold += Number(sale.net_quantity ?? sale.total_quantity ?? 0);
      totals.total_items_returned += Number(sale.returned_quantity || 0);
      totals.total_adjustments += Number(sale.adjustment_count || 0);
      totals.total_voided_sales += Number(sale.void_count || 0) > 0 ? 1 : 0;
      return totals;
    },
    {
      total_sales: 0,
      total_gross_merchandise_sales: 0,
      total_discounts: 0,
      total_merchandise_refunds: 0,
      total_net_merchandise_sales: 0,
      total_service_fee_refunds: 0,
      total_delivery_fee_refunds: 0,
      total_service_revenue: 0,
      total_delivery_revenue: 0,
      total_fee_revenue: 0,
      total_refunds: 0,
      total_revenue: 0,
      total_original_cogs: 0,
      total_cogs_reversed: 0,
      total_cogs: 0,
      total_gross_profit: 0,
      total_gross_profit_margin: 0,
      total_items_sold: 0,
      total_items_returned: 0,
      total_adjustments: 0,
      total_voided_sales: 0,
    }
  );

  summary.total_gross_profit_margin =
    summary.total_net_merchandise_sales > 0
      ? (summary.total_gross_profit / summary.total_net_merchandise_sales) * 100
      : 0;

  return summary;
})();

const normalizedReportSearch = reportSearch.trim().toLowerCase();

const getSupplierName = (supplierId: number | null) =>
  suppliers.find((supplier) => supplier.supplier_id === supplierId)
    ?.supplier_name || 'Not assigned';

    const getProductSupplierNames = (product: Product) => {
  const supplierNames = inventoryMovements
    .filter(
      (movement) =>
        movement.product_id === product.id &&
        movement.movement_type === 'Stock-In'
    )
    .map((movement) => {
      if (movement.supplier_name) {
        return movement.supplier_name;
      }

      if (movement.supplier_id) {
        return getSupplierName(movement.supplier_id);
      }

      return '';
    })
    .filter(
      (name) =>
        name &&
        name !== 'Not assigned'
    );

  const uniqueSupplierNames =
    Array.from(new Set(supplierNames));

  if (uniqueSupplierNames.length > 0) {
    return uniqueSupplierNames;
  }

  const primarySupplier =
    getSupplierName(product.supplier_id);

  return primarySupplier === 'Not assigned'
    ? []
    : [primarySupplier];
};

const getProductSupplierDisplay = (product: Product) => {
  const supplierNames =
    getProductSupplierNames(product);

  if (supplierNames.length === 0) {
    return 'Not assigned';
  }

  if (supplierNames.length === 1) {
    return supplierNames[0];
  }

  return `Multiple Suppliers (${supplierNames.length}): ${supplierNames.join(', ')}`;
};

const reportSalesRows = salesHistory.filter((sale) => {
  const saleDate = new Date(sale.sale_date);

  if (
    Number.isNaN(saleDate.getTime()) ||
    sale.payment_status !== 'Paid'
  ) {
    return false;
  }

  if (
    reportDateFrom &&
    saleDate < new Date(`${reportDateFrom}T00:00:00`)
  ) {
    return false;
  }

  if (
    reportDateTo &&
    saleDate > new Date(`${reportDateTo}T23:59:59.999`)
  ) {
    return false;
  }

  if (!normalizedReportSearch) {
    return true;
  }

  return [
  sale.sale_id,
  sale.reference,
  sale.items_summary,
  sale.source_label,
  sale.payment_method,
  sale.payment_status,
]
    .join(' ')
    .toLowerCase()
    .includes(normalizedReportSearch);
});

const reportInventoryRows = products.filter((product) => {
  const supplierName = getProductSupplierDisplay(product);
  const matchesCategory =
    reportCategory === 'all' || product.category === reportCategory;
  const matchesSearch =
    !normalizedReportSearch ||
    [
      product.name,
      product.brand,
      product.category,
      supplierName,
      product.barcode,
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedReportSearch);

  return matchesCategory && matchesSearch;
});

const reportLowStockRows =
  reportInventoryRows.filter(
    (product) =>
      Number(product.stock) === 0 ||
      isBelowReorderLevel(product)
  );

  const reportStockMovementRows =
  inventoryMovements.filter((movement) => {
    const movementDate =
      new Date(movement.movement_date);

    if (Number.isNaN(movementDate.getTime())) {
      return false;
    }

    // Filter by movement type.
    if (
      reportMovementType !== 'all' &&
      movement.movement_type !== reportMovementType
    ) {
      return false;
    }

    // Filter by start date.
    if (
      reportMovementDateFrom &&
      movementDate <
        new Date(`${reportMovementDateFrom}T00:00:00`)
    ) {
      return false;
    }

    // Filter by end date.
    if (
      reportMovementDateTo &&
      movementDate >
        new Date(`${reportMovementDateTo}T23:59:59.999`)
    ) {
      return false;
    }

    if (!normalizedReportSearch) {
      return true;
    }

    const reference =
      movement.reference_label ||
      (movement.order_id
        ? movement.order_id
        : movement.sale_id
          ? `Sale #${movement.sale_id}`
          : '');

    return [
      movement.product_name,
      movement.barcode,
      movement.category,
      movement.movement_type,
      movement.source_label,
      movement.supplier_name,
      movement.supplier_reference,
      reference,
      movement.remarks,
      movement.recorded_by,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedReportSearch);
  });

const reportSalesSummary = (() => {
  const summary = reportSalesRows.reduce(
    (totals, sale) => ({
      totalSales: totals.totalSales + 1,
      grossMerchandiseSales:
        totals.grossMerchandiseSales + Number(sale.gross_merchandise_sales || 0),
      discounts: totals.discounts + Number(sale.discount_amount || 0),
      refunds: totals.refunds + Number(sale.total_refunds || 0),
      netMerchandiseSales:
        totals.netMerchandiseSales + Number(sale.net_merchandise_sales || 0),
      feeRevenue: totals.feeRevenue + Number(sale.fee_revenue || 0),
      totalRevenue:
        totals.totalRevenue + Number(sale.total_revenue || sale.revenue || 0),
      cost: totals.cost + Number(sale.cogs || 0),
      grossProfit: totals.grossProfit + Number(sale.gross_profit || 0),
      grossMargin: 0,
    }),
    {
      totalSales: 0,
      grossMerchandiseSales: 0,
      discounts: 0,
      refunds: 0,
      netMerchandiseSales: 0,
      feeRevenue: 0,
      totalRevenue: 0,
      cost: 0,
      grossProfit: 0,
      grossMargin: 0,
    }
  );

  summary.grossMargin =
    summary.netMerchandiseSales > 0
      ? (summary.grossProfit / summary.netMerchandiseSales) * 100
      : 0;

  return summary;
})();

const inventoryCostByProduct = inventoryMovements.reduce(
  (costs, movement) => {
    const productId = Number(movement.product_id);
    const movementValue =
      Number(movement.quantity || 0) * Number(movement.supplier_price || 0);
    const direction = movement.movement_type === 'Stock-In' ? 1 : -1;
    costs.set(productId, (costs.get(productId) || 0) + direction * movementValue);
    return costs;
  },
  new Map<number, number>()
);

const getInventoryCostValue = (product: Product) =>
  Math.max(0, Number((inventoryCostByProduct.get(product.id) || 0).toFixed(2)));

const getAverageInventoryCost = (product: Product) => {
  const stock = Number(product.stock || 0);
  if (stock <= 0) return 0;
  return Number((getInventoryCostValue(product) / stock).toFixed(2));
};

const reportInventorySummary = reportInventoryRows.reduce(
  (summary, product) => ({
    products: summary.products + 1,
    units: summary.units + Number(product.stock || 0),
    inventoryCostValue: summary.inventoryCostValue + getInventoryCostValue(product),
    retailValue:
      summary.retailValue +
      Number(product.stock || 0) * Number(product.price || 0),
  }),
  { products: 0, units: 0, inventoryCostValue: 0, retailValue: 0 }
);

const reportManagementRows: Array<Array<string | number>> = managementOverviewReport
  ? [
      ['Profitability', 'Gross Profit — This Month', formatPeso(managementOverviewReport.profitability.month.grossProfit), 'Net merchandise sales minus COGS'],
      ['Profitability', 'Service / Delivery Revenue — This Month', formatPeso(managementOverviewReport.profitability.month.serviceDeliveryRevenue), 'Fees kept separate from merchandise gross profit'],
      ['Profitability', 'Operating Expenses — This Month', formatPeso(managementOverviewReport.profitability.month.operatingExpenses), `${managementOverviewReport.profitability.month.expenseCount} active expense record(s)`],
      ['Profitability', 'Estimated Net Profit — This Month', formatPeso(managementOverviewReport.profitability.month.estimatedNetProfit), 'Gross Profit + Service/Delivery Revenue − Operating Expenses'],
      ['Purchasing', 'Open Purchase Orders', managementOverviewReport.purchasing.openPurchaseOrders, `${managementOverviewReport.purchasing.outstandingUnits} unit(s) outstanding`],
      ['Purchasing', 'Outstanding Expected Purchase Cost', formatPeso(managementOverviewReport.purchasing.outstandingExpectedCost), 'Expected cost of remaining units on open POs'],
      ['Replenishment', 'Products Needing Reorder', managementOverviewReport.replenishment.needsReorder, `${managementOverviewReport.replenishment.suggestedUnits} total suggested unit(s)`],
      ['Replenishment', 'Covered by Open PO', managementOverviewReport.replenishment.coveredByOpenPo, 'Current need already covered by incoming PO quantities'],
      ['Replenishment', 'Reorder Setup Required', managementOverviewReport.replenishment.setupRequired, 'Supplier/lead-time data requires completion'],
      ['Returns & Voids', 'Adjustments Today', managementOverviewReport.saleAdjustmentsToday.adjustmentCount, `${managementOverviewReport.saleAdjustmentsToday.returnCount} return(s) · ${managementOverviewReport.saleAdjustmentsToday.voidCount} void(s)`],
      ['Returns & Voids', 'Refunds Recorded Today', formatPeso(managementOverviewReport.saleAdjustmentsToday.refundAmount), 'Verified recorded refunds; PayMongo refunds remain external/manual'],
      ['Cash Control', 'Cashier Shift', managementOverviewReport.cashier.hasOpenShift ? `Open #${managementOverviewReport.cashier.currentShift?.shiftId}` : 'No open shift', managementOverviewReport.cashier.currentShift
        ? `${formatPeso(managementOverviewReport.cashier.currentShift.expectedCash)} expected cash`
        : managementOverviewReport.cashier.lastClosedShift
          ? `Last closed #${managementOverviewReport.cashier.lastClosedShift.shiftId}; discrepancy ${formatPeso(managementOverviewReport.cashier.lastClosedShift.discrepancy)}`
          : 'No shift history yet'],
    ]
  : [];

const reportTitle =
  reportType === 'management'
    ? 'Management Summary'
    : reportType === 'sales'
      ? 'Sales Report'
    : reportType === 'inventory'
      ? 'Inventory Report'
      : reportType === 'lowStock'
        ? 'Low Stock Report'
        : 'Stock Movement Report';

const reportTableHeaders =
  reportType === 'management'
    ? ['Area', 'Metric', 'Value', 'Interpretation']
    : reportType === 'sales'
      ? [
  'Date',
  'Reference',
  'Products / Items',
  'Source',
  'Items',
  'Quantity',
  'Gross Merchandise',
  'Discount',
  'Returns / Refunds',
  'Net Merchandise Sales',
  'Service / Delivery Revenue',
  'Total Revenue',
  'COGS',
  'Gross Profit',
  'Gross Margin',
  'Payment Method',
  'Sale State',
]
    : reportType === 'inventory'
      ? [
          'Product',
          'Category',
          'Supplier(s)',
          'Current Stock',
          'Average Cost',
          'Inventory Cost Value',
          'Selling Price',
          'Potential Retail Value',
        ]
      : reportType === 'lowStock'
        ? [
            'Product',
            'Category',
            'Supplier(s)',
            'Current Stock',
            'Reorder Level',
            'Status',
          ]
        : [
            'Date',
            'Product',
            'Type',
            'Quantity',
            'Source',
            'Supplier',
            'Cost / Unit',
            'Selling Price',
            'System Reference',
            'Supplier Reference',
            'Remarks',
            'Recorded By',
          ];

const reportTableRows: Array<Array<string | number>> =
  reportType === 'management'
    ? reportManagementRows
    : reportType === 'sales'
      ? reportSalesRows.map((sale) => [
      new Date(sale.sale_date).toLocaleString('en-PH'),
      sale.reference,
      sale.items_summary || '—',
      sale.source_label,
      sale.item_count,
      sale.net_quantity ?? sale.total_quantity,
      formatPeso(sale.gross_merchandise_sales),
      formatPeso(sale.discount_amount),
      formatPeso(sale.total_refunds),
      formatPeso(sale.net_merchandise_sales),
      formatPeso(sale.fee_revenue),
      formatPeso(sale.total_revenue),
      formatPeso(sale.cogs),
      formatPeso(sale.gross_profit),
      `${Number(sale.gross_profit_margin || 0).toFixed(2)}%`,
      formatPaymentMethod(
        sale.payment_method || 'cash'
      ),
      sale.adjustment_state || 'Completed',
    ])
    : reportType === 'inventory'
      ? reportInventoryRows.map((product) => [
          product.name,
          product.category,
          getProductSupplierDisplay(product),
          product.stock,
          formatPeso(getAverageInventoryCost(product)),
          formatPeso(getInventoryCostValue(product)),
          formatPeso(product.price),
          formatPeso(
            Number(product.stock) *
              Number(product.price)
          ),
        ])
      : reportType === 'lowStock'
        ? reportLowStockRows.map((product) => [
            product.name,
            product.category,
            getProductSupplierDisplay(product),
            product.stock,
            getProductReorderLevel(product),
            product.stock === 0
              ? 'Out of Stock'
              : 'Below Reorder Level',
          ])
        : reportStockMovementRows.map((movement) => {
            const reference =
              movement.reference_label ||
              (movement.order_id
                ? movement.order_id
                : movement.sale_id
                  ? `Sale #${movement.sale_id}`
                  : '—');

            const source =
              movement.source_label ||
              movement.remarks ||
              (movement.movement_type === 'Stock-In'
                ? 'Stock Receiving'
                : 'Sale');

            return [
              new Date(
                movement.movement_date
              ).toLocaleString('en-PH'),

              movement.product_name,

              movement.movement_type,

              movement.quantity,

              source,

              movement.supplier_name || '—',

              formatPeso(
                Number(movement.supplier_price || 0)
              ),

              formatPeso(
                Number(movement.selling_price || 0)
              ),

              reference,

              movement.supplier_reference || '—',

              movement.remarks || '—',

              movement.recorded_by || '—',
            ];
          });

const compactReportHeaders =
  reportType === 'management'
    ? reportTableHeaders
    : reportType === 'sales'
      ? ['Date / Reference', 'Products / Items', 'Source', 'Qty', 'Net Merchandise', 'Total Revenue', 'Gross Profit / Margin', 'State']
      : reportType === 'inventory'
        ? ['Product / Category', 'Supplier(s)', 'Stock', 'Average Cost', 'Inventory Cost Value', 'Retail Value']
        : reportType === 'lowStock'
          ? reportTableHeaders
          : ['Date / Reference', 'Product', 'Movement', 'Source', 'Supplier', 'Cost / Unit', 'Recorded By'];

const compactReportRows: Array<Array<string | number>> =
  reportType === 'management'
    ? reportManagementRows
    : reportType === 'sales'
      ? reportSalesRows.map((sale) => [
          `${new Date(sale.sale_date).toLocaleDateString('en-PH')} · ${sale.reference}`,
          sale.items_summary || '—',
          sale.source_label,
          sale.net_quantity ?? sale.total_quantity,
          formatPeso(sale.net_merchandise_sales),
          formatPeso(sale.total_revenue),
          `${formatPeso(sale.gross_profit)} · ${Number(sale.gross_profit_margin || 0).toFixed(2)}%`,
          sale.adjustment_state || 'Completed',
        ])
      : reportType === 'inventory'
        ? reportInventoryRows.map((product) => [
            `${product.name} · ${product.category}`,
            getProductSupplierDisplay(product),
            product.stock,
            formatPeso(getAverageInventoryCost(product)),
            formatPeso(getInventoryCostValue(product)),
            formatPeso(Number(product.stock) * Number(product.price)),
          ])
        : reportType === 'lowStock'
          ? reportLowStockRows.map((product) => [
              product.name,
              product.category,
              getProductSupplierDisplay(product),
              product.stock,
              getProductReorderLevel(product),
              product.stock === 0 ? 'Out of Stock' : 'Below Reorder Level',
            ])
          : reportStockMovementRows.map((movement) => [
              `${new Date(movement.movement_date).toLocaleDateString('en-PH')} · ${movement.reference_label || movement.order_id || (movement.sale_id ? `Sale #${movement.sale_id}` : '—')}`,
              movement.product_name,
              `${movement.movement_type === 'Stock-In' ? '+' : '-'}${movement.quantity} ${movement.movement_type}`,
              movement.source_label || movement.remarks || (movement.movement_type === 'Stock-In' ? 'Stock Receiving' : 'Sale'),
              movement.supplier_name || '—',
              formatPeso(Number(movement.supplier_price || 0)),
              movement.recorded_by || '—',
            ]);

const reportScreenHeaders = reportTableView === 'full' ? reportTableHeaders : compactReportHeaders;
const reportScreenRows = reportTableView === 'full' ? reportTableRows : compactReportRows;

const handleExportReportCsv = () => {
  const reportRows = [reportTableHeaders, ...reportTableRows];
  const csvContent = reportRows
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\n');
  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const downloadUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  const dateStamp = new Date().toISOString().slice(0, 10);

  downloadLink.href = downloadUrl;
  downloadLink.download = `rayjin-${reportType}-report-${dateStamp}.csv`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(downloadUrl);
};

const handlePrintReport = () => {
  const printWindow = window.open('', '_blank', 'width=1100,height=760');

  if (!printWindow) {
    alert('Please allow pop-ups so the report can be printed.');
    return;
  }

  const tableHeaderHtml = reportTableHeaders
    .map((header) => `<th>${escapeReportHtml(header)}</th>`)
    .join('');
  const tableRowsHtml = reportTableRows
    .map(
      (row) =>
        `<tr>${row
          .map((value) => `<td>${escapeReportHtml(value)}</td>`)
          .join('')}</tr>`
    )
    .join('');

  printWindow.document.write(`<!doctype html>
    <html>
      <head>
        <title>${escapeReportHtml(reportTitle)} - Rayjin Hardware</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 32px; color: #17372d; font-family: Arial, sans-serif; }
          .header { border-bottom: 3px solid #15803d; padding-bottom: 14px; }
          .brand { color: #15803d; font-size: 13px; font-weight: 800; letter-spacing: .16em; }
          h1 { margin: 7px 0 4px; font-size: 26px; }
          .meta { color: #61766d; font-size: 12px; }
          table { border-collapse: collapse; margin-top: 24px; width: 100%; }
          th, td { border: 1px solid #d9e4de; padding: 9px; text-align: left; font-size: 11px; }
          th { background: #eef7f1; color: #12372a; text-transform: uppercase; }
          tr:nth-child(even) td { background: #f8faf9; }
          .empty { padding: 28px; text-align: center; color: #61766d; }
          @page {
  size: ${reportType === 'stockMovement' || reportType === 'sales'
    ? 'landscape'
    : 'portrait'};
  margin: 16mm;
}
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">RAYJIN HARDWARE</div>
          <h1>${escapeReportHtml(reportTitle)}</h1>
          <div class="meta">Generated ${escapeReportHtml(
            reportGeneratedAt.toLocaleString('en-PH')
          )}</div>
        </div>
        <table>
          <thead><tr>${tableHeaderHtml}</tr></thead>
          <tbody>${
            reportTableRows.length
              ? tableRowsHtml
              : `<tr><td class="empty" colspan="${reportTableHeaders.length}">No records match the selected filters.</td></tr>`
          }</tbody>
        </table>
      </body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

const handleDashboardBackToTop = () => {
  dashboardMainRef.current?.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
};

const normalizedCustomerSearch = customerSearch.trim().toLowerCase();

const filteredCustomers = customers.filter((customer) => {
  const searchableText = [
    customer.first_name,
    customer.last_name,
    customer.username,
    customer.email,
    customer.phone_number,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const matchesSearch =
    !normalizedCustomerSearch ||
    searchableText.includes(normalizedCustomerSearch);

  const matchesStatus =
    customerStatusFilter === 'all' ||
    (customerStatusFilter === 'active'
      ? customer.status === 'active'
      : customer.status !== 'active');

  return matchesSearch && matchesStatus;
});

const activeCustomerCount = customers.filter(
  (customer) => customer.status === 'active'
).length;

const inactiveCustomerCount =
  customers.length - activeCustomerCount;

const customersWithOrdersCount = customers.filter(
  (customer) => customer.total_orders > 0
).length;

return (
<div className="relative min-h-screen w-full bg-[radial-gradient(circle_at_82%_0%,rgba(220,244,229,0.55),transparent_30%),linear-gradient(180deg,#F6F9F7_0%,#F1F6F3_100%)] pt-16 text-[#34463F] lg:h-screen lg:overflow-hidden">
      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close administration menu"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-x-0 bottom-0 top-16 z-30 bg-black/40 backdrop-blur-[1px] lg:hidden"
        />
      )}

      {/* Grouped, collapsible Admin navigation. Existing tab URLs remain unchanged. */}
      <AdminSidebar
        activeTab={activeTab}
        isOpen={isSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        activeOrderCount={pendingCount + processingCount}
        onNavigate={(tab: AdminSidebarTab) => setActiveTab(tab as AdminTab)}
        onClose={() => setIsSidebarOpen(false)}
        onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
      />

{/* Main Panel Content */}
<main
  ref={dashboardMainRef}
  className={`min-w-0 w-full overflow-x-hidden
    px-4 pb-0 pt-4
    transition-[margin,width] duration-300
    md:px-6
    lg:h-[calc(100vh-4rem)]
    lg:overflow-y-auto
    lg:overscroll-contain
    lg:px-6
    lg:pt-5
    xl:px-8
    ${
      isSidebarCollapsed
        ? 'lg:ml-[5.25rem] lg:w-[calc(100%-5.25rem)]'
        : 'lg:ml-72 lg:w-[calc(100%-18rem)]'
    }`}
>
        <div className="min-h-[calc(100vh-5rem)]">
        {/* Mobile administration menu button */}
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-[#DDE6E0] bg-white p-3 shadow-sm lg:hidden">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#2F7D5A]">
              Administration
            </p>
            <p className="mt-0.5 text-sm font-bold text-[#17372D]">
              Rayjin Console
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsSidebarOpen((current) => !current)}
            aria-expanded={isSidebarOpen}
            aria-controls="admin-sidebar-navigation"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#12372A] px-3 text-xs font-bold text-white shadow-sm hover:bg-[#1B4A39]"
          >
            {isSidebarOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
            Menu
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <AdminDashboardOverview
            userName={user.first_name || user.username}
            totalRevenue={Number(salesSummary.total_revenue || 0)}
            pendingOrders={dashboardPendingCount}
            activeFulfillment={dashboardProcessingCount}
            completedOrders={completedOrderCount}
            cancelledOrders={dashboardCancelledCount}
            orders={orders}
            lowStockProducts={lowStockProducts}
            salesDays={dashboardSalesDays}
            onNavigate={(tab) => setActiveTab(tab as AdminTab)}
            onOpenLowStockReport={() => {
              setReportType('lowStock');
              setActiveTab('reports');
            }}
          />
        )}

{/* CUSTOMER MANAGEMENT */}
{activeTab === 'customers' && (
  <div className="space-y-5 animate-fade-up">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2F7D5A]">
          Customer Records
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold text-[#17372D]">
          Customer Management
        </h2>
        <p className="mt-1 text-sm text-[#71817A]">
          Review registered customer accounts, contact details, and order activity.
        </p>
      </div>

      <button
        type="button"
        onClick={fetchCustomers}
        disabled={customersLoading}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#CFE0D7] bg-white px-4 py-2.5 text-xs font-bold text-[#0D6337] shadow-sm transition-colors hover:bg-[#F1F8F4] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${customersLoading ? 'animate-spin' : ''}`} />
        Refresh Customers
      </button>
    </div>

    {customersMessage && (
      <div
        className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
          customersMessage.type === 'success'
            ? 'border-[#BDE3CB] bg-[#EFFAF3] text-[#0D7740]'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}
      >
        {customersMessage.text}
      </div>
    )}

    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-2xl border border-[#DDE6E0] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#829089]">
              Registered
            </p>
            <p className="mt-2 text-2xl font-bold text-[#17372D]">
              {customers.length}
            </p>
          </div>
          <div className="rounded-xl bg-[#EAF6EF] p-3 text-[#0D7740]">
            <UsersRound className="h-5 w-5" />
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-[#DDE6E0] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#829089]">
              Active Accounts
            </p>
            <p className="mt-2 text-2xl font-bold text-[#17372D]">
              {activeCustomerCount}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-[#DDE6E0] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#829089]">
              Inactive Accounts
            </p>
            <p className="mt-2 text-2xl font-bold text-[#17372D]">
              {inactiveCustomerCount}
            </p>
          </div>
          <div className="rounded-xl bg-red-50 p-3 text-red-500">
            <UserX className="h-5 w-5" />
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-[#DDE6E0] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#829089]">
              With Orders
            </p>
            <p className="mt-2 text-2xl font-bold text-[#17372D]">
              {customersWithOrdersCount}
            </p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
            <ClipboardList className="h-5 w-5" />
          </div>
        </div>
      </article>
    </section>

    <section className="overflow-hidden rounded-2xl border border-[#DDE6E0] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#E5ECE8] p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-display text-sm font-bold text-[#17372D]">
            Registered Customers
          </h3>
          <p className="mt-1 text-[10px] text-[#71817A]">
            Showing {filteredCustomers.length} of {customers.length} customer accounts
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative block min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#829089]" />
            <input
              type="search"
              value={customerSearch}
              onChange={(event) => setCustomerSearch(event.target.value)}
              placeholder="Search name, email, or contact"
              className="w-full rounded-xl border border-[#DDE6E0] bg-[#F9FBFA] py-2.5 pl-9 pr-3 text-xs text-[#34463F] outline-none transition focus:border-[#2F7D5A] focus:ring-2 focus:ring-[#2F7D5A]/10"
            />
          </label>

          <select
            value={customerStatusFilter}
            onChange={(event) =>
              setCustomerStatusFilter(
                event.target.value as 'all' | 'active' | 'inactive'
              )
            }
            className="rounded-xl border border-[#DDE6E0] bg-[#F9FBFA] px-3 py-2.5 text-xs font-semibold text-[#34463F] outline-none focus:border-[#2F7D5A]"
          >
            <option value="all">All accounts</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {customersLoading ? (
        <div className="flex items-center justify-center gap-2 p-12 text-xs font-semibold text-[#71817A]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading customer records...
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="p-12 text-center">
          <UsersRound className="mx-auto h-8 w-8 text-[#A9B6B0]" />
          <p className="mt-3 text-sm font-bold text-[#405149]">
            No matching customers
          </p>
          <p className="mt-1 text-xs text-[#829089]">
            Try changing the search text or account-status filter.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="bg-[#F7FAF8] text-[9px] uppercase tracking-wider text-[#71817A]">
              <tr>
                <th className="px-5 py-3">Customer</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3 text-center">Orders</th>
                <th className="px-4 py-3 text-right">Completed Value</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5ECE8]">
              {filteredCustomers.map((customer) => {
                const customerName =
                  [customer.first_name, customer.last_name]
                    .filter(Boolean)
                    .join(' ') || customer.username;

                return (
                  <tr key={customer.id} className="align-middle text-[#405149] hover:bg-[#F9FBFA]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {customer.avatar_url ? (
                          <img
                            src={customer.avatar_url}
                            alt=""
                            className="h-10 w-10 rounded-full border border-[#DDE6E0] object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF6EF] text-sm font-bold text-[#0D7740]">
                            {customerName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-[#17372D]">{customerName}</p>
                          <p className="mt-0.5 text-[10px] text-[#829089]">@{customer.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1.5">
                        <p className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-[#829089]" />
                          {customer.email}
                        </p>
                        <p className="flex items-center gap-1.5 text-[#71817A]">
                          <Phone className="h-3.5 w-3.5" />
                          {customer.phone_number || 'No contact number'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${
                          customer.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {customer.status}
                      </span>
                      <p className="mt-2 flex items-center gap-1 text-[9px] text-[#829089]">
                        <CalendarDays className="h-3 w-3" />
                        Joined {new Date(customer.created_at).toLocaleDateString('en-PH')}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <p className="font-bold text-[#17372D]">{customer.total_orders}</p>
                      <p className="mt-1 text-[9px] text-[#829089]">
                        {customer.active_orders} active · {customer.completed_orders} completed
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-[#17372D]">
                      ₱{customer.total_spent.toFixed(2)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => fetchCustomerOrders(customer)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#CFE0D7] bg-white px-3 py-2 text-[10px] font-bold text-[#0D6337] hover:bg-[#F1F8F4]"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateCustomerStatus(customer)}
                          disabled={updatingCustomerId === customer.id}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                            customer.status === 'active'
                              ? 'bg-red-500 hover:bg-red-600'
                              : 'bg-[#0D7740] hover:bg-[#0A6135]'
                          }`}
                        >
                          {updatingCustomerId === customer.id ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : customer.status === 'active' ? (
                            <UserX className="h-3.5 w-3.5" />
                          ) : (
                            <UserCheck className="h-3.5 w-3.5" />
                          )}
                          {customer.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>

    {selectedCustomer && (
      <section className="overflow-hidden rounded-2xl border border-[#CFE0D7] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#E5ECE8] bg-[#F7FAF8] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#2F7D5A]">
              Customer Order History
            </p>
            <h3 className="mt-1 font-display text-base font-bold text-[#17372D]">
              {[selectedCustomer.first_name, selectedCustomer.last_name]
                .filter(Boolean)
                .join(' ') || selectedCustomer.username}
            </h3>
            <p className="mt-1 text-[10px] text-[#71817A]">
              {selectedCustomer.email} · {selectedCustomer.phone_number || 'No contact number'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedCustomer(null);
              setCustomerOrders([]);
            }}
            className="rounded-lg border border-[#DDE6E0] bg-white px-3 py-2 text-[10px] font-bold text-[#52645D] hover:bg-[#F1F8F4]"
          >
            Close Details
          </button>
        </div>

        {customerOrdersLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-xs text-[#71817A]">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading order history...
          </div>
        ) : customerOrders.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#71817A]">
            This customer has no recorded orders.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-white text-[9px] uppercase tracking-wider text-[#71817A]">
                <tr>
                  <th className="px-5 py-3">Order ID</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Fulfillment</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Grand Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5ECE8]">
                {customerOrders.map((order) => (
                  <tr key={order.id} className="text-[#405149]">
                    <td className="px-5 py-3 font-bold text-[#17372D]">{order.id}</td>
                    <td className="px-4 py-3">
                      {new Date(order.created_at).toLocaleString('en-PH', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3 capitalize">{order.fulfillment.replace('_', ' ')}</td>
                    <td className="px-4 py-3">{formatPaymentMethod(order.payment_method)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-[9px] font-bold capitalize ${
                          order.status === 'completed' || order.status === 'ready'
                            ? 'bg-emerald-50 text-emerald-700'
                            : order.status === 'cancelled' || order.status === 'rejected'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {order.status.split('_').join(' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-[#17372D]">
                      ₱{(order.total + Number(order.service_fee || 0) + Number(order.delivery_fee || 0)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    )}
  </div>
)}

{/* CUSTOMER MESSAGES */}
{activeTab === 'messages' && (
  <AdminMessages
    onOpenOrder={(orderId) => {
      setOrderSearch(orderId);
      setOrderDateFilter('');
      setOrderStatusFilter('all');
      setActiveTab('orders');
    }}
  />
)}

{/* TAB 2: ORDER MANAGER */}
{activeTab === 'orders' && (
  <div className="space-y-5 animate-fade-up">

    <section className="rounded-2xl border border-[#DDE6E0] bg-white px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#15803d]">
            Online Order Operations
          </p>
          <h2 className="mt-1 font-display text-xl font-extrabold text-[#17372D]">
            Fulfillment Center
          </h2>
          <p className="mt-1 text-xs text-[#71817A]">
            Review and progress Pickup, Delivery, and Shop &amp; Go orders without changing the existing fulfillment workflow.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-700">
            Active {dashboardPendingCount + dashboardProcessingCount}
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700">
            Completed {completedOrderCount}
          </span>
          <span className="rounded-full border border-steel-200 bg-steel-50 px-3 py-1.5 text-[10px] font-bold text-steel-600">
            Closed {dashboardCancelledCount}
          </span>

          <button
            type="button"
            onClick={() => void fetchOrders()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#15803d] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#166534] active:scale-[0.98]"
            title="Reload current order data"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>
    </section>

    {orders.length > 0 && (
  <div className="rounded-2xl border border-[#DDE6E0] bg-white p-4 shadow-sm">
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.2fr)_minmax(180px,0.7fr)_minmax(200px,0.8fr)_auto]">

      {/* ORDER ID SEARCH */}
      <label className="block">
        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#71817A]">
          Search Order ID
        </span>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#829089]" />

          <input
            type="search"
            value={orderSearch}
            onChange={(event) =>
              setOrderSearch(event.target.value)
            }
            placeholder="e.g. ORD-123..."
            className="w-full rounded-xl border border-[#DDE6E0] bg-[#F9FBFA] py-2.5 pl-9 pr-3 text-xs text-[#34463F] outline-none transition focus:border-[#2F7D5A] focus:ring-2 focus:ring-[#2F7D5A]/10"
          />
        </div>
      </label>

      {/* ORDER DATE */}
      <label className="block">
        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#71817A]">
          Order Date
        </span>

        <div className="relative">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#829089]" />

          <input
            type="date"
            value={orderDateFilter}
            onChange={(event) =>
              setOrderDateFilter(event.target.value)
            }
            className="w-full rounded-xl border border-[#DDE6E0] bg-[#F9FBFA] py-2.5 pl-9 pr-3 text-xs text-[#34463F] outline-none transition focus:border-[#2F7D5A] focus:ring-2 focus:ring-[#2F7D5A]/10"
          />
        </div>
      </label>

      {/* ORDER STATUS */}
      <label className="block">
        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#71817A]">
          Order Status
        </span>

        <select
          value={orderStatusFilter}
          onChange={(event) =>
            setOrderStatusFilter(
              event.target.value as
                | 'all'
                | Order['status']
            )
          }
          className="w-full rounded-xl border border-[#DDE6E0] bg-[#F9FBFA] px-3 py-2.5 text-xs font-semibold text-[#34463F] outline-none transition focus:border-[#2F7D5A] focus:ring-2 focus:ring-[#2F7D5A]/10"
        >
          <option value="all">
            All Statuses
          </option>

          <option value="pending">
            Pending
          </option>

          <option value="awaiting_payment">
            Awaiting Payment
          </option>

          <option value="approved">
            Approved
          </option>

          <option value="processing">
            Processing
          </option>

          <option value="ready">
            Ready for Pickup
          </option>

          <option value="out_for_delivery">
            Out for Delivery
          </option>

          <option value="failed_delivery">
            Failed Delivery
          </option>

          <option value="deactivated">
            Temporarily Deactivated
          </option>

          <option value="completed">
            Completed
          </option>

          <option value="cancelled">
            Cancelled
          </option>

          <option value="rejected">
            Rejected
          </option>
        </select>
      </label>

      {/* CLEAR FILTERS */}
      <div className="flex items-end">
        <button
          type="button"
          onClick={clearOrderFilters}
          disabled={!hasActiveOrderFilters}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#DDE6E0] bg-white px-4 py-2.5 text-xs font-bold text-[#52635B] transition hover:border-[#2F7D5A] hover:bg-[#F1F8F4] hover:text-[#2F7D5A] disabled:cursor-not-allowed disabled:opacity-40 xl:w-auto"
        >
          <X className="h-4 w-4" />
          Clear Filters
        </button>
      </div>
    </div>

    <div className="mt-3 border-t border-[#E5ECE8] pt-3">
      <p className="text-[10px] font-medium text-[#71817A]">
        Showing{' '}
        <span className="font-bold text-[#2F7D5A]">
          {filteredOrders.length}
        </span>{' '}
        of {orders.length} orders
      </p>
    </div>
  </div>
)}

    {orders.length === 0 ? (

  <div className="text-center py-12 bg-white border border-steel-200/60 rounded-2xl text-steel-500">
    <p className="text-xs">
      No orders logged in store database.
    </p>
  </div>

) : filteredOrders.length === 0 ? (

  <div className="rounded-2xl border border-[#DDE6E0] bg-white p-10 text-center shadow-sm">
    <Search className="mx-auto h-7 w-7 text-[#9AABA2]" />

    <h3 className="mt-3 text-sm font-bold text-[#17372D]">
      No matching orders
    </h3>

    <p className="mt-1 text-xs text-[#71817A]">
      No orders match the selected search or filters.
    </p>

    <button
      type="button"
      onClick={clearOrderFilters}
      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#2F7D5A] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#256548]"
    >
      <X className="h-4 w-4" />
      Clear Filters
    </button>
  </div>

) : (

  <div className="space-y-4">

    {filteredOrders.map((order, index) => {
      const group =
        getAdminOrderGroup(order);

      const previousGroup =
        index > 0
          ? getAdminOrderGroup(
              filteredOrders[
                index - 1
              ]
            )
          : null;

      const showGroupHeader =
        group !== previousGroup;

      const groupCount =
        filteredOrders.filter(
          (candidate) =>
            getAdminOrderGroup(
              candidate
            ) === group
        ).length;

      return (
        <React.Fragment key={order.id}>

          {showGroupHeader && (
            <div className="flex items-center justify-between gap-3 px-1 pt-1">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#52635B]">
                  {getAdminOrderGroupLabel(
                    group
                  )}
                </span>

                <p className="mt-0.5 text-[10px] text-steel-400">
                  {getAdminOrderGroupDescription(
                    group
                  )}
                </p>
              </div>

              <span className="rounded-full border border-[#DDE6E0] bg-white px-2.5 py-1 text-[9px] font-bold text-[#52635B]">
                {groupCount}
              </span>
            </div>
          )}

          <div
            ref={(node) => {
              orderCardRefs.current[
                order.id
              ] = node;
            }}
            className={`rounded-2xl border bg-white p-5 shadow-sm transition-all duration-500 ${
              recentlyUpdatedOrderId ===
              order.id
                ? 'border-emerald-400 ring-2 ring-emerald-200/70'
                : 'border-steel-200/60'
            }`}
          >

            {/* ORDER SUMMARY + COMPACT WORKFLOW TRACKER */}
            <div className="mb-4 rounded-xl border border-[#DDE6E0] bg-[#FBFDFC] p-4">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex flex-wrap items-center gap-4">

                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-steel-400">
                      Order ID
                    </span>

                    <h4 className="mt-0.5 text-sm font-bold text-steel-800">
                      {order.id}
                    </h4>
                  </div>

                  <div className="hidden h-7 w-px bg-steel-100 sm:block" />

                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-steel-400">
                      Fulfillment
                    </span>

                    <span className="mt-0.5 block text-xs font-bold text-steel-700">
                      {order.fulfillment === 'shop_go'
                        ? 'Shop & Go'
                        : order.fulfillment === 'delivery'
                          ? 'Delivery'
                          : 'Pickup'}
                    </span>
                  </div>

                  <div className="hidden h-7 w-px bg-steel-100 sm:block" />

                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-steel-400">
                      Payment
                    </span>

                    <span className="mt-0.5 block text-xs font-bold uppercase text-steel-700">
                      {formatPaymentMethod(
                        order.payment_method ||
                        order.paymentMethod ||
                        'cash'
                      )}
                    </span>
                  </div>

                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">

                  <button
                    type="button"
                    onClick={() =>
                      handlePrintOrderSlip(
                        order
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE6E0] bg-white px-3 py-2 text-[10px] font-bold text-[#2F7D5A] transition hover:border-emerald-300 hover:bg-emerald-50"
                    title="Print current order / fulfillment slip"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print Order
                  </button>

                  {Number(order.discount_amount || 0) > 0 && (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700">
                      First Order -20%
                    </span>
                  )}

                  <span className="text-sm font-bold text-steel-950">
                    ₱{(
                      Number(order.total) +
                      Number(order.service_fee || 0) +
                      Number(order.delivery_fee || 0)
                    ).toFixed(2)}
                  </span>

                  <span
                    className={`rounded px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${
                      order.status === 'completed'
                        ? 'border border-green-200 bg-green-50 text-green-700'
                        : order.status === 'approved'
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                          : order.status === 'processing'
                            ? 'border border-blue-200 bg-blue-50 text-blue-700'
                            : order.status === 'ready'
                              ? 'border border-teal-200 bg-teal-50 text-teal-700'
                              : order.status === 'out_for_delivery'
                                ? 'border border-indigo-200 bg-indigo-50 text-indigo-700'
                                : order.status === 'failed_delivery'
                                  ? 'border border-red-200 bg-red-50 text-red-700'
                                  : order.status === 'deactivated'
                                    ? 'border border-steel-200 bg-steel-100 text-steel-600'
                                    : order.status === 'rejected'
                                      ? 'border border-red-200 bg-red-50 text-red-700'
                                      : order.status === 'cancelled'
                                        ? 'border border-steel-200 bg-steel-100 text-steel-600'
                                        : 'border border-yellow-200 bg-yellow-50 text-yellow-700'
                    }`}
                  >
                    {getAdminOrderStatusLabel(
                      order
                    )}
                  </span>

                </div>

              </div>

              <div className="mt-3 border-t border-[#E5ECE8] pt-3">

                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#71817A]">
                    Fulfillment Progress
                  </span>

                  {[
                    'failed_delivery',
                    'deactivated'
                  ].includes(order.status) && (
                    <span className="text-[9px] font-bold text-red-700">
                      Progress paused:{' '}
                      {getAdminOrderStatusLabel(
                        order
                      )}
                    </span>
                  )}
                </div>

                <div className="relative grid grid-cols-5 gap-1.5 text-center">
                  <div className="absolute left-[9%] right-[9%] top-3.5 h-0.5 bg-[#E5ECE8]" />

                  {getAdminOrderWorkflow(
                    order
                  ).map(
                    (
                      step,
                      index,
                      steps
                    ) => {
                      const activeIndex =
                        steps.findIndex(
                          (candidate) =>
                            candidate.key ===
                            getAdminOrderProgressStatus(
                              order
                            )
                        );

                      const reached =
                        activeIndex >= index &&
                        ![
                          'cancelled',
                          'rejected'
                        ].includes(
                          order.status
                        );

                      return (
                        <div
                          key={step.key}
                          className="relative z-10 flex flex-col items-center"
                        >
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[9px] font-extrabold ${
                              reached
                                ? 'border-[#166534] bg-[#15803D] text-white'
                                : 'border-[#DDE6E0] bg-white text-[#71817A]'
                            }`}
                          >
                            {index + 1}
                          </span>

                          <span className="mt-1 text-[9px] font-bold leading-tight text-[#52635B]">
                            {step.label}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>

              </div>

            </div>

{/* CUSTOMER VERIFICATION */}
<div className="mb-4 rounded-xl border border-[#DDE6E0] bg-[#F7FAF8] p-4">

  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">

    <div>

      <span className="text-[10px] font-bold uppercase tracking-wider text-[#71817A]">
        Customer
      </span>

      <p className="text-sm font-bold text-[#17372D] mt-0.5">
        {[
          order.customer_first_name,
          order.customer_last_name
        ]
          .filter(Boolean)
          .join(' ') || 'Customer information unavailable'}
      </p>

    </div>


    <div>

      <span className="text-[10px] font-bold uppercase tracking-wider text-[#71817A]">
        Contact Number
      </span>

      <p className="text-sm font-semibold text-[#34463F] mt-0.5">
        {order.customer_phone_number ||
          'No contact number provided'}
      </p>

    </div>


    <div>

      <span className="text-[10px] font-bold uppercase tracking-wider text-[#71817A]">
        Email
      </span>

      <p className="text-sm font-semibold text-[#34463F] mt-0.5 break-all">
        {order.customer_email ||
          'No email provided'}
      </p>

    </div>


    {order.status === 'pending' && (
      <div className="lg:text-right">

        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200 text-[10px] font-bold">
          {order.fulfillment === 'pickup' ? 'For approval' : 'Verify customer before approval'}
        </span>

      </div>
    )}

  </div>

</div>

{/* AWAITING ONLINE PAYMENT — 48-HOUR REVIEW POINT */}
{order.status === 'awaiting_payment' &&
  (() => {
    const reviewPoint =
      paymentReviewPoint(order);

    if (!reviewPoint) {
      return null;
    }

    const reviewPointReached =
      reviewPoint.getTime() <=
      pickupDeadlineNow;

    return (
      <div
        className={`mb-4 rounded-xl border px-4 py-3 ${
          reviewPointReached
            ? 'border-red-200 bg-red-50'
            : 'border-amber-200 bg-amber-50/60'
        }`}
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span
              className={`block text-[10px] font-extrabold uppercase tracking-wider ${
                reviewPointReached
                  ? 'text-red-700'
                  : 'text-amber-700'
              }`}
            >
              {reviewPointReached
                ? '48-Hour Payment Period Passed — Store Review Required'
                : 'Awaiting Payment — 48-Hour Review Point'}
            </span>

            <p
              className={`mt-1 text-[10px] leading-relaxed ${
                reviewPointReached
                  ? 'font-semibold text-red-700'
                  : 'text-steel-500'
              }`}
            >
              {reviewPointReached
                ? 'The order remains active until the Admin cancels it. Continue Payment may still succeed while the order remains active, so verify payment status before cancellation.'
                : 'The customer may continue the existing PayMongo payment. This review point is exactly 48 hours from the original order placement time.'}
            </p>
          </div>

          <div className="shrink-0 rounded-lg border border-white/90 bg-white px-3 py-2">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-steel-400">
              48-Hour Payment Review Point
            </span>

            <strong
              className={`mt-1 block text-xs ${
                reviewPointReached
                  ? 'text-red-700'
                  : 'text-amber-800'
              }`}
            >
              {formatPickupDeadline(
                reviewPoint
              )}
            </strong>
          </div>
        </div>
      </div>
    );
  })()}

{/* PICKUP 48-HOUR ARRIVAL POLICY */}
{pickup48HourPolicyApplies(order) &&
  (() => {
    const deadline =
      pickupArrivalDeadline(order);

    if (!deadline) {
      return null;
    }

    const deadlineReached =
      deadline.getTime() <=
      pickupDeadlineNow;

      const reviewRequired =
  deadlineReached &&
  order.status === 'approved';

    return (
      <div
        className={`mb-4 rounded-xl border p-4 ${
          deadlineReached
            ? 'border-red-200 bg-red-50'
            : 'border-amber-200 bg-amber-50/60'
        }`}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span
              className={`block text-[10px] font-extrabold uppercase tracking-wider ${
                deadlineReached
                  ? 'text-red-700'
                  : 'text-amber-700'
              }`}
            >
              {reviewRequired
  ? 'Pickup Deadline Passed — Review Required'
  : 'Pickup — 48-Hour Arrival Policy'}
            </span>

<p
  className={`mt-1 text-[10px] ${
    reviewRequired
      ? 'font-semibold text-red-700'
      : 'text-steel-500'
  }`}
>
  {reviewRequired
    ? 'The 48-hour customer arrival period has ended. This order is still Approved and has not been cancelled. Review the order before deciding whether to cancel it or continue processing after customer verification.'
    : 'Applies to this Pickup order because no successful online payment has been verified.'}
</p>
          </div>

          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-bold ${
              deadlineReached
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {formatPickupTimeRemaining(
              deadline
            )}
          </span>
        </div>

{reviewRequired && (
  <div className="mt-4 rounded-lg border border-red-200 bg-white px-3 py-3">
    <span className="block text-[9px] font-extrabold uppercase tracking-wider text-red-700">
      Admin Review Required
    </span>

    <p className="mt-1 text-[10px] font-semibold leading-relaxed text-red-800">
      The Pickup deadline has passed, but this order has not been automatically cancelled. Confirm whether the customer has arrived before taking further action.
    </p>
  </div>
)}

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-white/80 bg-white px-3 py-2.5">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-steel-400">
              Order Placed
            </span>

            <strong className="mt-1 block text-xs text-[#17372D]">
              {order.created_at
                ? formatPickupDeadline(
                    new Date(
                      order.created_at
                    )
                  )
                : 'Unavailable'}
            </strong>
          </div>

          <div className="rounded-lg border border-white/80 bg-white px-3 py-2.5">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-steel-400">
              48-Hour Deadline
            </span>

            <strong
              className={`mt-1 block text-xs ${
                deadlineReached
                  ? 'text-red-700'
                  : 'text-amber-800'
              }`}
            >
              {formatPickupDeadline(
                deadline
              )}
            </strong>
          </div>

          <div className="rounded-lg border border-white/80 bg-white px-3 py-2.5">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-steel-400">
              Pickup / Verification Status
            </span>

            <strong
  className={`mt-1 block text-xs ${
    reviewRequired
      ? 'text-red-700'
      : 'text-[#17372D]'
  }`}
>
  {reviewRequired
    ? 'Deadline Passed — Awaiting Admin Review'
    : getPickupVerificationStatus(order)}
</strong>
          </div>
        </div>
      </div>
    );
  })()}

{/* CUSTOMER UPDATE HISTORY — STANDARD PICKUP */}
{order.fulfillment === 'pickup' && (() => {

  const history =
    order.message_history || [];

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 rounded-xl border border-[#DDE6E0] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#52635B]">
            Customer Update History
          </span>

          <p className="mt-1 text-[10px] text-steel-500">
            Previous messages remain available for this order.
          </p>
        </div>

        <span className="rounded-full border border-[#DDE6E0] bg-[#F7FAF8] px-2.5 py-1 text-[9px] font-bold text-[#52635B]">
          {history.length}{' '}
          {history.length === 1
            ? 'message'
            : 'messages'}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {history.map(
          (entry, index) => {
            const isLatest =
              index === history.length - 1;

            const messageDate =
              new Date(entry.created_at);

            const formattedDate =
              Number.isNaN(
                messageDate.getTime()
              )
                ? String(entry.created_at)
                : messageDate.toLocaleString(
                    'en-PH'
                  );

            return (
              <div
                key={entry.id}
                className={
                  isLatest
                    ? 'rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3'
                    : 'rounded-lg border border-[#E5ECE8] bg-[#F9FBFA] px-3 py-2.5'
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={
                      isLatest
                        ? 'text-[9px] font-extrabold uppercase tracking-wider text-emerald-700'
                        : 'text-[9px] font-bold uppercase tracking-wider text-steel-400'
                    }
                  >
                    {isLatest
                      ? 'Latest Update'
                      : 'Previous Update'}
                  </span>

                  <span className="text-[9px] font-medium text-steel-400">
                    {formattedDate}
                  </span>
                </div>

                <p
                  className={
                    isLatest
                      ? 'mt-1.5 whitespace-pre-wrap text-xs font-semibold leading-relaxed text-[#17372D]'
                      : 'mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-steel-600'
                  }
                >
                  {entry.message}
                </p>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
})()}

{/* PICKUP ADMIN MESSAGE */}
{order.fulfillment === 'pickup' && (
  <form
    className="mb-4 rounded-xl border border-[#DDE6E0] bg-[#F7FAF8] p-4"
    onSubmit={(event) => {
      event.preventDefault();

      void handleSaveAdminMessage(
        order.id,
        adminMessageDrafts[order.id] ?? ''
      );
    }}
  >
    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#52635B]">
      New Message to Customer
    </label>

    <p className="mt-1 text-[10px] text-steel-400">
      Add a new update. Previous messages will remain in the history above.
    </p>

    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
      <textarea
        name="adminMessage"
        maxLength={500}
        rows={2}
        disabled={
          order.status === 'completed'
        }
        value={
          adminMessageDrafts[order.id] ??
          ''
        }
        onChange={(event) =>
          setAdminMessageDrafts(
            (current) => ({
              ...current,
              [order.id]:
                event.target.value,
            })
          )
        }
        placeholder={
          order.status === 'completed'
            ? 'Completed orders are closed.'
            : 'Write a new pickup update for the customer.'
        }
        className="min-h-20 flex-1 rounded-xl border border-[#DDE6E0] bg-white px-3 py-2 text-xs text-[#34463F] focus:border-[#2F7D5A] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/15 disabled:cursor-not-allowed disabled:bg-steel-100 disabled:text-steel-500"
      />

      <button
        type="submit"
        disabled={
          order.status ===
            'completed' ||
          !(
            adminMessageDrafts[
              order.id
            ] ?? ''
          ).trim()
        }
        className="self-end rounded-xl bg-[#2F7D5A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#256548] disabled:cursor-not-allowed disabled:bg-steel-300"
      >
        Update Message
      </button>
    </div>
  </form>
)}

{/* DELIVERY REVIEW */}
{order.fulfillment === 'delivery' && (

  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/40 p-4">

    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-4">

      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
          Delivery Request — Admin Review
        </span>

        <h4 className="text-sm font-bold text-[#17372D] mt-1">
  Review delivery details and system-calculated fee
</h4>

<p className="text-[10px] text-steel-500 mt-1">
  The delivery fee is calculated automatically from the
  order&apos;s load classification and the configured
  barangay delivery rate. Update future rates through
  Delivery Rate Management.
</p>
      </div>

      <span className="inline-flex self-start px-3 py-1.5 rounded-lg bg-white text-amber-700 border border-amber-200 text-[10px] font-bold capitalize">
        {order.delivery_load_class
          ? `${order.delivery_load_class} load`
          : 'Load class unavailable'}
      </span>

    </div>


    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">

      <div className="rounded-lg bg-white border border-amber-100 p-3">
        <span className="text-[9px] font-bold uppercase tracking-wider text-steel-400 block">
          Delivery Contact
        </span>
        <p className="text-xs font-bold text-steel-800 mt-1">
          {order.delivery_contact_person ||
            'Not provided'}
        </p>
      </div>

      <div className="rounded-lg bg-white border border-amber-100 p-3">
        <span className="text-[9px] font-bold uppercase tracking-wider text-steel-400 block">
          Contact Number
        </span>
        <p className="text-xs font-bold text-steel-800 mt-1">
          {order.delivery_contact_number ||
            'Not provided'}
        </p>
      </div>

      <div className="rounded-lg bg-white border border-amber-100 p-3">
        <span className="text-[9px] font-bold uppercase tracking-wider text-steel-400 block">
          Municipality
        </span>
        <p className="text-xs font-bold text-steel-800 mt-1">
          {order.delivery_municipality || 'Initao'}
        </p>
      </div>

      <div className="rounded-lg bg-white border border-amber-100 p-3">
        <span className="text-[9px] font-bold uppercase tracking-wider text-steel-400 block">
          Barangay
        </span>
        <p className="text-xs font-bold text-steel-800 mt-1">
          {order.delivery_barangay ||
            'Not provided'}
        </p>
      </div>

      <div className="rounded-lg bg-white border border-amber-100 p-3">
        <span className="text-[9px] font-bold uppercase tracking-wider text-steel-400 block">
          Load Classification
        </span>
        <p className="text-xs font-bold text-steel-800 mt-1 capitalize">
          {order.delivery_load_class ||
            'Not available'}
        </p>
      </div>

    </div>


    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">

      <div className="rounded-lg bg-white border border-amber-100 p-3">
        <span className="text-[9px] font-bold uppercase tracking-wider text-steel-400 block">
          Complete Delivery Address
        </span>
        <p className="text-xs font-semibold text-steel-800 mt-1 whitespace-pre-wrap">
          {order.delivery_address ||
            'No complete address provided'}
        </p>
        <p className="text-[10px] text-steel-500 mt-2">
          Landmark: {order.delivery_landmark ||
            'None provided'}
        </p>
      </div>

      <div className="rounded-lg bg-white border border-amber-100 p-3">
        <span className="text-[9px] font-bold uppercase tracking-wider text-steel-400 block">
          Customer Delivery Instructions
        </span>
        <p className="text-xs font-semibold text-steel-800 mt-1 whitespace-pre-wrap">
          {order.delivery_instructions ||
            'No special instructions provided'}
        </p>
      </div>

    </div>

    {order.delivery_latitude !== null &&
      order.delivery_latitude !== undefined &&
      order.delivery_longitude !== null &&
      order.delivery_longitude !== undefined && (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-700">
            Delivery Location
          </span>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-semibold text-emerald-900">
              Location pin confirmed
            </span>
            <a
              href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(String(order.delivery_latitude))}&mlon=${encodeURIComponent(String(order.delivery_longitude))}#map=18/${encodeURIComponent(String(order.delivery_latitude))}/${encodeURIComponent(String(order.delivery_longitude))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50"
            >
              <MapPin className="h-3.5 w-3.5" />
              View on OpenStreetMap
            </a>
          </div>
        </div>
      )}


    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">

      <div className="rounded-lg bg-white border border-amber-100 p-3">
        <span className="text-[9px] font-bold uppercase tracking-wider text-steel-400 block">
          Product Subtotal
        </span>
        <p className="text-sm font-bold text-steel-900 mt-1">
          ₱{Number(order.total).toFixed(2)}
        </p>
        {Number(order.discount_amount || 0) > 0 && (
          <p className="mt-1 text-[9px] font-semibold text-emerald-700">
            20% first-order discount applied (-₱{Number(order.discount_amount).toFixed(2)})
          </p>
        )}
      </div>

      <div className="rounded-lg bg-white border border-amber-100 p-3">
        <span className="text-[9px] font-bold uppercase tracking-wider text-steel-400 block">
          System-Calculated Delivery Fee
        </span>
        <p className="text-sm font-bold text-amber-700 mt-1">
          {order.delivery_fee === null ||
           order.delivery_fee === undefined
            ? 'Unavailable'
            : `₱${Number(order.delivery_fee).toFixed(2)}`}
        </p>
      </div>

      <div className="rounded-lg bg-white border border-amber-100 p-3">
        <span className="text-[9px] font-bold uppercase tracking-wider text-steel-400 block">
          Total Due
        </span>
        <p className="text-sm font-bold text-[#17372D] mt-1">
          ₱{(
            Number(order.total) +
            Number(order.delivery_fee || 0)
          ).toFixed(2)}
        </p>
      </div>

    </div>

{/* DELIVERY VERIFICATION POLICY */}
{order.status === 'pending' &&
  hasSuccessfulOnlinePayment(order) && (
    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
            Payment Verified — Delivery Review
          </span>

          <p className="mt-1 text-[10px] font-medium leading-relaxed text-emerald-900">
            The customer&apos;s online payment has been successfully verified.
            No Cash-on-Delivery 48-hour verification deadline applies to this
            paid order. Confirm the customer&apos;s phone number and delivery
            address as needed before approval.
          </p>
        </div>

        <span className="inline-flex shrink-0 rounded-full border border-emerald-200 bg-white px-3 py-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-700">
          Payment Verified
        </span>
      </div>
    </div>
  )}

{delivery48HourPolicyApplies(order) &&
  (() => {
    const deadline =
      deliveryVerificationDeadline(
        order
      );

    if (!deadline) {
      return null;
    }

    const deadlineReached =
      deadline.getTime() <=
      pickupDeadlineNow;

    return (
      <div
        className={`mb-4 rounded-xl border p-4 ${
          deadlineReached
            ? 'border-red-200 bg-red-50/70'
            : 'border-amber-200 bg-amber-50/70'
        }`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span
              className={`block text-[10px] font-extrabold uppercase tracking-wider ${
                deadlineReached
                  ? 'text-red-700'
                  : 'text-amber-700'
              }`}
            >
              Delivery — 48-Hour Verification Policy
            </span>

            <p
              className={`mt-1 text-[10px] font-medium leading-relaxed ${
                deadlineReached
                  ? 'text-red-800'
                  : 'text-amber-900'
              }`}
            >
              Rayjin Hardware should verify the customer&apos;s phone number
              and delivery address within 48 hours from the original order
              placement time. The order is not rejected automatically when
              this deadline passes.
            </p>
          </div>

          <span
            className={`inline-flex shrink-0 rounded-full border bg-white px-3 py-1 text-[9px] font-extrabold uppercase tracking-wider ${
              deadlineReached
                ? 'border-red-200 text-red-700'
                : 'border-amber-200 text-amber-700'
            }`}
          >
            {deadlineReached
              ? 'Admin Review Required'
              : formatPickupTimeRemaining(
                  deadline
                )}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-white/80 bg-white px-3 py-2.5">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-steel-400">
              Order Placed
            </span>

            <strong className="mt-1 block text-xs text-[#17372D]">
              {order.created_at
                ? formatPickupDeadline(
                    new Date(
                      order.created_at
                    )
                  )
                : 'Unavailable'}
            </strong>
          </div>

          <div className="rounded-lg border border-white/80 bg-white px-3 py-2.5">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-steel-400">
              48-Hour Verification Deadline
            </span>

            <strong
              className={`mt-1 block text-xs ${
                deadlineReached
                  ? 'text-red-700'
                  : 'text-amber-800'
              }`}
            >
              {formatPickupDeadline(
                deadline
              )}
            </strong>
          </div>

          <div className="rounded-lg border border-white/80 bg-white px-3 py-2.5">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-steel-400">
              Verification Status
            </span>

            <strong
              className={`mt-1 block text-xs ${
                deadlineReached
                  ? 'text-red-700'
                  : 'text-[#17372D]'
              }`}
            >
              {deadlineReached
                ? 'Deadline Passed — Admin Review Required'
                : 'Awaiting Phone / Address Verification'}
            </strong>
          </div>
        </div>

        {deadlineReached && (
          <p className="mt-3 text-[10px] font-semibold leading-relaxed text-red-800">
            This Delivery order has not been rejected automatically.
            Review whether customer verification was completed before using
            the existing rejection or approval workflow.
          </p>
        )}
      </div>
    );
  })()}
  {/* DELIVERY CUSTOMER UPDATE HISTORY */}
{(() => {
  const history =
    order.message_history || [];

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 rounded-xl border border-[#DDE6E0] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#52635B]">
            Customer Update History
          </span>

          <p className="mt-1 text-[10px] text-steel-500">
            Previous messages remain available for this Delivery order.
          </p>
        </div>

        <span className="rounded-full border border-[#DDE6E0] bg-[#F7FAF8] px-2.5 py-1 text-[9px] font-bold text-[#52635B]">
          {history.length}{' '}
          {history.length === 1
            ? 'message'
            : 'messages'}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {history.map(
          (entry, index) => {
            const isLatest =
              index ===
              history.length - 1;

            const messageDate =
              new Date(
                entry.created_at
              );

            const formattedDate =
              Number.isNaN(
                messageDate.getTime()
              )
                ? String(
                    entry.created_at
                  )
                : messageDate.toLocaleString(
                    'en-PH'
                  );

            return (
              <div
                key={entry.id}
                className={
                  isLatest
                    ? 'rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3'
                    : 'rounded-lg border border-[#E5ECE8] bg-[#F9FBFA] px-3 py-2.5'
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={
                      isLatest
                        ? 'text-[9px] font-extrabold uppercase tracking-wider text-emerald-700'
                        : 'text-[9px] font-bold uppercase tracking-wider text-steel-400'
                    }
                  >
                    {isLatest
                      ? 'Latest Update'
                      : 'Previous Update'}
                  </span>

                  <span className="text-[9px] font-medium text-steel-400">
                    {formattedDate}
                  </span>
                </div>

                <p
                  className={
                    isLatest
                      ? 'mt-1.5 whitespace-pre-wrap text-xs font-semibold leading-relaxed text-[#17372D]'
                      : 'mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-steel-600'
                  }
                >
                  {entry.message}
                </p>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
})()}

      <form
  onSubmit={(event) => {
  event.preventDefault();

  void handleSaveAdminMessage(
    order.id,
    adminMessageDrafts[order.id] ?? ''
  );
}}
  className="space-y-3"
>
  <div>
    <label className="block text-[10px] font-bold text-steel-500 uppercase tracking-wider mb-1">
      Message to Customer
      <span className="normal-case font-medium text-steel-400 ml-1">
        (Optional)
      </span>
    </label>





<textarea
  name="adminMessage"
  maxLength={500}
  rows={3}
  disabled={[
    'completed',
    'rejected',
    'cancelled'
  ].includes(order.status)}
  value={
    adminMessageDrafts[order.id] ??
    ''
  }
  onChange={(event) =>
    setAdminMessageDrafts(
      (current) => ({
        ...current,
        [order.id]:
          event.target.value,
      })
    )
  }
  placeholder="Write a new delivery update for the customer."
  className="w-full px-3 py-2.5 text-xs rounded-xl border border-steel-200 bg-white text-steel-800 placeholder:text-steel-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none disabled:bg-steel-100 disabled:text-steel-500"
/>
  </div>

  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-[10px] text-steel-500">
      The delivery fee is system-calculated and cannot be manually changed for this order.
    </p>

    <button
      type="submit"
      disabled={
  [
    'completed',
    'rejected',
    'cancelled'
  ].includes(order.status) ||
  !(
    adminMessageDrafts[
      order.id
    ] ?? ''
  ).trim()
}
      className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-steel-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95"
    >
      Update Message
    </button>
  </div>
</form>

  </div>

)}

{/* SHOP & GO — COMPACT EXPRESS PICKUP WORK AREA */}
{order.fulfillment === 'shop_go' &&
  (() => {
    const scheduleEditable =
      order.status === 'pending';

    const history =
      order.message_history || [];

    const latestUpdate =
      history.length > 0
        ? history[
            history.length - 1
          ]
        : null;

    const previousUpdates =
      history.slice(
        0,
        Math.max(
          history.length - 1,
          0
        )
      );

    const previousUpdatesExpanded =
      Boolean(
        expandedAdminOrderUpdates[
          order.id
        ]
      );

    const requestedPickupAt =
      shopGoScheduleDateTime(
        order.requested_pickup_date,
        order.requested_pickup_time
      );

    const hasConfirmedSchedule =
      Boolean(
        order.status !==
          'awaiting_payment' &&
        order.scheduled_pickup_date &&
        order.scheduled_pickup_time
      );

    const requestedPickupPassed =
      Boolean(
        requestedPickupAt &&
        !hasConfirmedSchedule &&
        requestedPickupAt.getTime() <=
          pickupDeadlineNow
      );

    const verificationDeadline =
      shopGo48HourPolicyApplies(
        order
      )
        ? shopGoVerificationDeadline(
            order
          )
        : null;

    const verificationDeadlineReached =
      Boolean(
        verificationDeadline &&
        verificationDeadline.getTime() <=
          pickupDeadlineNow
      );

    const onlinePaymentVerified =
      hasSuccessfulOnlinePayment(
        order
      );

    const formatHistoryDate = (
      value: string
    ) => {
      const date =
        new Date(value);

      return Number.isNaN(
        date.getTime()
      )
        ? String(value)
        : date.toLocaleString(
            'en-PH'
          );
    };

    return (
      <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/35 p-4">

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Shop & Go — Express Pickup
            </span>

            <h4 className="mt-1 text-sm font-bold text-[#17372D]">
              Schedule, customer updates, and pickup coordination
            </h4>

            <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-steel-500">
              The final pickup schedule may be confirmed or changed only while the order is Pending. Once the order is approved, the confirmed schedule becomes read-only.
            </p>
          </div>

          <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-[360px]">

            <div className="rounded-lg border border-emerald-100 bg-white px-3 py-2.5">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-steel-400">
                Customer Requested
              </span>

              <strong className="mt-1 block text-xs text-steel-800">
                {order.requested_pickup_date
                  ? normalizePickupDateForInput(
                      order.requested_pickup_date
                    )
                  : 'No requested date'}
                {order.requested_pickup_time
                  ? ` · ${normalizePickupTimeForInput(
                      order.requested_pickup_time
                    )}`
                  : ''}
              </strong>
            </div>

            <div className="rounded-lg border border-emerald-100 bg-white px-3 py-2.5">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                Confirmed Schedule
              </span>

              <strong className="mt-1 block text-xs text-[#17372D]">
                {hasConfirmedSchedule
                  ? `${normalizePickupDateForInput(
                      order.scheduled_pickup_date
                    )} · ${normalizePickupTimeForInput(
                      order.scheduled_pickup_time
                    )}`
                  : order.status ===
                      'awaiting_payment'
                    ? 'Awaiting payment and Admin confirmation'
                    : 'Awaiting Admin confirmation'}
              </strong>
            </div>

          </div>

        </div>

        {order.status ===
          'awaiting_payment' && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <span className="block text-[9px] font-extrabold uppercase tracking-wider text-amber-700">
              Schedule Confirmation Locked — Awaiting Payment
            </span>

            <p className="mt-1 text-[10px] leading-relaxed text-amber-800">
              The customer&apos;s requested time remains visible for reference, but the final Shop & Go schedule cannot be confirmed until successful PayMongo payment verification returns the order to Pending.
            </p>
          </div>
        )}

        {requestedPickupPassed && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-white px-3 py-2.5">
            <span className="block text-[9px] font-extrabold uppercase tracking-wider text-amber-700">
              Requested Pickup Time Reached
            </span>

            <p className="mt-1 text-[10px] leading-relaxed text-amber-800">
              {order.status ===
              'awaiting_payment'
                ? 'The customer’s requested pickup time has passed while payment is still incomplete. Keep the final schedule locked until payment is verified, then contact the customer and arrange a new confirmed pickup schedule if needed.'
                : 'The customer’s requested pickup time has passed and no final schedule has been confirmed. Contact the customer and set a new confirmed pickup date and time before approval.'}
            </p>
          </div>
        )}

        {order.status === 'pending' &&
          onlinePaymentVerified && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <span className="block text-[9px] font-extrabold uppercase tracking-wider text-emerald-700">
                Payment Verified — Schedule Review
              </span>

              <p className="mt-1 text-[10px] leading-relaxed text-emerald-800">
                The online payment has been successfully verified. No Cash Shop & Go 48-hour verification deadline applies. Confirm the final pickup schedule before approving the order.
              </p>
            </div>
          )}

        {verificationDeadline && (
          <div
            className={`mt-3 rounded-lg border px-3 py-2.5 ${
              verificationDeadlineReached
                ? 'border-red-200 bg-red-50'
                : 'border-amber-200 bg-amber-50'
            }`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span
                  className={`block text-[9px] font-extrabold uppercase tracking-wider ${
                    verificationDeadlineReached
                      ? 'text-red-700'
                      : 'text-amber-700'
                  }`}
                >
                  {verificationDeadlineReached
                    ? 'Shop & Go Verification Period Passed — Review Required'
                    : 'Shop & Go — 48-Hour Verification Policy'}
                </span>

                <p
                  className={`mt-1 text-[10px] leading-relaxed ${
                    verificationDeadlineReached
                      ? 'font-semibold text-red-700'
                      : 'text-amber-800'
                  }`}
                >
                  {verificationDeadlineReached
                    ? 'The Cash Shop & Go verification and schedule-confirmation period has ended. The order has not been rejected automatically. Review the order before deciding whether to confirm a schedule or reject it.'
                    : 'Cash Shop & Go verification and final schedule confirmation should be completed within 48 hours from the original order placement time.'}
                </p>
              </div>

              <div className="shrink-0 rounded-lg border border-white/90 bg-white px-3 py-2">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-steel-400">
                  48-Hour Verification Point
                </span>

                <strong
                  className={`mt-1 block text-xs ${
                    verificationDeadlineReached
                      ? 'text-red-700'
                      : 'text-amber-800'
                  }`}
                >
                  {formatPickupDeadline(
                    verificationDeadline
                  )}
                </strong>
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 grid gap-2 sm:grid-cols-3">

          <div className="rounded-lg border border-emerald-100 bg-white p-3">
            <span className="text-[9px] font-bold uppercase tracking-wider text-steel-400">
              Product Subtotal
            </span>
            <p className="mt-1 text-sm font-bold text-steel-900">
              ₱{Number(
                order.total
              ).toFixed(2)}
            </p>
            {Number(order.discount_amount || 0) > 0 && (
              <p className="mt-1 text-[9px] font-semibold text-emerald-700">
                20% first-order discount applied (-₱{Number(order.discount_amount).toFixed(2)})
              </p>
            )}
          </div>

          <div className="rounded-lg border border-emerald-100 bg-white p-3">
            <span className="text-[9px] font-bold uppercase tracking-wider text-steel-400">
              Shop &amp; Go Service Fee
            </span>
            <p className="mt-1 text-sm font-bold text-emerald-700">
              ₱{Number(
                order.service_fee ||
                50
              ).toFixed(2)}
            </p>
          </div>

          <div className="rounded-lg border border-emerald-100 bg-white p-3">
            <span className="text-[9px] font-bold uppercase tracking-wider text-steel-400">
              Order Total
            </span>
            <p className="mt-1 text-sm font-bold text-[#17372D]">
              ₱{(
                Number(order.total) +
                Number(
                  order.service_fee ||
                  50
                )
              ).toFixed(2)}
            </p>
          </div>

        </div>

        <form
          onSubmit={(event) =>
            handleSaveShopGoSchedule(
              order.id,
              event
            )
          }
          className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-emerald-100 bg-white p-3 md:grid-cols-2"
        >

          <div>
            <label className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-steel-500">
              Final Pickup Date
            </label>

            <input
              type="date"
              name="scheduledPickupDate"
              required={
                scheduleEditable
              }
              disabled={
                !scheduleEditable
              }
              defaultValue={normalizePickupDateForInput(
                order.status ===
                  'awaiting_payment'
                  ? order.requested_pickup_date
                  : order.scheduled_pickup_date ||
                    order.requested_pickup_date
              )}
              className="w-full rounded-lg border border-steel-200 bg-white px-3 py-2.5 text-xs text-steel-800 outline-none focus:border-[#2F7D5A] focus:ring-2 focus:ring-[#2F7D5A]/20 disabled:cursor-not-allowed disabled:bg-steel-50 disabled:text-steel-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-steel-500">
              Final Pickup Time
            </label>

            <input
              type="time"
              name="scheduledPickupTime"
              required={
                scheduleEditable
              }
              disabled={
                !scheduleEditable
              }
              defaultValue={normalizePickupTimeForInput(
                order.status ===
                  'awaiting_payment'
                  ? order.requested_pickup_time
                  : order.scheduled_pickup_time ||
                    order.requested_pickup_time
              )}
              className="w-full rounded-lg border border-steel-200 bg-white px-3 py-2.5 text-xs text-steel-800 outline-none focus:border-[#2F7D5A] focus:ring-2 focus:ring-[#2F7D5A]/20 disabled:cursor-not-allowed disabled:bg-steel-50 disabled:text-steel-500"
            />
          </div>

          <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] leading-relaxed text-steel-500">
              {scheduleEditable
                ? 'Confirming the schedule does not approve the order. Approve only after the final pickup schedule has been saved.'
                : order.status ===
                    'awaiting_payment'
                  ? 'Schedule confirmation unlocks after successful payment verification.'
                  : 'The confirmed schedule is read-only after the order leaves Pending status.'}
            </p>

            {scheduleEditable && (
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-[#2F7D5A] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#256548] active:scale-95"
              >
                {hasConfirmedSchedule
                  ? 'Edit Confirmed Schedule'
                  : 'Save Confirmed Schedule'}
              </button>
            )}
          </div>

        </form>

        <div className="mt-3 rounded-xl border border-[#DDE6E0] bg-white p-3">

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="block text-[9px] font-extrabold uppercase tracking-wider text-[#52635B]">
                Customer Update History
              </span>

              <p className="mt-0.5 text-[10px] text-steel-500">
                The latest message stays visible. Older messages are collapsed to keep the work area compact.
              </p>
            </div>

            <span className="rounded-full border border-[#DDE6E0] bg-[#F7FAF8] px-2.5 py-1 text-[9px] font-bold text-[#52635B]">
              {history.length}{' '}
              {history.length === 1
                ? 'message'
                : 'messages'}
            </span>
          </div>

          {latestUpdate ? (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-700">
                  Latest Update
                </span>

                <span className="text-[9px] font-medium text-steel-400">
                  {formatHistoryDate(
                    latestUpdate.created_at
                  )}
                </span>
              </div>

              <p className="mt-1 whitespace-pre-wrap text-[11px] font-semibold leading-relaxed text-[#17372D]">
                {latestUpdate.message}
              </p>
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed border-[#DDE6E0] bg-[#F9FBFA] px-3 py-2.5 text-[10px] text-steel-500">
              No customer updates have been sent for this Shop & Go order yet.
            </div>
          )}

          {previousUpdates.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                aria-expanded={
                  previousUpdatesExpanded
                }
                onClick={() =>
                  setExpandedAdminOrderUpdates(
                    (current) => ({
                      ...current,
                      [order.id]:
                        !current[
                          order.id
                        ],
                    })
                  )
                }
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-[#E5ECE8] bg-[#F9FBFA] px-3 py-2 text-left transition hover:border-emerald-200 hover:bg-emerald-50/50"
              >
                <span>
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-steel-500">
                    Previous Updates
                  </span>

                  <span className="mt-0.5 block text-[10px] text-steel-400">
                    {previousUpdates.length}{' '}
                    {previousUpdates.length ===
                    1
                      ? 'older message'
                      : 'older messages'}
                  </span>
                </span>

                <span className="rounded-full border border-[#DDE6E0] bg-white px-2.5 py-1 text-[9px] font-bold text-[#2F7D5A]">
                  {previousUpdatesExpanded
                    ? 'Hide'
                    : 'View'}
                </span>
              </button>

              {previousUpdatesExpanded && (
                <div className="mt-2 space-y-2">
                  {previousUpdates.map(
                    (entry) => (
                      <div
                        key={
                          entry.id
                        }
                        className="rounded-lg border border-[#E5ECE8] bg-[#F9FBFA] px-3 py-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-steel-400">
                            Previous Update
                          </span>

                          <span className="text-[9px] font-medium text-steel-400">
                            {formatHistoryDate(
                              entry.created_at
                            )}
                          </span>
                        </div>

                        <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-steel-600">
                          {entry.message}
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        <form
          className="mt-3 rounded-xl border border-emerald-100 bg-white p-3"
          onSubmit={(event) => {
            event.preventDefault();

            void handleSaveAdminMessage(
              order.id,
              adminMessageDrafts[
                order.id
              ] ?? ''
            );
          }}
        >
          <div>
            <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-700">
              Message to Customer
            </span>

            <p className="mt-0.5 text-[10px] text-steel-400">
              Send a new Shop & Go update. Previous messages remain in the update history above.
            </p>
          </div>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <textarea
              name="shopGoAdminMessage"
              maxLength={500}
              rows={2}
              disabled={[
                'completed',
                'cancelled',
                'rejected'
              ].includes(
                order.status
              )}
              value={
                adminMessageDrafts[
                  order.id
                ] ?? ''
              }
              onChange={(event) =>
                setAdminMessageDrafts(
                  (current) => ({
                    ...current,
                    [order.id]:
                      event.target
                        .value,
                  })
                )
              }
              placeholder={
                [
                  'completed',
                  'cancelled',
                  'rejected'
                ].includes(
                  order.status
                )
                  ? 'This order is closed.'
                  : 'Write a new Shop & Go / Express Pickup update for the customer.'
              }
              className="min-h-20 flex-1 rounded-lg border border-[#DDE6E0] bg-white px-3 py-2 text-xs text-[#34463F] outline-none focus:border-[#2F7D5A] focus:ring-2 focus:ring-[#2F7D5A]/15 disabled:cursor-not-allowed disabled:bg-steel-100 disabled:text-steel-500"
            />

            <button
              type="submit"
              disabled={
                [
                  'completed',
                  'cancelled',
                  'rejected'
                ].includes(
                  order.status
                ) ||
                !(
                  adminMessageDrafts[
                    order.id
                  ] ?? ''
                ).trim()
              }
              className="self-end rounded-lg bg-[#2F7D5A] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#256548] disabled:cursor-not-allowed disabled:bg-steel-300"
            >
              Update Message
            </button>
          </div>
        </form>

      </div>
    );
  })()}

            {/* ORDER ITEMS + ACTIONS */}
            <div className="flex flex-wrap gap-4 items-center justify-between">

              {/* PRODUCTS */}
              <div className="flex items-center gap-2 flex-wrap">

                {order.items.map((item, idx) => (

                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-steel-50 border border-steel-100 rounded-lg p-1.5"
                  >

                    {renderProductImage(
                      item.product.image,
                      item.product.category,
                      'w-6 h-6 object-contain',
                      'text-xl'
                    )}

                    <div className="leading-tight">

                      <span className="text-xs font-semibold text-steel-800 block max-w-[120px] truncate">
                        {item.product.name}
                      </span>

                      <span className="text-[9px] text-steel-500">
                        Quantity: {item.quantity}
                      </span>

                    </div>

                  </div>

                ))}

              </div>


              {/* ORDER ACTION */}
              {order.status === 'completed' ? (

                <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Order Complete
                </span>

              ) : order.status === 'rejected' ? (

                <span className="text-xs font-semibold text-red-600">
                  Order Rejected
                </span>

              ) : order.status === 'cancelled' ? (

                <span className="text-xs font-semibold text-steel-500">
                  Order Cancelled
                </span>

              ) : order.status === 'awaiting_payment' ? (

                <div className="text-right">

                  <span className="text-xs font-semibold text-yellow-600 block">
                    Waiting for Payment
                  </span>

                  <span className="text-[10px] text-steel-400">
                    Approval is available after payment confirmation.
                  </span>

                </div>

              ) : order.status === 'pending' ? (

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">

                  <div className="mr-2">

<span className="text-xs font-semibold text-yellow-700 block">
  {order.fulfillment === 'delivery'
    ? 'Review & Approve Delivery'
    : order.fulfillment === 'shop_go'
      ? 'Review & Approve Shop & Go'
      : 'Review & Approve Pickup'}
</span>

                    <span className="text-[10px] text-steel-400">
                      {order.fulfillment === 'delivery'
                        ? 'Review the address and system-calculated delivery fee before approving.'
                        : order.fulfillment === 'shop_go'
                          ? order.scheduled_pickup_date &&
                            order.scheduled_pickup_time
                            ? 'Final pickup schedule confirmed. Verify the order and payment before approving.'
                            : 'Confirm the final pickup schedule before approving this Shop & Go order.'
                          : 'Review the customer and order details, then approve the Standard Pickup order.'}
                    </span>

                  </div>
{isPaidOnlineOrder(order) ? (
  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-right">
    <span className="block text-[9px] font-extrabold uppercase tracking-wider text-emerald-700">
      Paid Online Order
    </span>

    <span className="mt-0.5 block text-[10px] font-semibold text-emerald-800">
      Reject action locked
    </span>
  </div>
) : (
  <button
    onClick={() =>
      handleRejectOrder(order.id)
    }
    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold rounded-lg transition-all active:scale-95"
  >
    Reject Order
  </button>
)}

                  <button
                    onClick={() =>
                      handleAdvanceOrderStatus(
                        order.id
                      )
                    }
                    disabled={
                      order.fulfillment ===
                        'shop_go' &&
                      !(
                        order.scheduled_pickup_date &&
                        order.scheduled_pickup_time
                      )
                    }
                    className="px-4 py-2 bg-[#2F7D5A] hover:bg-[#256548] disabled:bg-steel-300 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95"
                  >
                    {order.fulfillment === 'delivery'
                      ? 'Approve Delivery'
                      : order.fulfillment ===
                          'shop_go' &&
                        !(
                          order.scheduled_pickup_date &&
                          order.scheduled_pickup_time
                        )
                        ? 'Confirm Schedule First'
                        : 'Approve Order'}
                  </button>

                </div>

              ) : order.status === 'approved' ? (

                <div className="flex flex-col items-end gap-1.5">
                  {order.fulfillment === 'pickup' && (
  <div className="max-w-md rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-right">
    <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-800">
      Awaiting Customer Arrival
    </span>

    <span className="mt-0.5 block text-[10px] leading-relaxed text-amber-700">
      {(order.payment_method ||
        order.paymentMethod ||
        'cash') === 'cash'
        ? `Please wait for the customer to arrive and present Order ID ${order.id}. Verify the Order ID and complete the required in-store cash payment before starting order processing and preparation.`
        : `Payment confirmed. Please wait for the customer to arrive and present Order ID ${order.id}. Order processing and preparation should begin only after the Order ID has been verified.`}
    </span>
  </div>
)}
                  <button
                    onClick={() =>
                      handleAdvanceOrderStatus(
                        order.id
                      )
                    }
                    className="px-4 py-2 bg-[#2F7D5A] hover:bg-[#256548] text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95"
                  >
                {order.fulfillment === 'pickup'
  ? 'Verify Order ID & Start Processing'
  : 'Start Processing'}
                  </button>
                </div>

              ) : order.status === 'processing' ? (

                <button
                  onClick={() =>
                    handleAdvanceOrderStatus(
                      order.id
                    )
                  }
                  className="px-4 py-2 bg-[#2F7D5A] hover:bg-[#256548] text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95"
                >
                  {order.fulfillment === 'delivery'
                  ? 'Mark Out for Delivery'
                  : 'Mark Ready for Pickup'}
                </button>

              ) : order.status === 'ready' || order.status === 'out_for_delivery' ? (

                <button
                  onClick={() =>
                    handleAdvanceOrderStatus(
                      order.id
                    )
                  }
                  className="px-4 py-2 bg-[#2F7D5A] hover:bg-[#256548] text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95"
                >
                  Mark Completed
                </button>

              ) : order.status === 'failed_delivery' || order.status === 'deactivated' ? (
                <button
                  onClick={() => handleOrderAction(order, 'reactivate')}
                  className="px-4 py-2 bg-[#2F7D5A] hover:bg-[#256548] text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Reactivate Order
                </button>
              ) : null}

            </div>

{(() => {
  const canDeactivate =
    canDeactivateDeliveryOrder(order);

  const canMarkFailedDelivery =
    order.fulfillment === 'delivery' &&
    order.status === 'out_for_delivery';

  const canCancelDelivery =
    canPermanentlyCancelDelivery(order);

  const canCancelStandard =
    canCancelStandardOrder(order);

  const hasSecondaryActions =
    canDeactivate ||
    canMarkFailedDelivery ||
    canCancelDelivery ||
    canCancelStandard;

  if (!hasSecondaryActions) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-steel-100 pt-4">
      {canMarkFailedDelivery && (
        <button
          type="button"
          onClick={() =>
            handleOrderAction(
              order,
              'failed_delivery'
            )
          }
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-800 hover:bg-amber-100"
        >
          Failed Delivery
        </button>
      )}

      {canDeactivate && (
        <button
          type="button"
          onClick={() =>
            handleOrderAction(
              order,
              'deactivate'
            )
          }
          className="rounded-lg border border-steel-200 bg-steel-50 px-3 py-2 text-[10px] font-bold text-steel-700 hover:bg-steel-100"
        >
          Deactivate Order
        </button>
      )}

      {order.fulfillment === 'delivery' &&
        canCancelDelivery &&
        (isPaidOnlineOrder(order) ? (
          <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-left sm:ml-auto sm:max-w-xl">
            <span className="block text-[9px] font-extrabold uppercase tracking-wider text-emerald-700">
              Paid Online Order — Cancellation Locked
            </span>

            <p className="mt-1 text-[10px] font-semibold leading-relaxed text-emerald-800">
              This order has a successfully verified PayMongo payment. Reject and Cancel actions are unavailable because refund processing is not supported by this system.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() =>
              handleOrderAction(
                order,
                'cancel_permanently'
              )
            }
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700 hover:bg-red-100"
          >
            {order.status === 'awaiting_payment'
              ? 'Cancel Unpaid Order'
              : 'Cancel Order Permanently'}
          </button>
        ))}

      {order.fulfillment !== 'delivery' &&
        canCancelStandard &&
        (isPaidOnlineOrder(order) ? (
          <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-left sm:ml-auto sm:max-w-xl">
            <span className="block text-[9px] font-extrabold uppercase tracking-wider text-emerald-700">
              Paid Online Order — Cancellation Locked
            </span>

            <p className="mt-1 text-[10px] font-semibold leading-relaxed text-emerald-800">
              This order has a successfully verified PayMongo payment. Reject and Cancel actions are unavailable because refund processing is not supported by this system.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() =>
              handleOrderAction(
                order,
                'cancel'
              )
            }
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700 hover:bg-red-100"
          >
            {order.status === 'awaiting_payment'
              ? 'Cancel Unpaid Order'
              : 'Cancel Order'}
          </button>
        ))}
    </div>
  );
})()}

          </div>

        </React.Fragment>
      );
    })}

      </div>

    )}

  </div>
)}

        {/* DELIVERY RATE SETTINGS */}
        {activeTab === 'deliveryRates' && (
          <div className="space-y-5 animate-fade-up">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold font-display text-steel-950">
                  Delivery Rates
                </h2>
                <p className="text-sm text-steel-500 mt-1">
                  Manage delivery availability and barangay surcharges for Initao, Libertad, Naawan, and Gitagum.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchDeliveryRateSettings}
                disabled={deliveryRatesLoading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-steel-200 text-steel-700 text-xs font-semibold rounded-xl hover:bg-steel-50 disabled:opacity-60"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    deliveryRatesLoading ? 'animate-spin' : ''
                  }`}
                />
                Refresh Rates
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white border border-steel-200/70 rounded-2xl p-4 shadow-sm">
                <span className="text-[10px] uppercase tracking-wider font-bold text-steel-400">
                  Light-item base
                </span>
                <p className="text-xl font-bold text-[#173F33] mt-1">₱60</p>
              </div>

              <div className="bg-white border border-steel-200/70 rounded-2xl p-4 shadow-sm">
                <span className="text-[10px] uppercase tracking-wider font-bold text-steel-400">
                  Standard-load base
                </span>
                <p className="text-xl font-bold text-[#173F33] mt-1">₱150</p>
              </div>

              <div className="bg-white border border-steel-200/70 rounded-2xl p-4 shadow-sm">
                <span className="text-[10px] uppercase tracking-wider font-bold text-steel-400">
                  Bulky-load base
                </span>
                <p className="text-xl font-bold text-[#173F33] mt-1">₱300</p>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-xs text-emerald-800">
              <strong>Estimated delivery fee</strong> = the highest product-load base fee
              + the selected municipality/barangay surcharge. The Admin may still confirm a different
              final fee while reviewing difficult-to-reach delivery addresses.
            </div>

            <div className="rounded-2xl border border-steel-200/70 bg-white p-4 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-steel-900">Add Delivery Area</h3>
                <p className="mt-1 text-[10px] leading-relaxed text-steel-500">
                  Add only client-approved municipality/barangay rates. No surcharge is generated automatically.
                  New areas are unavailable by default unless you explicitly mark them Active.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-steel-500">
                  Municipality
                  <select
                    value={newDeliveryRate.municipality}
                    onChange={(event) =>
                      setNewDeliveryRate((current) => ({
                        ...current,
                        municipality: event.target.value,
                        barangay: '',
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-steel-200 bg-white px-3 py-2 text-xs normal-case tracking-normal outline-none focus:border-[#2F7D5A]"
                  >
                    <option value="">Select municipality</option>
                    {deliveryAreas.municipalities.map((municipality) => (
                      <option key={municipality} value={municipality}>{municipality}</option>
                    ))}
                  </select>
                </label>

                <label className="text-[10px] font-bold uppercase tracking-wider text-steel-500">
                  Barangay
                  <select
                    value={newDeliveryRate.barangay}
                    disabled={!newDeliveryRate.municipality}
                    onChange={(event) =>
                      setNewDeliveryRate((current) => ({
                        ...current,
                        barangay: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-steel-200 bg-white px-3 py-2 text-xs normal-case tracking-normal outline-none focus:border-[#2F7D5A] disabled:bg-steel-50"
                  >
                    <option value="">Select barangay</option>
                    {(deliveryAreas.barangays[newDeliveryRate.municipality] || [])
                      .filter((barangay) =>
                        !deliveryRateSettings.some(
                          (rate) =>
                            rate.municipality === newDeliveryRate.municipality &&
                            rate.barangay === barangay
                        )
                      )
                      .map((barangay) => (
                        <option key={barangay} value={barangay}>{barangay}</option>
                      ))}
                  </select>
                </label>

                <label className="text-[10px] font-bold uppercase tracking-wider text-steel-500">
                  Zone
                  <select
                    value={newDeliveryRate.zone}
                    onChange={(event) =>
                      setNewDeliveryRate((current) => ({
                        ...current,
                        zone: event.target.value as '' | DeliveryZone,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-steel-200 bg-white px-3 py-2 text-xs normal-case tracking-normal outline-none focus:border-[#2F7D5A]"
                  >
                    <option value="">Select zone</option>
                    <option value="poblacion">Poblacion</option>
                    <option value="near">Near</option>
                    <option value="medium">Medium</option>
                    <option value="far">Far</option>
                  </select>
                </label>

                <label className="text-[10px] font-bold uppercase tracking-wider text-steel-500">
                  Surcharge
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-steel-500">₱</span>
                    <input
                      type="number"
                      min="0"
                      max="5000"
                      step="1"
                      value={newDeliveryRate.surcharge}
                      onChange={(event) =>
                        setNewDeliveryRate((current) => ({
                          ...current,
                          surcharge: event.target.value,
                        }))
                      }
                      placeholder="Client-approved amount"
                      className="w-full rounded-lg border border-steel-200 bg-white py-2 pl-7 pr-3 text-xs normal-case tracking-normal outline-none focus:border-[#2F7D5A]"
                    />
                  </div>
                </label>

                <div className="flex items-end gap-2">
                  <label className="flex h-9 items-center gap-2 rounded-lg border border-steel-200 bg-steel-50 px-3 text-[10px] font-bold text-steel-600">
                    <input
                      type="checkbox"
                      checked={newDeliveryRate.is_active}
                      onChange={(event) =>
                        setNewDeliveryRate((current) => ({
                          ...current,
                          is_active: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 accent-[#2F7D5A]"
                    />
                    Active
                  </label>
                  <button
                    type="button"
                    onClick={handleAddDeliveryRate}
                    disabled={addingDeliveryRate}
                    className="h-9 flex-1 rounded-lg bg-[#2F7D5A] px-3 text-[10px] font-bold text-white hover:bg-[#256548] disabled:opacity-60"
                  >
                    {addingDeliveryRate ? 'Adding…' : 'Add Area'}
                  </button>
                </div>
              </div>
            </div>

            {deliveryRatesMessage && (
              <div
                className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
                  deliveryRatesMessage.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                {deliveryRatesMessage.text}
              </div>
            )}

            <div className="bg-white border border-steel-200/70 rounded-2xl shadow-sm overflow-hidden">
              {deliveryRatesLoading && deliveryRateSettings.length === 0 ? (
                <div className="py-16 text-center text-sm text-steel-500">
                  Loading delivery rates…
                </div>
              ) : deliveryRateSettings.length === 0 ? (
                <div className="py-16 text-center text-sm text-steel-500">
                  No delivery-rate records were found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left">
                    <thead className="bg-[#F5F7F5] border-b border-steel-200">
                      <tr className="text-[10px] uppercase tracking-wider text-steel-500">
                        <th className="px-5 py-3 font-bold">Municipality</th>
                        <th className="px-5 py-3 font-bold">Barangay</th>
                        <th className="px-5 py-3 font-bold">Zone</th>
                        <th className="px-5 py-3 font-bold">Surcharge</th>
                        <th className="px-5 py-3 font-bold">Delivery</th>
                        <th className="px-5 py-3 font-bold text-right">Action</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-steel-100">
                      {deliveryRateSettings.map((rate) => (
                        <tr
                          key={rate.id}
                          className={
                            rate.is_active
                              ? 'hover:bg-steel-50/50'
                              : 'bg-steel-50/70 opacity-75'
                          }
                        >
                          <td className="px-5 py-4">
                            <span className="text-xs font-bold text-steel-700">
                              {rate.municipality}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-[#2F7D5A]/10 text-[#2F7D5A] flex items-center justify-center">
                                <MapPin className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-bold text-steel-800">
                                {rate.barangay}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <select
                              value={rate.zone}
                              onChange={(e) =>
                                updateDeliveryRateDraft(rate.id, {
                                  zone: e.target.value as DeliveryZone,
                                })
                              }
                              className="w-full px-3 py-2 rounded-lg border border-steel-200 bg-white text-xs font-semibold outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A]"
                            >
                              <option value="poblacion">Poblacion</option>
                              <option value="near">Near</option>
                              <option value="medium">Medium</option>
                              <option value="far">Far</option>
                            </select>
                          </td>

                          <td className="px-5 py-4">
                            <div className="relative max-w-[170px]">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-steel-500">
                                ₱
                              </span>
                              <input
                                type="number"
                                min="0"
                                max="5000"
                                step="1"
                                value={rate.surcharge}
                                onChange={(e) =>
                                  updateDeliveryRateDraft(rate.id, {
                                    surcharge: Number(e.target.value),
                                  })
                                }
                                className="w-full pl-7 pr-3 py-2 rounded-lg border border-steel-200 bg-white text-xs font-semibold outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A]"
                              />
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={rate.is_active}
                                onChange={(e) =>
                                  updateDeliveryRateDraft(rate.id, {
                                    is_active: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 accent-[#2F7D5A]"
                              />
                              <span
                                className={`text-xs font-bold ${
                                  rate.is_active
                                    ? 'text-green-700'
                                    : 'text-steel-400'
                                }`}
                              >
                                {rate.is_active
                                  ? 'Active'
                                  : 'Unavailable'}
                              </span>
                            </label>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleSaveDeliveryRate(rate)}
                              disabled={savingDeliveryRateId === rate.id}
                              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-[#2F7D5A] hover:bg-[#256548] text-white text-xs font-semibold rounded-lg disabled:opacity-60"
                            >
                              <Save className="w-3.5 h-3.5" />
                              {savingDeliveryRateId === rate.id
                                ? 'Saving…'
                                : 'Save'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: INVENTORY MANAGER */}
        {activeTab === 'products' && (
          <div className="space-y-6 animate-fade-up">

            {/* Opening Inventory */}
<div className="hidden">
  <div className="mb-4">
    <h3 className="text-base font-bold font-display text-steel-950">
      Opening Inventory
    </h3>

    <p className="text-xs text-steel-500 mt-1">
      Record the initial acquisition cost of existing stock before the product
      is sold.
    </p>
  </div>

  {openingInventoryStatus === 'success' && (
    <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded-xl text-xs font-semibold">
      {openingInventoryMessage}
    </div>
  )}

  {openingInventoryStatus === 'error' && (
    <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold">
      {openingInventoryMessage}
    </div>
  )}

  <form
    onSubmit={handleOpeningInventory}
    className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
  >
    <div>
      <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
        Product
      </label>

      <select
        value={openingInventory.product_id}
        onChange={(e) => {
          const productId = e.target.value;

          const selectedProduct = products.find(
            (product) => product.id === Number(productId)
          );

          setOpeningInventory({
            ...openingInventory,
            product_id: productId,
            supplier_id: selectedProduct?.supplier_id
              ? String(selectedProduct.supplier_id)
              : '',
          });
        }}
        required
        className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
      >
        <option value="">Select Product</option>

        {products.map((product) => (
          <option
            key={product.id}
            value={String(product.id)}
          >
            {product.name} — Stock: {product.stock}
          </option>
        ))}
      </select>
    </div>

    <div>
      <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
        Supplier
      </label>

      <select
        value={openingInventory.supplier_id}
        onChange={(e) =>
          setOpeningInventory({
            ...openingInventory,
            supplier_id: e.target.value,
          })
        }
        className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
      >
        <option value="">No Supplier</option>

        {suppliers
          .filter((supplier) => supplier.status === 'Active')
          .map((supplier) => (
            <option
              key={supplier.supplier_id}
              value={String(supplier.supplier_id)}
            >
              {supplier.supplier_name}
            </option>
          ))}
      </select>
    </div>

    <div>
      <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
        Opening Cost / Unit (₱)
      </label>

      <input
        type="number"
        min="0.01"
        step="0.01"
        required
        value={openingInventory.supplier_price}
        onChange={(e) =>
          setOpeningInventory({
            ...openingInventory,
            supplier_price: e.target.value,
          })
        }
        placeholder="0.00"
        className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
      />
    </div>

    <button
      type="submit"
      disabled={openingInventoryStatus === 'loading'}
      className="w-full py-2.5 bg-construction-500 hover:bg-construction-600 text-white font-bold rounded-lg text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {openingInventoryStatus === 'loading'
        ? 'Recording...'
        : 'Record Opening Inventory'}
    </button>
  </form>
</div>

{/* Stock Receiving moved to the dedicated Receive Stock tab. */}
<div className="hidden">
  <div className="mb-4">
    <h3 className="text-base font-bold font-display text-steel-950">
      Receive Stock
    </h3>

    <p className="text-xs text-steel-500 mt-1">
      Record newly received inventory from a supplier and update the product stock.
    </p>
  </div>

  {stockReceivingStatus === 'success' && (
    <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded-xl text-xs font-semibold">
      {stockReceivingMessage}
    </div>
  )}

  {stockReceivingStatus === 'error' && (
    <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold">
      {stockReceivingMessage}
    </div>
  )}

  <form
    onSubmit={handleStockReceiving}
    className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end"
  >
    {/* Product */}
    <div>
      <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
        Product
      </label>

      <select
        value={stockReceiving.product_id}
        onChange={(e) => {
          const productId = e.target.value;

          const selectedProduct = products.find(
            (product) => product.id === Number(productId)
          );

          setStockReceiving({
            ...stockReceiving,
            product_id: productId,
            supplier_id: selectedProduct?.supplier_id
              ? String(selectedProduct.supplier_id)
              : '',
            selling_price: selectedProduct
              ? String(selectedProduct.price)
              : '',
          });
        }}
        required
        className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
      >
        <option value="">Select Product</option>

        {products.map((product) => (
          <option
            key={product.id}
            value={String(product.id)}
          >
            {product.name} — Stock: {product.stock}
          </option>
        ))}
      </select>
    </div>

    {/* Supplier */}
    <div>
      <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
        Supplier
      </label>

      <select
        value={stockReceiving.supplier_id}
        onChange={(e) =>
          setStockReceiving({
            ...stockReceiving,
            supplier_id: e.target.value,
          })
        }
        required
        className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
      >
        <option value="">Select Supplier</option>

        {suppliers
          .filter((supplier) => supplier.status === 'Active')
          .map((supplier) => (
            <option
              key={supplier.supplier_id}
              value={String(supplier.supplier_id)}
            >
              {supplier.supplier_name}
            </option>
          ))}
      </select>
    </div>

    {/* Quantity */}
    <div>
      <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
        Quantity
      </label>

      <input
        type="number"
        min="1"
        step="1"
        required
        value={stockReceiving.quantity}
        onChange={(e) =>
          setStockReceiving({
            ...stockReceiving,
            quantity: e.target.value,
          })
        }
        placeholder="0"
        className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
      />
    </div>

    {/* Supplier Cost */}
    <div>
      <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
        Supplier Cost (₱)
      </label>

      <input
        type="number"
        min="0.01"
        step="0.01"
        required
        value={stockReceiving.supplier_price}
        onChange={(e) =>
          setStockReceiving({
            ...stockReceiving,
            supplier_price: e.target.value,
          })
        }
        placeholder="0.00"
        className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
      />
    </div>

    {/* Selling Price */}
    <div>
      <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
        Selling Price (₱)
      </label>

      <input
        type="number"
        min="0.01"
        step="0.01"
        value={stockReceiving.selling_price}
        onChange={(e) =>
          setStockReceiving({
            ...stockReceiving,
            selling_price: e.target.value,
          })
        }
        placeholder="Current price"
        className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
      />
    </div>

    {/* Submit */}
    <button
      type="submit"
      disabled={stockReceivingStatus === 'loading'}
      className="w-full py-2.5 bg-construction-500 hover:bg-construction-600 text-white font-bold rounded-lg text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {stockReceivingStatus === 'loading'
        ? 'Receiving...'
        : 'Receive Stock'}
    </button>
  </form>
</div>

            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
              {/* Product Adder Form */}
              <div className="lg:col-span-4 bg-white border border-steel-200/60 rounded-2xl p-5 shadow-sm h-fit">
                <h3 className="text-base font-bold font-display text-steel-950 border-b border-steel-100 pb-3 mb-4">
                  {editingProduct ? 'Edit Product Details' : 'Add Product / Opening Inventory'}
                </h3>

                {productStatus === 'success' && (
                  <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl flex items-center gap-2 border border-green-200 text-xs font-semibold">
                    <CheckCircle className="w-4 h-4" /> Product saved successfully!
                  </div>
                )}

                <form onSubmit={handleSaveProduct} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">Product Name</label>
                    <input 
                      type="text" 
                      required
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      placeholder="e.g. Stanley Tape Measure 8m"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500 placeholder:text-steel-400"
                    />
                  </div>

                  {/* Description */}
<div>
  <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
    Description
    <span className="ml-1 normal-case font-medium text-steel-400">
      (Optional)
    </span>
  </label>

  <textarea
    value={newProduct.description}
    onChange={(e) =>
      setNewProduct({
        ...newProduct,
        description: e.target.value
      })
    }
    rows={3}
    placeholder="Short product description"
    className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500 placeholder:text-steel-400 resize-y"
  />
</div>

{/* Unit + Reorder Level */}
<div className="grid grid-cols-2 gap-3">
  <div>
    <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
      Unit of Measurement
    </label>

    <input
      type="text"
      required
      maxLength={50}
      value={newProduct.unit}
      onChange={(e) =>
        setNewProduct({
          ...newProduct,
          unit: e.target.value
        })
      }
      placeholder="e.g. piece, bag, kilo"
      className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500 placeholder:text-steel-400"
    />
  </div>

  <div>
    <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
      Reorder Level
    </label>

    <input
      type="number"
      required
      min="0"
      max="100000"
      step="1"
      value={newProduct.reorder_level}
      onChange={(e) =>
        setNewProduct({
          ...newProduct,
          reorder_level: e.target.value
        })
      }
      placeholder="10"
      className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
    />
  </div>
</div>


                  {/* Barcode */}
<div>
  <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
    Barcode
    <span className="ml-1 normal-case font-medium text-steel-400">
      (Optional)
    </span>
  </label>

  <div className="flex gap-2">
    <div className="relative min-w-0 flex-1">
      <ScanBarcode className="w-4 h-4 text-steel-400 absolute left-3 top-1/2 -translate-y-1/2" />

      <input
        type="text"
        value={newProduct.barcode}
        onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
        maxLength={100}
        autoComplete="off"
        placeholder="Scan or enter product barcode"
        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A] placeholder:text-steel-400"
      />
    </div>
    <button
      type="button"
      onClick={handleGenerateBarcode}
      className="shrink-0 rounded-lg border border-[#B9D8C7] bg-[#EEF8F2] px-3 text-[10px] font-bold text-[#0D7740] hover:bg-[#E0F1E7]"
      title="Generate a unique product code"
    >
      Auto-generate
    </button>
  </div>

  <p className="text-[10px] text-steel-400 mt-1">
    Scan or enter a barcode manually, or generate a unique Rayjin product code.
  </p>
</div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">Price (₱)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                        placeholder="19.99"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
                        {editingProduct ? 'Current Stock' : 'Stock Qty'}
                      </label>
                      <input 
                        type="number" 
                        required
                        readOnly={Boolean(editingProduct)}
                        value={newProduct.stock}
                        onChange={(e) => {
                          if (!editingProduct) setNewProduct({ ...newProduct, stock: e.target.value });
                        }}
                        placeholder="25"
                        className={`w-full px-3 py-2 text-xs rounded-lg border border-steel-200 text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500 ${editingProduct ? 'bg-steel-50 cursor-not-allowed' : 'bg-white'}`}
                      />
                      {editingProduct && (
                        <p className="mt-1 text-[9px] leading-4 text-amber-700">
                          Stock is ledger-controlled. Use Stock Adjustment / Physical Count for verified discrepancies.
                        </p>
                      )}
                    </div>
                  </div>

                  {!editingProduct && Number(newProduct.stock || 0) > 0 && (
                    <div className="rounded-xl border border-[#CDE4D6] bg-[#F2FAF5] p-3">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#52635B]">
                        Opening Supplier Cost / Unit (₱)
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        value={newProduct.opening_supplier_price}
                        onChange={(event) => setNewProduct({
                          ...newProduct,
                          opening_supplier_price: event.target.value,
                        })}
                        placeholder="Required when opening stock is above zero"
                        className="mt-2 w-full rounded-lg border border-[#B9D8C7] bg-white px-3 py-2 text-xs text-steel-950 focus:border-[#2F7D5A] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/15"
                      />
                      <p className="mt-1 text-[10px] text-[#71817A]">
                        The product and its opening Stock-In movement are saved together. Rayjin automatically assigns an OPEN system reference after saving.
                      </p>

                      <div className="mt-3 border-t border-[#DCEBE2] pt-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#2F7D5A]">Supplier Documentation</p>
                        <p className="mt-1 text-[9px] leading-4 text-[#71817A]">Optional supporting documentation for later audit and reference.</p>
                      </div>

                      <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-[#52635B]">
                        Supplier Reference No. <span className="normal-case font-medium text-[#819087]">(Optional)</span>
                        <input
                          type="text"
                          maxLength={120}
                          value={newProduct.opening_supplier_reference}
                          onChange={(event) => setNewProduct({
                            ...newProduct,
                            opening_supplier_reference: event.target.value,
                          })}
                          placeholder="DR / SI / invoice number when available"
                          className="mt-2 w-full rounded-lg border border-[#B9D8C7] bg-white px-3 py-2 text-xs normal-case tracking-normal text-steel-950 focus:border-[#2F7D5A] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/15"
                        />
                        <span className="mt-1 block text-[9px] font-medium normal-case tracking-normal text-[#819087]">
                          Enter the supplier's invoice, delivery receipt, or document number when available.
                        </span>
                      </label>

                      <div className="mt-3 border-t border-[#DCEBE2] pt-3">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#52635B]">
                          Supplier Receipt / Delivery Document <span className="normal-case font-medium text-[#819087]">(Optional)</span>
                        </label>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <label className="cursor-pointer rounded-lg border border-[#B9D8C7] bg-white px-3 py-2 text-[10px] font-bold text-[#0D7740] transition hover:bg-[#EAF7EF]">
                            {newProduct.opening_receipt_image ? 'Replace Receipt' : 'Attach Receipt'}
                            <input
                              key={newProduct.opening_receipt_image ? 'opening-receipt-attached' : 'opening-receipt-empty'}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={handleOpeningReceiptChange}
                            />
                          </label>

                          {newProduct.opening_receipt_image && (
                            <>
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-bold text-emerald-700">
                                <CheckCircle className="h-3 w-3" /> Receipt attached
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setNewProduct((current) => ({
                                    ...current,
                                    opening_receipt_image: '',
                                  }))
                                }
                                className="text-[10px] font-bold text-red-600 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </div>

                        <p className="mt-1.5 text-[9px] leading-4 text-[#819087]">
                          JPG, PNG, or WEBP up to 5 MB. Supporting documents are linked to this single Opening Inventory Stock-In record and do not affect stock or costing.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">Category</label>
                    <select
                      value={newProduct.category}
                      onChange={(e) =>
                      setNewProduct({
                       ...newProduct,
                      category: e.target.value
                      })
  }
  className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
>
  <option value="" disabled>
  Select Category
</option>

  {categories.map((category) => (
    <option
      key={category.category_id}
      value={category.category_name}
    >
      {category.category_name}
    </option>
  ))}
</select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">Brand</label>
                      <input 
                        type="text" 
                        value={newProduct.brand}
                        onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                        placeholder="DeWalt"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500 placeholder:text-steel-400"
                      />
                    </div>
                  </div>
<div>
  <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
    Supplier
  </label>

  <select
    value={newProduct.supplier_id}
    required={!editingProduct && Number(newProduct.stock || 0) > 0}
    onChange={(e) =>
      setNewProduct({
        ...newProduct,
        supplier_id: e.target.value
      })
    }
    className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
  >
    <option value="">
      Select Supplier
    </option>

    {suppliers
      .filter((supplier) => supplier.status === 'Active')
      .map((supplier) => (
        <option
          key={supplier.supplier_id}
          value={String(supplier.supplier_id)}
        >
          {supplier.supplier_name}
        </option>
      ))}
  </select>
</div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 space-y-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                        Delivery Classification
                      </span>
                      <p className="text-[10px] text-steel-500 mt-1">
                        This determines the product's base delivery fee.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
                          Load Class
                        </label>

                        <select
                          value={newProduct.delivery_class}
                          onChange={(e) => {
                            const deliveryClass =
                              e.target.value as DeliveryLoadClass;

                            setNewProduct({
                              ...newProduct,
                              delivery_class: deliveryClass,
                              bulk_quantity_threshold:
                                deliveryClass === 'bulky'
                                  ? ''
                                  : newProduct.bulk_quantity_threshold
                            });
                          }}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        >
                          <option value="light">
                            Light — ₱60 base
                          </option>
                          <option value="standard">
                            Standard — ₱150 base
                          </option>
                          <option value="bulky">
                            Bulky — ₱300 base
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
                          Bulky Threshold
                          <span className="ml-1 normal-case font-medium text-steel-400">
                            (Optional)
                          </span>
                        </label>

                        <input
                          type="number"
                          min="1"
                          max="100000"
                          step="1"
                          value={newProduct.bulk_quantity_threshold}
                          disabled={newProduct.delivery_class === 'bulky'}
                          onChange={(e) =>
                            setNewProduct({
                              ...newProduct,
                              bulk_quantity_threshold:
                                e.target.value
                            })
                          }
                          placeholder={
                            newProduct.delivery_class === 'bulky'
                              ? 'Always bulky'
                              : 'Example: 4'
                          }
                          className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:bg-steel-100 disabled:text-steel-400"
                        />
                      </div>
                    </div>

                    <p className="text-[9px] leading-relaxed text-steel-500">
                      Leave the threshold blank when quantity does not change the class. Example: cement is Standard with threshold 4, so four or more bags become Bulky.
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/35 p-3 space-y-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                        Fulfillment Availability
                      </span>
                      <p className="text-[10px] text-steel-500 mt-1">
                        Choose whether customers may use all fulfillment methods or Delivery only.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className={`cursor-pointer rounded-lg border p-3 transition-all ${
                        newProduct.fulfillment_rule === 'all'
                          ? 'border-emerald-500 bg-white ring-1 ring-emerald-500/15'
                          : 'border-steel-200 bg-white/70 hover:border-emerald-200'
                      }`}>
                        <div className="flex items-start gap-2">
                          <input
                            type="radio"
                            name="fulfillment_rule"
                            value="all"
                            checked={newProduct.fulfillment_rule === 'all'}
                            onChange={() => setNewProduct({ ...newProduct, fulfillment_rule: 'all' })}
                            className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <span className="block text-xs font-bold text-steel-800">All methods</span>
                            <span className="mt-0.5 block text-[9px] leading-relaxed text-steel-500">
                              Pickup + Shop &amp; Go + Delivery
                            </span>
                          </div>
                        </div>
                      </label>

                      <label className={`cursor-pointer rounded-lg border p-3 transition-all ${
                        newProduct.fulfillment_rule === 'delivery_only'
                          ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500/15'
                          : 'border-steel-200 bg-white/70 hover:border-amber-200'
                      }`}>
                        <div className="flex items-start gap-2">
                          <input
                            type="radio"
                            name="fulfillment_rule"
                            value="delivery_only"
                            checked={newProduct.fulfillment_rule === 'delivery_only'}
                            onChange={() => setNewProduct({ ...newProduct, fulfillment_rule: 'delivery_only' })}
                            className="mt-0.5 text-amber-600 focus:ring-amber-500"
                          />
                          <div>
                            <span className="block text-xs font-bold text-steel-800">Delivery only</span>
                            <span className="mt-0.5 block text-[9px] leading-relaxed text-steel-500">
                              For heavy or impractical-to-pick-up products.
                            </span>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">Status</label>
                    <select
                      value={newProduct.status}
                      onChange={(e) => setNewProduct({ ...newProduct, status: e.target.value as 'active' | 'inactive' })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">Product Photo</label>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-steel-100 flex items-center justify-center border border-steel-200/60 overflow-hidden shrink-0">
                        {renderProductImage(newProduct.image, newProduct.category, "w-full h-full object-cover", "text-2xl")}
                      </div>
                      <label className="cursor-pointer bg-steel-50 hover:bg-steel-100/80 text-steel-700 text-xs font-bold px-3 py-2 rounded-lg border border-steel-200 transition-all select-none active:scale-[0.98]">
                        Choose Photo
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleImageChange}
                        />
                      </label>
                      {newProduct.image && (newProduct.image.startsWith('/') || newProduct.image.startsWith('data:')) && (
                        <button
                          type="button"
                          onClick={() => setNewProduct({ ...newProduct, image: '🛠️' })}
                          className="text-red-500 hover:text-red-700 text-xs font-bold transition-colors ml-auto"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-grow py-2.5 bg-construction-500 hover:bg-construction-600 text-white font-bold rounded-lg text-xs shadow-md transition-all active:scale-95"
                    >
                      {editingProduct ? 'Save Changes' : 'Add Product'}
                    </button>
                    {editingProduct && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(null);
setNewProduct({
  name: '',
  description: '',
  unit: '',
  barcode: '',
  price: '',
  category: '',
  supplier_id: '',
  image: '🛠️',
  stock: '',
  reorder_level: '10',
  brand: '',
  status: 'active',
  delivery_class: 'standard',
  bulk_quantity_threshold: '',
  fulfillment_rule: 'all',
  opening_supplier_price: '',
  opening_supplier_reference: '',
  opening_receipt_image: '',
});
                        }}
                        className="py-2.5 px-3 bg-steel-100 hover:bg-steel-200 text-steel-700 font-bold rounded-lg text-xs transition-all active:scale-95"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

{/* Product catalog view */}
<div className="min-w-0 rounded-2xl border border-[#DDE6E0] bg-white p-5 shadow-sm lg:col-span-8 lg:h-[650px] lg:flex lg:flex-col">

  {/* Header */}
  <div className="mb-4 flex items-start justify-between gap-4">
    <div className="min-w-0">
      <h3 className="text-base font-bold font-display text-[#17372D]">
        Active Stock Control
      </h3>

      <p className="text-xs text-[#71817A] mt-1">
        Search and manage current inventory items.
      </p>
    </div>

    <div className="shrink-0 rounded-full border border-[#DDE6E0] bg-[#F7FAF8] px-2.5 py-1 text-[10px] font-bold text-[#52635B]">
      {filteredInventoryProducts.length} {filteredInventoryProducts.length === 1 ? 'product' : 'products'}
    </div>
  </div>

  {/* Search and Filters */}
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_170px_150px_150px] gap-3 border-b border-[#DDE6E0] pb-4 mb-4">

    {/* Search */}
    <div className="relative min-w-0">
      <Search className="w-4 h-4 text-[#71817A] absolute left-3 top-1/2 -translate-y-1/2" />

      <input
        type="text"
        value={inventorySearch}
        onChange={(e) => setInventorySearch(e.target.value)}
        placeholder="Search inventory..."
        className="w-full min-w-0 pl-9 pr-3 py-2.5 text-sm rounded-xl border border-[#DDE6E0] bg-white text-[#34463F] placeholder:text-[#8A9892] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A]"
      />
    </div>

    {/* Category Filter */}
    <select
      value={inventoryCategoryFilter}
      onChange={(e) =>
        setInventoryCategoryFilter(e.target.value)
      }
      className="w-full min-w-0 px-3 py-2.5 text-sm rounded-xl border border-[#DDE6E0] bg-white text-[#34463F] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A]"
    >
      <option value="all">
        All Categories
      </option>

      {categories.map((category) => (
        <option
          key={category.category_id}
          value={category.category_name}
        >
          {category.category_name}
        </option>
      ))}
    </select>

{/* Status Filter */}
<select
  value={inventoryStatusFilter}
  onChange={(e) =>
    setInventoryStatusFilter(
      e.target.value as
        | 'all'
        | 'active'
        | 'inactive'
    )
  }
  className="w-full min-w-0 px-3 py-2.5 text-sm rounded-xl border border-[#DDE6E0] bg-white text-[#34463F] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A]"
>
  <option value="all">
    All Status
  </option>

  <option value="active">
    Active
  </option>

  <option value="inactive">
    Inactive
  </option>
</select>

    {/* Stock Filter */}
    <select
      value={inventoryStockFilter}
      onChange={(e) =>
        setInventoryStockFilter(
          e.target.value as
            | 'all'
            | 'normal'
            | 'low'
            | 'out'
        )
      }
      className="w-full min-w-0 px-3 py-2.5 text-sm rounded-xl border border-[#DDE6E0] bg-white text-[#34463F] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A]"
    >
      <option value="all">
        All Stock
      </option>

      <option value="normal">
        Normal Stock
      </option>

      <option value="low">
        Low Stock
      </option>

      <option value="out">
        Out of Stock
      </option>
    </select>
  </div>

  {/* Product List */}
  <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-2 scrollbar-thin lg:max-h-none lg:min-h-0 lg:flex-1">

    {filteredInventoryProducts.length === 0 && (
      <div className="py-8 text-center text-sm text-[#71817A]">
        {inventorySearch
          ? 'No inventory items match your search.'
          : 'No inventory items found.'}
      </div>
    )}

    {filteredInventoryProducts.map((p) => (
      <div
        key={p.id}
        className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-steel-50/50 border border-steel-100 rounded-xl p-2.5"
      >
        <div className="flex gap-3 items-center min-w-0">

          {renderProductImage(
            p.image,
            p.category,
            "w-10 h-10 object-contain rounded-lg shrink-0",
            "text-3xl"
          )}

          <div className="min-w-0">
            <h4 className="text-xs font-bold text-steel-800 leading-tight truncate">
              {p.name}
            </h4>

            <span className="text-[10px] text-steel-400 font-medium block mt-0.5">
              {p.brand} · {p.category} ·{' '}

              <span
                className={`font-bold ${
                  p.status === 'inactive'
                    ? 'text-red-400'
                    : 'text-green-600'
                }`}
              >
                {p.status === 'inactive'
                  ? 'Inactive'
                  : 'Active'}
              </span>
            </span>

            <span className="text-[10px] text-amber-700 font-semibold block mt-1 capitalize">
              Delivery: {p.delivery_class || 'standard'}
              {p.bulk_quantity_threshold
                ? ` · Bulky at ${p.bulk_quantity_threshold}+ units`
                : ''}
            </span>

            {p.fulfillment_rule === 'delivery_only' && (
              <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800">
                Delivery Only
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4">

          <div className="text-right">
            <p className="text-xs font-bold text-steel-950 font-display">
              ₱{Number(p.price).toFixed(2)}
            </p>

            <span
              className={`text-[10px] font-bold block mt-0.5 ${
                p.stock === 0
                  ? 'text-red-600'
                  : isBelowReorderLevel(p)
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`}
            >
              {p.stock} in stock
            </span>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => {
                setEditingProduct(p);

setNewProduct({
  name: p.name,
  description: p.description || '',
  unit: p.unit || '',
  barcode: p.barcode || '',
  price: String(p.price),
  category: p.category,

  supplier_id:
    p.supplier_id
      ? String(p.supplier_id)
      : '',

  image: p.image,
  stock: String(p.stock),

  reorder_level:
    String(p.reorder_level ?? 10),

  brand: p.brand,
  status: p.status || 'active',

  delivery_class:
    p.delivery_class || 'standard',

  bulk_quantity_threshold:
    p.bulk_quantity_threshold === null ||
    p.bulk_quantity_threshold === undefined
      ? ''
      : String(
          p.bulk_quantity_threshold
        ),

  fulfillment_rule:
    p.fulfillment_rule || 'all',

  opening_supplier_price: '',
  opening_supplier_reference: '',
  opening_receipt_image: ''
});
              }}
              className="px-2.5 py-1.5 bg-steel-100 hover:bg-steel-200 text-steel-700 text-[10px] font-bold rounded-lg transition-all"
            >
              Edit
            </button>

            <button
              onClick={() => handleToggleProductStatus(p)}
              className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                p.status === 'inactive'
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-700'
              }`}
            >
              {p.status === 'inactive'
                ? 'Activate'
                : 'Deactivate'}
            </button>
          </div>
        </div>
      </div>
    ))}
  </div>
</div>

{/* Close Inventory 12-column grid */}
</div>

{/* Close Inventory Manager tab */}
</div>
)}

{/* PURCHASE ORDERS */}
{activeTab === 'purchaseOrders' && (
  <PurchaseOrdersPanel onReceiveItem={handlePurchaseOrderReceiveItem} />
)}


{/* REORDER SUGGESTIONS */}
{activeTab === 'reorderSuggestions' && (
  <ReorderSuggestionsPanel
    onOpenPurchaseOrders={() => setActiveTab('purchaseOrders')}
    onManageSuppliers={() => setActiveTab('suppliers')}
    onManageProducts={() => setActiveTab('products')}
  />
)}

{/* DEDICATED STOCK RECEIVING */}
{activeTab === 'inventoryAdjustment' && (
  <InventoryAdjustmentPanel
    products={products}
    onAdjusted={async () => {
      await Promise.all([fetchProducts(), fetchInventoryMovements()]);
    }}
    onViewMovements={() => setActiveTab('movementHistory')}
  />
)}

{activeTab === 'receiveStock' && (
  <div className="space-y-6 animate-fade-up">
    <div>
      <h2 className="text-2xl font-bold font-display text-steel-950">Receive Stock</h2>
      <p className="mt-1 text-sm text-steel-500">
        Record physical supplier deliveries in one Stock-In transaction. Supporting supplier documents are optional, and Rayjin automatically assigns the RCV system reference.
      </p>
    </div>

    <section className="rounded-2xl border border-[#DDE6E0] bg-white p-5 shadow-sm">
      {stockReceivingStatus === 'success' && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-xs font-semibold text-green-700">
          {stockReceivingMessage}
        </div>
      )}
      {stockReceivingStatus === 'error' && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          {stockReceivingMessage}
        </div>
      )}

      {stockReceiving.purchase_order_item_id && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold">Receiving against {stockReceiving.purchase_order_number}</p>
              <p className="mt-1 text-[11px] leading-5 text-blue-700">
                Product and supplier are locked to the Purchase Order. Up to {stockReceiving.purchase_order_remaining_quantity} unit(s) remain on this line. Enter the actual quantity and actual supplier cost delivered today.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setStockReceiving((current) => ({
                  ...current,
                  product_id: '',
                  supplier_id: '',
                  quantity: '',
                  supplier_price: '',
                  selling_price: '',
                  purchase_order_item_id: '',
                  purchase_order_id: '',
                  purchase_order_number: '',
                  purchase_order_remaining_quantity: '',
                }));
                setStockReceivingProductQuery('');
                setStockReceivingSupplierQuery('');
                setStockReceivingStatus('idle');
                setStockReceivingMessage('');
              }}
              className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-[10px] font-bold text-blue-700 hover:bg-blue-100"
            >
              Switch to Direct Receiving
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleStockReceiving} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-steel-500">
          1. Product
          <input
            list="receiving-products"
            required
            value={stockReceivingProductQuery}
            readOnly={Boolean(stockReceiving.purchase_order_item_id)}
            onChange={(event) => {
              const value = event.target.value;
              const product = products.find((item) => productSelectorLabel(item) === value);
              setStockReceivingProductQuery(value);
              setStockReceiving((current) => ({
                ...current,
                product_id: product ? String(product.id) : '',
                supplier_id: product?.supplier_id ? String(product.supplier_id) : current.supplier_id,
                selling_price: product ? String(product.price) : current.selling_price,
              }));
              if (product?.supplier_id) {
                const supplier = suppliers.find((item) => item.supplier_id === product.supplier_id);
                if (supplier) setStockReceivingSupplierQuery(supplierSelectorLabel(supplier));
              }
            }}
            placeholder="Search product name or barcode"
            className="mt-1 w-full rounded-lg border border-steel-200 bg-white px-3 py-2.5 text-xs normal-case tracking-normal text-steel-950 focus:border-[#2F7D5A] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/15"
          />
          <datalist id="receiving-products">
            {products.map((product) => <option key={product.id} value={productSelectorLabel(product)} />)}
          </datalist>
        </label>

        <label className="block text-xs font-bold uppercase tracking-wider text-steel-500">
          2. Supplier
          <input
            list="receiving-suppliers"
            required
            value={stockReceivingSupplierQuery}
            readOnly={Boolean(stockReceiving.purchase_order_item_id)}
            onChange={(event) => {
              const value = event.target.value;
              const supplier = suppliers.find((item) => supplierSelectorLabel(item) === value);
              setStockReceivingSupplierQuery(value);
              setStockReceiving((current) => ({
                ...current,
                supplier_id: supplier ? String(supplier.supplier_id) : '',
              }));
            }}
            placeholder="Search active supplier"
            className="mt-1 w-full rounded-lg border border-steel-200 bg-white px-3 py-2.5 text-xs normal-case tracking-normal text-steel-950 focus:border-[#2F7D5A] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/15"
          />
          <datalist id="receiving-suppliers">
            {suppliers.filter((supplier) => supplier.status === 'Active').map((supplier) => (
              <option key={supplier.supplier_id} value={supplierSelectorLabel(supplier)} />
            ))}
          </datalist>
        </label>

        <label className="block text-xs font-bold uppercase tracking-wider text-steel-500">
          3. Quantity
          <input
            type="number" min="1" step="1" required value={stockReceiving.quantity}
            max={stockReceiving.purchase_order_item_id ? Number(stockReceiving.purchase_order_remaining_quantity || 0) : undefined}
            onChange={(event) => setStockReceiving({ ...stockReceiving, quantity: event.target.value })}
            className="mt-1 w-full rounded-lg border border-steel-200 px-3 py-2.5 text-xs normal-case tracking-normal focus:border-[#2F7D5A] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/15"
          />
        </label>

        <label className="block text-xs font-bold uppercase tracking-wider text-steel-500">
          4. Supplier Cost / Unit (₱)
          <input
            type="number" min="0.01" step="0.01" required value={stockReceiving.supplier_price}
            onChange={(event) => setStockReceiving({ ...stockReceiving, supplier_price: event.target.value })}
            className="mt-1 w-full rounded-lg border border-steel-200 px-3 py-2.5 text-xs normal-case tracking-normal focus:border-[#2F7D5A] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/15"
          />
        </label>

        <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-[#DDE6E0] bg-[#F8FBF9] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#2F7D5A]">Supplier Documentation <span className="normal-case font-medium text-[#819087]">(Optional)</span></p>
          <p className="mt-1 text-[10px] leading-4 text-[#71817A]">
            Add the supplier document number and/or image when available. Rayjin will still record the physical stock receipt when supporting paperwork is unavailable.
          </p>
        </div>

        <label className="block text-xs font-bold uppercase tracking-wider text-steel-500">
          5. Supplier Reference No. <span className="normal-case font-medium text-[#819087]">(Optional)</span>
          <input
            type="text"
            maxLength={120}
            value={stockReceiving.supplier_reference}
            onChange={(event) => setStockReceiving({ ...stockReceiving, supplier_reference: event.target.value })}
            placeholder="DR / SI / invoice number when available"
            className="mt-1 w-full rounded-lg border border-steel-200 px-3 py-2.5 text-xs normal-case tracking-normal focus:border-[#2F7D5A] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/15"
          />
          <span className="mt-1 block text-[9px] font-medium normal-case tracking-normal text-[#819087]">Supplier-issued document number for audit/reference only.</span>
        </label>

        <label className="block text-xs font-bold uppercase tracking-wider text-steel-500">
          6. Supplier Receipt / Delivery Document <span className="normal-case font-medium text-[#819087]">(Optional)</span>
          <input
            key={stockReceivingReceiptInputKey}
            type="file" accept="image/jpeg,image/png,image/webp" onChange={handleReceiptChange}
            className="mt-1 block w-full rounded-lg border border-steel-200 bg-white px-3 py-2 text-xs normal-case tracking-normal file:mr-3 file:rounded-md file:border-0 file:bg-[#E4F5EA] file:px-3 file:py-1.5 file:text-[10px] file:font-bold file:text-[#0D7740]"
          />
          <span className="mt-1 block text-[9px] font-medium normal-case tracking-normal text-[#819087]">JPG, PNG, or WEBP up to 5 MB. The attachment is supporting evidence only and does not affect inventory quantity or costing.</span>
        </label>

        <label className="block text-xs font-bold uppercase tracking-wider text-steel-500">
          7. Selling Price (₱)
          <input
            type="number" min="0.01" step="0.01" required value={stockReceiving.selling_price}
            onChange={(event) => setStockReceiving({ ...stockReceiving, selling_price: event.target.value })}
            className="mt-1 w-full rounded-lg border border-steel-200 px-3 py-2.5 text-xs normal-case tracking-normal focus:border-[#2F7D5A] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/15"
          />
        </label>

        {stockReceiving.receipt_image && (
          <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-[#CDE4D6] bg-[#F7FAF8] p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#52635B]">Receipt Preview</p>
              <button
                type="button"
                onClick={() => {
                  setStockReceiving((current) => ({ ...current, receipt_image: '' }));
                  setStockReceivingReceiptInputKey((current) => current + 1);
                }}
                className="text-[10px] font-bold text-red-600 transition hover:text-red-700"
              >
                Remove Attachment
              </button>
            </div>
            <img src={stockReceiving.receipt_image} alt="Receipt preview" className="max-h-56 rounded-lg border border-[#DDE6E0] object-contain" />
          </div>
        )}

        <div className="md:col-span-2 xl:col-span-3 flex justify-end">
          <button
            type="submit"
            disabled={stockReceivingStatus === 'loading'}
            className="rounded-xl bg-[#2F7D5A] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#256548] disabled:opacity-60"
          >
            {stockReceivingStatus === 'loading' ? 'Recording Stock…' : 'Receive Stock'}
          </button>
        </div>
      </form>
    </section>

    <section className="rounded-2xl border border-[#DDE6E0] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2F7D5A]">Inventory Audit</p>
          <h3 className="mt-1 font-display text-base font-bold text-[#17372D]">Recent Stock-In</h3>
          <p className="mt-1 text-xs text-[#71817A]">The latest Opening Inventory and Stock Receiving entries from the centralized Inventory Movement ledger.</p>
        </div>
        <button
          type="button"
          onClick={openAllStockInMovements}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#CFE0D7] bg-[#F8FBF9] px-4 py-2.5 text-xs font-bold text-[#0D7740] transition hover:border-[#8FC6A8] hover:bg-[#EEF8F2]"
        >
          <ArrowLeftRight className="h-4 w-4" />
          View All Stock-In Movements
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-[#DDE6E0]">
        {recentStockInMovements.length === 0 ? (
          <div className="px-4 py-9 text-center text-xs text-[#71817A]">No Stock-In movements recorded yet.</div>
        ) : (
          <div className="divide-y divide-[#E5ECE8]">
            {recentStockInMovements.map((movement) => (
              <div key={movement.movement_id} className="grid gap-3 px-4 py-3 transition hover:bg-[#F8FAF9] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-bold ${movement.source_label === 'Opening Inventory' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {movement.source_label || 'Stock Receiving'}
                    </span>
                    <span className="text-[10px] font-bold text-[#2F7D5A]">{movement.reference_label || '—'}</span>
                    <span className="text-[10px] text-[#71817A]">{new Date(movement.movement_date).toLocaleString('en-PH')}</span>
                  </div>
                  <p className="mt-1 truncate text-xs font-bold text-[#34463F]">{movement.product_name}</p>
                  <p className="mt-0.5 text-[10px] text-[#71817A]">
                    {movement.supplier_name || 'Supplier not recorded'}
                    {movement.supplier_reference ? ` · Supplier Ref: ${movement.supplier_reference}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 sm:justify-end">
                  <span className="text-sm font-bold text-emerald-700">+{movement.quantity}</span>
                  {movement.receipt_path && (
                    <a
                      href={movement.receipt_path}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-[#CFE0D7] bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#0D7740] transition hover:bg-[#EEF8F2]"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Receipt
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  </div>
)}

{/* MANAGE CATEGORIES */}
{activeTab === 'categories' && (
  <div className="space-y-6 animate-fade-up">

    <div>
      <h2 className="text-2xl font-bold font-display text-steel-950">
        Manage Categories
      </h2>

      <p className="text-sm text-steel-500">
        View and manage product categories.
      </p>
    </div>
{editingCategory ? (
  <div className="bg-white border border-steel-200/60 rounded-2xl p-5 shadow-sm">

    <h3 className="text-base font-bold text-steel-950 border-b border-steel-100 pb-3 mb-4">
      Edit Category
    </h3>

    {editCategoryStatus === 'success' && (
      <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded-xl text-xs font-semibold">
        Category updated successfully!
      </div>
    )}

    {editCategoryStatus === 'error' && (
      <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold">
        {editCategoryError}
      </div>
    )}

    <form
      onSubmit={handleUpdateCategory}
      className="space-y-4"
    >
      <div>
        <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
          Category Name
        </label>

        <input
          type="text"
          value={editCategoryData.category_name}
          onChange={(e) =>
            setEditCategoryData({
              ...editCategoryData,
              category_name: e.target.value
            })
          }
          className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
          Description
        </label>

        <textarea
          value={editCategoryData.description}
          onChange={(e) =>
            setEditCategoryData({
              ...editCategoryData,
              description: e.target.value
            })
          }
          rows={3}
          className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500 resize-none"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 bg-construction-500 hover:bg-construction-600 text-white text-xs font-bold rounded-lg shadow-md transition-all active:scale-95"
        >
          Save Changes
        </button>

        <button
          type="button"
          onClick={() => {
            setEditingCategory(null);
            setEditCategoryStatus('idle');
            setEditCategoryError('');
          }}
          className="px-4 py-2 bg-steel-100 hover:bg-steel-200 text-steel-700 text-xs font-bold rounded-lg transition-all"
        >
          Cancel
        </button>
      </div>
    </form>

  </div>
) : (
  <div className="bg-white border border-steel-200/60 rounded-2xl p-5 shadow-sm">

    <h3 className="text-base font-bold text-steel-950 border-b border-steel-100 pb-3 mb-4">
      Add New Category
    </h3>

    {categoryStatus === 'success' && (
      <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded-xl text-xs font-semibold">
        Category added successfully!
      </div>
    )}

    {categoryStatus === 'error' && (
      <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold">
        {categoryError}
      </div>
    )}

    <form
      onSubmit={handleAddCategory}
      className="space-y-4"
    >
      <div>
        <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
          Category Name
        </label>

        <input
          type="text"
          value={newCategory.category_name}
          onChange={(e) =>
            setNewCategory({
              ...newCategory,
              category_name: e.target.value
            })
          }
          placeholder="e.g. Roofing Materials"
          className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
          Description
        </label>

        <textarea
          value={newCategory.description}
          onChange={(e) =>
            setNewCategory({
              ...newCategory,
              description: e.target.value
            })
          }
          placeholder="Optional category description"
          rows={3}
          className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500 resize-none"
        />
      </div>

      <button
        type="submit"
        className="px-5 py-2.5 bg-construction-500 hover:bg-construction-600 text-white text-xs font-bold rounded-lg shadow-md transition-all active:scale-95"
      >
        Add Category
      </button>
    </form>

  </div>
)}

    <div className="bg-white border border-steel-200/60 rounded-2xl shadow-sm overflow-hidden">

<div className="px-5 py-4 border-b border-[#DDE6E0] space-y-4">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div>
      <h3 className="text-base font-bold text-[#17372D]">
        Category Records
      </h3>

      <p className="text-xs text-[#71817A] mt-1">
        Search and manage product categories.
      </p>
    </div>

    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">

  {/* Category Search */}
  <div className="relative w-full sm:w-72">
    <Search className="w-4 h-4 text-[#71817A] absolute left-3 top-1/2 -translate-y-1/2" />

    <input
      type="text"
      value={categorySearch}
      onChange={(e) =>
        setCategorySearch(e.target.value)
      }
      placeholder="Search categories..."
      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-[#DDE6E0] bg-white text-[#34463F] placeholder:text-[#8A9892] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A]"
    />
  </div>

  {/* Category Status Filter */}
  <select
    value={categoryStatusFilter}
    onChange={(e) =>
      setCategoryStatusFilter(
        e.target.value as
          | 'all'
          | 'active'
          | 'inactive'
      )
    }
    className="w-full sm:w-40 px-3 py-2.5 text-sm rounded-xl border border-[#DDE6E0] bg-white text-[#34463F] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A]"
  >
    <option value="all">
      All Status
    </option>

    <option value="active">
      Active
    </option>

    <option value="inactive">
      Inactive
    </option>
  </select>

</div>
  </div>
</div>

      <div className="divide-y divide-steel-100">

  {filteredCategories.length === 0 ? (
    <div className="p-5 text-sm text-steel-500">
      {categorySearch
        ? 'No categories match your search.'
        : 'No categories found.'}
    </div>
  ) : (
    filteredCategories.map((category) => (
      <div
        key={category.category_id}
        className="p-5"
      >
        <div className="flex items-center justify-between gap-4">

          <div>
            <p className="font-semibold text-steel-950">
              {category.category_name}
            </p>

            <p className="text-xs text-steel-500 mt-1">
              {category.description || 'No description'}
            </p>
          </div>

          <div className="flex items-center gap-3">

            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                category.status === 'Active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {category.status}
            </span>

            <button
              type="button"
              onClick={() => handleStartEditCategory(category)}
              className="px-3 py-1.5 bg-steel-100 hover:bg-steel-200 text-steel-700 text-xs font-bold rounded-lg transition-all active:scale-95"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={() => handleToggleCategoryStatus(category)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all active:scale-95 ${
                category.status === 'Active'
                  ? 'bg-red-50 hover:bg-red-100 text-red-600'
                  : 'bg-green-50 hover:bg-green-100 text-green-700'
              }`}
            >
              {category.status === 'Active'
                ? 'Deactivate'
                : 'Activate'}
            </button>

          </div>
        </div>
      </div>
    ))
  )}

</div>

</div>

</div>
)}

{/* MANAGE SUPPLIERS */}
{activeTab === 'suppliers' && (
  <div className="space-y-6 animate-fade-up">

    <div>
      <h2 className="text-2xl font-bold font-display text-steel-950">
        Manage Suppliers
      </h2> 

      <p className="text-sm text-steel-500">
        View and manage supplier records.
      </p>
    </div>
    {editingSupplier && (
  <div className="p-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold">
    Editing Supplier: {editingSupplier.supplier_name}
  </div>
)}

{editingSupplier && (
  <div className="bg-white border border-steel-200/60 rounded-2xl p-5 shadow-sm">

    <h3 className="text-base font-bold text-steel-950 border-b border-steel-100 pb-3 mb-4">
      Edit Supplier
    </h3>

    {editSupplierStatus === 'success' && (
      <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded-xl text-xs font-semibold">
        Supplier updated successfully!
      </div>
    )}

    {editSupplierStatus === 'error' && (
      <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold">
        {editSupplierError}
      </div>
    )}

    <form
      onSubmit={handleUpdateSupplier}
      className="space-y-4"
    >
      <div>
        <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
          Supplier Name
        </label>

        <input
          type="text"
          value={editSupplierData.supplier_name}
          onChange={(e) =>
            setEditSupplierData({
              ...editSupplierData,
              supplier_name: e.target.value
            })
          }
          className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        <div>
          <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
            Contact Person
          </label>

          <input
            type="text"
            value={editSupplierData.contact_person}
            onChange={(e) =>
              setEditSupplierData({
                ...editSupplierData,
                contact_person: e.target.value
              })
            }
            className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
            Contact Number
          </label>

          <input
            type="text"
            value={editSupplierData.contact_number}
            onChange={(e) =>
              setEditSupplierData({
                ...editSupplierData,
                contact_number: e.target.value
              })
            }
            className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
          />
        </div>

      </div>

      <div>
        <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
          Typical Lead Time (days)
        </label>
        <input
          type="number"
          min="0"
          max="365"
          step="1"
          value={editSupplierData.lead_time_days}
          onChange={(e) =>
            setEditSupplierData({
              ...editSupplierData,
              lead_time_days: e.target.value
            })
          }
          placeholder="e.g. 5"
          className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
        />
        <p className="mt-1 text-[10px] text-steel-500">
          Used by Reorder Suggestions. Leave blank until the supplier's normal delivery time is known.
        </p>
      </div>

      <div>
        <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
          Address
        </label>

        <textarea
          value={editSupplierData.address}
          onChange={(e) =>
            setEditSupplierData({
              ...editSupplierData,
              address: e.target.value
            })
          }
          rows={3}
          className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500 resize-none"
        />
      </div>

      <div className="flex gap-2">

        <button
          type="submit"
          className="px-4 py-2 bg-construction-500 hover:bg-construction-600 text-white text-xs font-bold rounded-lg shadow-md transition-all active:scale-95"
        >
          Save Changes
        </button>

        <button
          type="button"
          onClick={() => {
            setEditingSupplier(null);
            setEditSupplierStatus('idle');
            setEditSupplierError('');
          }}
          className="px-4 py-2 bg-steel-100 hover:bg-steel-200 text-steel-700 text-xs font-bold rounded-lg transition-all"
        >
          Cancel
        </button>

      </div>

    </form>
  </div>
)}


{!editingSupplier && (
  <div className="bg-white border border-steel-200/60 rounded-2xl p-5 shadow-sm">
    <h3 className="text-base font-bold text-steel-950 border-b border-steel-100 pb-3 mb-4">
      Add New Supplier
    </h3>

    {supplierStatus === 'success' && (

  <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded-xl text-xs font-semibold">
    Supplier added successfully!
  </div>
)}

{supplierStatus === 'error' && (
  <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold">
    {supplierError}
  </div>
)}

<form
  onSubmit={handleAddSupplier}
  className="space-y-4"
>
    <div>
      <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
        Supplier Name
      </label>

      <input
        type="text"
        value={newSupplier.supplier_name}
        onChange={(e) =>
          setNewSupplier({
            ...newSupplier,
            supplier_name: e.target.value
          })
        }
        placeholder="e.g. ABC Hardware Supply"
        className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
      />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

      <div>
        <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
          Contact Person
        </label>

        <input
          type="text"
          value={newSupplier.contact_person}
          onChange={(e) =>
            setNewSupplier({
              ...newSupplier,
              contact_person: e.target.value
            })
          }
          placeholder="Optional"
          className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
          Contact Number
        </label>

        <input
          type="text"
          value={newSupplier.contact_number}
          onChange={(e) =>
            setNewSupplier({
              ...newSupplier,
              contact_number: e.target.value
            })
          }
          placeholder="Optional"
          className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
        />
      </div>

    </div>

    <div>
      <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
        Typical Lead Time (days)
      </label>
      <input
        type="number"
        min="0"
        max="365"
        step="1"
        value={newSupplier.lead_time_days}
        onChange={(e) =>
          setNewSupplier({
            ...newSupplier,
            lead_time_days: e.target.value
          })
        }
        placeholder="Optional, e.g. 5"
        className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
      />
      <p className="mt-1 text-[10px] text-steel-500">
        Reorder Suggestions use this to estimate demand while waiting for delivery.
      </p>
    </div>

    <div>
      <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">
        Address
      </label>

      <textarea
        value={newSupplier.address}
        onChange={(e) =>
          setNewSupplier({
            ...newSupplier,
            address: e.target.value
          })
        }
        placeholder="Optional supplier address"
        rows={3}
        className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500 resize-none"
      />
    </div>

<button
  type="submit"
  className="px-5 py-2.5 bg-construction-500 hover:bg-construction-600 text-white text-xs font-bold rounded-lg shadow-md transition-all active:scale-95"
>
  Add Supplier
</button>

</form>
</div>
)}

<div className="bg-white border border-[#DDE6E0] rounded-2xl shadow-sm overflow-hidden">
  <div className="px-5 py-4 border-b border-[#DDE6E0] space-y-4">

  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div>
      <h3 className="text-base font-bold text-[#17372D]">
        Supplier Records
      </h3>

      <p className="text-xs text-[#71817A] mt-1">
        Search and manage supplier information.
      </p>
    </div>

    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">

  {/* Supplier Search */}
  <div className="relative w-full sm:w-80">
    <Search className="w-4 h-4 text-[#71817A] absolute left-3 top-1/2 -translate-y-1/2" />

    <input
      type="text"
      value={supplierSearch}
      onChange={(e) =>
        setSupplierSearch(e.target.value)
      }
      placeholder="Search suppliers..."
      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-[#DDE6E0] bg-white text-[#34463F] placeholder:text-[#8A9892] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A]"
    />
  </div>

  {/* Supplier Status Filter */}
  <select
    value={supplierStatusFilter}
    onChange={(e) =>
      setSupplierStatusFilter(
        e.target.value as
          | 'all'
          | 'active'
          | 'inactive'
      )
    }
    className="w-full sm:w-40 px-3 py-2.5 text-sm rounded-xl border border-[#DDE6E0] bg-white text-[#34463F] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A]"
  >
    <option value="all">
      All Status
    </option>

    <option value="active">
      Active
    </option>

    <option value="inactive">
      Inactive
    </option>
  </select>

</div>
  </div>
</div>

      <div className="divide-y divide-steel-100">

        {filteredSuppliers.length === 0 ? (
          <div className="p-5 text-sm text-steel-500">
            {supplierSearch
  ? 'No suppliers match your search and selected status.'
  : supplierStatusFilter !== 'all'
  ? `No ${supplierStatusFilter} suppliers found.`
  : 'No suppliers found.'}
          </div>
        ) : (
          filteredSuppliers.map((supplier) => (
            <div
              key={supplier.supplier_id}
              className="p-5 flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-semibold text-steel-950">
                  {supplier.supplier_name}
                </p>

                <p className="text-xs text-steel-500 mt-1">
                  Contact Person: {supplier.contact_person || 'Not provided'}
                </p>

                <p className="text-xs text-steel-500">
                  Contact Number: {supplier.contact_number || 'Not provided'}
                </p>

                <p className="text-xs text-steel-500">
                  Address: {supplier.address || 'Not provided'}
                </p>

                <p className="text-xs text-steel-500">
                  Lead Time: {supplier.lead_time_days === null || supplier.lead_time_days === undefined
                    ? 'Not set'
                    : `${supplier.lead_time_days} day(s)`}
                </p>
              </div>

<div className="flex items-center gap-3">

  <span
    className={`px-3 py-1 rounded-full text-xs font-semibold ${
      supplier.status === 'Active'
        ? 'bg-green-100 text-green-700'
        : 'bg-red-100 text-red-700'
    }`}
  >
    {supplier.status}
  </span>

  <button
    type="button"
    onClick={() => handleStartEditSupplier(supplier)}
    className="px-3 py-1.5 bg-steel-100 hover:bg-steel-200 text-steel-700 text-xs font-bold rounded-lg transition-all active:scale-95"
  >
    Edit
  </button>

  <button
    type="button"
    onClick={() => handleToggleSupplierStatus(supplier)}
    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all active:scale-95 ${
      supplier.status === 'Active'
        ? 'bg-red-50 hover:bg-red-100 text-red-600'
        : 'bg-green-50 hover:bg-green-100 text-green-700'
    }`}
  >
    {supplier.status === 'Active'
      ? 'Deactivate'
      : 'Activate'}
  </button>

</div>
            </div>
          ))
        )}

      </div>
    </div>

  </div>
)}

{/* CASHIER SHIFT & CASH RECONCILIATION */}
{activeTab === 'cashierShift' && (
  <CashierShiftPanel onGoToPos={() => setActiveTab('pos')} />
)}

{/* EXPENSE MANAGEMENT & ESTIMATED NET PROFIT */}
{activeTab === 'expenses' && (
  <ExpenseManagementPanel />
)}

{/* TAB 4: POS COUNTER */}
{activeTab === 'pos' && (
          <div className="space-y-5 animate-fade-up">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#15803d]">Counter Operations</p>
              <h2 className="mt-1 font-display text-2xl font-extrabold text-[#17372D]">POS / New Sale</h2>
              <p className="mt-1 text-xs text-[#71817A]">Scan a barcode or browse products manually, then complete the existing cash-counter workflow.</p>
            </div>
            <CashierShiftStatusBanner onManageShift={() => setActiveTab('cashierShift')} />
            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12 lg:items-stretch">
  {/* Product picker */}
  <div
  ref={posProductPanelRef}
  className="lg:col-span-7 flex min-h-[580px] min-w-0 flex-col gap-4 rounded-2xl border border-[#DDE6E0] bg-white p-5 shadow-sm"
>
              {/* Barcode Scanner */}
<div className="bg-[#F5F7F5] border border-[#DDE6E0] rounded-xl p-4">

  <div className="flex items-start gap-3 mb-3">

    <div className="w-10 h-10 rounded-xl bg-[#2F7D5A]/10 flex items-center justify-center shrink-0">
      <ScanBarcode className="w-5 h-5 text-[#2F7D5A]" />
    </div>

    <div>
      <h4 className="text-sm font-bold text-[#17372D]">
        USB Barcode Scanner
      </h4>

      <p className="text-xs text-[#71817A] mt-0.5">
        Scan the product barcode or type it manually, then press Enter.
      </p>
    </div>

  </div>

  <form
    onSubmit={handlePosBarcodeScan}
    className="flex flex-col sm:flex-row gap-2"
  >
    <div className="relative flex-1">

      <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71817A]" />

      <input
        ref={posBarcodeInputRef}
        type="text"
        value={posBarcodeInput}
        onChange={(e) => {
          setPosBarcodeInput(
            e.target.value
          );

          if (
            posBarcodeStatus !== 'idle'
          ) {
            setPosBarcodeStatus('idle');
            setPosBarcodeMessage('');
          }
        }}
        autoComplete="off"
        placeholder="Ready to scan barcode..."
        className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-[#DDE6E0] bg-white text-[#34463F] placeholder:text-[#8A9892] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A]"
      />

    </div>

    <button
      type="submit"
      className="px-5 py-2.5 bg-[#2F7D5A] hover:bg-[#256548] text-white text-xs font-bold rounded-xl transition-all active:scale-95 whitespace-nowrap"
    >
      Add Barcode
    </button>

  </form>

  {posBarcodeMessage && (
    <div
      className={`mt-3 px-3 py-2 rounded-lg text-xs font-semibold ${
        posBarcodeStatus === 'success'
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-red-50 text-red-700 border border-red-200'
      }`}
    >
      {posBarcodeMessage}
    </div>
  )}

</div>
                <div className="flex justify-between items-center">
<h3 className="text-base font-bold font-display text-steel-950">
  Manual Product Selection
</h3>
                  <div className="relative w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-steel-400" />
                    <input 
                      type="text" 
                      placeholder="Search..."
                      value={posSearch}
                      onChange={(e) => setPosSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500 placeholder:text-steel-400"
                    />
                  </div>
                </div>

                <div className="grid min-h-0 flex-1 auto-rows-max grid-cols-1 content-start gap-3 overflow-y-auto pr-1 scrollbar-thin sm:grid-cols-2">
                  {filteredPosProducts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleAddToPosCart(p)}
                      disabled={p.stock <= 0}
                      className="text-left bg-steel-50/50 border border-steel-100 rounded-xl p-3 flex gap-3 hover:bg-steel-100/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.98]"
                    >
                      {renderProductImage(p.image, p.category, "w-8 h-8 object-contain rounded-lg group-hover:scale-110 transition-transform", "text-3xl")}
                      <div>
                        <h5 className="text-xs font-bold text-steel-800 line-clamp-1">{p.name}</h5>
                        <p className="text-[10px] font-bold text-construction-600 mt-0.5">₱{Number(p.price).toFixed(2)}</p>
                        {p.fulfillment_rule === 'delivery_only' && (
                          <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-amber-800">
                            Delivery Only
                          </span>
                        )}
                        <span className="text-[9px] text-steel-500 mt-1 block">In Stock: {p.stock}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* POS Cart Summary */}
<div
  ref={posCartPanelRef}
  className="relative self-start overflow-hidden rounded-2xl border border-steel-200/60 bg-white p-5 shadow-sm lg:col-span-5"
>
              
                {posStatus === 'success' && (
  <div className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">

    <CheckCircle className="w-12 h-12 text-green-500 animate-pulse" />

    <h4 className="font-display font-bold text-green-600 mt-4">
      POS Checkout Success!
    </h4>

    <p className="text-xs text-steel-500 mt-1">
      Stock deducted and sale logged successfully
    </p>

    {lastPosDeliveryReceipt && (
      <>
        <div className="mt-5 rounded-xl border border-[#CDE4D6] bg-[#F3FAF6] px-4 py-3 text-xs text-[#34463F]">
          Deliver Out transaction recorded as{' '}
          <strong>
            POS-{lastPosDeliveryReceipt.saleId}
          </strong>
        </div>

        <button
          type="button"
          onClick={() =>
            handlePrintPosDeliverySlip(
              lastPosDeliveryReceipt
            )
          }
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[#2F7D5A] px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-[#256548] active:scale-95"
        >
          <Printer className="h-4 w-4" />
          Print Delivery Slip
        </button>

        <button
          type="button"
          onClick={() =>
            setPosStatus('idle')
          }
          className="mt-2 rounded-xl border border-steel-200 bg-white px-5 py-2 text-xs font-bold text-steel-600 transition-all hover:bg-steel-50"
        >
          New Sale
        </button>
      </>
    )}

  </div>
)}

                <h3 className="text-base font-bold font-display text-steel-950 border-b border-steel-100 pb-3 mb-4">
                  POS Cart List
                </h3>

                {posCart.length === 0 ? (
                  <div className="text-center py-12 text-steel-400 text-xs">

  <p>Add products to start checkout</p>

  {lastPosDeliveryReceipt && (
    <button
      type="button"
      onClick={() =>
        handlePrintPosDeliverySlip(
          lastPosDeliveryReceipt
        )
      }
      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#B9D8C7] bg-[#F3FAF6] px-4 py-2 font-bold text-[#2F7D5A] transition-all hover:bg-[#E4F5EA]"
    >
      <Printer className="h-4 w-4" />
      Reprint Last Delivery Slip
    </button>
  )}

</div>
                ) : (
                  <form onSubmit={handleCheckoutPOS} className="space-y-4">
                    <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin">
                      {posCart.map(item => (
                        <div key={item.product.id} className="flex justify-between items-center border-b border-steel-100 pb-2.5 last:border-0 last:pb-0">
                          <div>
                            <h5 className="text-xs font-semibold text-steel-800 leading-tight">{item.product.name}</h5>
                            {(products.find((product) => product.id === item.product.id)?.fulfillment_rule || item.product.fulfillment_rule) === 'delivery_only' && (
                              <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-amber-800">
                                Delivery Only
                              </span>
                            )}
                            <span className="text-[10px] text-steel-400 font-medium mt-0.5 block">
                              ₱{Number(item.product.price).toFixed(2)} x {item.quantity}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdatePosQty(item.product.id, -1)}
                              className="w-5 h-5 bg-steel-100 border border-steel-200 text-steel-800 rounded flex items-center justify-center text-xs active:scale-95 hover:bg-steel-200 transition-all"
                            >
                              -
                            </button>
                            <input
  type="number"
  min={1}
  max={item.product.stock}
  step={1}
  inputMode="numeric"
  value={item.quantity}
  onFocus={(e) =>
    e.currentTarget.select()
  }
  onChange={(e) =>
    handleSetPosQty(
      item.product.id,
      e.target.value
    )
  }
  onKeyDown={(e) => {
    if (
      [
        '-',
        '+',
        '.',
        'e',
        'E',
      ].includes(e.key)
    ) {
      e.preventDefault();
    }
  }}
  title={`Available stock: ${item.product.stock}`}
  aria-label={`Quantity for ${item.product.name}`}
  className="h-6 w-10 rounded border border-steel-200 bg-white px-1 text-center text-xs font-bold text-steel-800 outline-none transition focus:border-construction-500 focus:ring-2 focus:ring-construction-500/20 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
/>

                            <button
                              type="button"
                              onClick={() => handleUpdatePosQty(item.product.id, 1)}
                              className="w-5 h-5 bg-steel-100 border border-steel-200 text-steel-800 rounded flex items-center justify-center text-xs active:scale-95 hover:bg-steel-200 transition-all"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-steel-100">
                      <div>
                        <label className="block text-[10px] font-bold text-steel-500 uppercase tracking-wider mb-1">Fulfillment Option</label>
                        <select 
                          value={posFulfillment}
onChange={(e) =>
  setPosFulfillment(
    e.target.value as 'pickup' | 'delivery'
  )
}                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
                        >
                          <option value="pickup" disabled={posCartRequiresDelivery}>
                            {posCartRequiresDelivery
                              ? 'Store Counter Pickup — unavailable for this cart'
                              : 'Store Counter Pickup'}
                          </option>
                          <option value="delivery">Deliver Out</option>
                        </select>
                        {posCartRequiresDelivery && (
                          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-800">
                            <strong>Delivery required.</strong> This POS cart contains a Delivery-only product, so the sale must use Deliver Out.
                          </div>
                        )}
                      </div>
                    </div>

                    {posFulfillment === 'delivery' && (
                      <div className="space-y-3 rounded-xl border border-[#CDE4D6] bg-[#F3FAF6] p-4">
                        <div>
                          <h4 className="text-xs font-bold text-[#17372D]">Deliver Out Details</h4>
                          <p className="mt-1 text-[10px] text-[#71817A]">Required for an Admin-created delivery sale within a configured area of Initao, Libertad, Naawan, or Gitagum.</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {[
                            ['customer_name', 'Customer Name *'],
                            ['contact_person', 'Contact Person *'],
                            ['contact_number', 'Contact Number *'],
                          ].map(([field, label]) => (
                            <label key={field} className="text-[10px] font-bold uppercase tracking-wider text-[#52635B]">
                              {label}
                              <input
                                type="text" required
                                value={posDeliveryDetails[field as keyof typeof posDeliveryDetails]}
                                onChange={(event) => setPosDeliveryDetails((current) => ({ ...current, [field]: event.target.value }))}
                                className="mt-1 w-full rounded-lg border border-[#DDE6E0] bg-white px-3 py-2 text-xs normal-case tracking-normal focus:border-[#2F7D5A] focus:outline-none"
                              />
                            </label>
                          ))}
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[#52635B]">
                            Municipality *
                            <select
                              required
                              value={posDeliveryDetails.municipality}
                              onChange={(event) =>
                                setPosDeliveryDetails((current) => ({
                                  ...current,
                                  municipality: event.target.value,
                                  barangay: '',
                                  delivery_fee: '',
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-[#DDE6E0] bg-white px-3 py-2 text-xs normal-case tracking-normal focus:border-[#2F7D5A] focus:outline-none"
                            >
                              <option value="">Select municipality</option>
                              {deliveryAreas.municipalities.map((municipality) => (
                                <option key={municipality} value={municipality}>{municipality}</option>
                              ))}
                            </select>
                          </label>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[#52635B]">
                            Barangay *
                            <select
                              required
                              disabled={!posDeliveryDetails.municipality}
                              value={posDeliveryDetails.barangay}
                              onChange={(event) => setPosDeliveryDetails((current) => ({ ...current, barangay: event.target.value, delivery_fee: '' }))}
                              className="mt-1 w-full rounded-lg border border-[#DDE6E0] bg-white px-3 py-2 text-xs normal-case tracking-normal focus:border-[#2F7D5A] focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                            >
                              <option value="">Select active barangay</option>
                              {posAvailableBarangays.map((rate) => (
                                <option key={rate.id} value={rate.barangay}>{rate.barangay}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#52635B]">
                          Complete Delivery Address *
                          <textarea
                            required rows={2} value={posDeliveryDetails.address}
                            onChange={(event) => setPosDeliveryDetails((current) => ({ ...current, address: event.target.value }))}
                            className="mt-1 w-full resize-none rounded-lg border border-[#DDE6E0] bg-white px-3 py-2 text-xs normal-case tracking-normal focus:border-[#2F7D5A] focus:outline-none"
                          />
                        </label>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#52635B]">
                          Landmark (Optional)
                          <input
                            type="text" value={posDeliveryDetails.landmark}
                            onChange={(event) => setPosDeliveryDetails((current) => ({ ...current, landmark: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-[#DDE6E0] bg-white px-3 py-2 text-xs normal-case tracking-normal focus:border-[#2F7D5A] focus:outline-none"
                          />
                        </label>
                        <div className="rounded-lg border border-[#B9D8C7] bg-white p-3">
                          <div className="flex items-end gap-2">
                            <label className="min-w-0 flex-1 text-[10px] font-bold uppercase tracking-wider text-[#52635B]">
                              Final Delivery Fee (Editable) *
                              <input
                                type="number" min="0" max="10000" step="0.01" required
                                value={posDeliveryDetails.delivery_fee}
                                onChange={(event) => setPosDeliveryDetails((current) => ({ ...current, delivery_fee: event.target.value }))}
                                className="mt-1 w-full rounded-lg border border-[#DDE6E0] px-3 py-2 text-xs normal-case tracking-normal focus:border-[#2F7D5A] focus:outline-none"
                              />
                            </label>
                            <button
                              type="button" disabled={!posSelectedRate}
                              onClick={() => setPosDeliveryDetails((current) => ({ ...current, delivery_fee: posSuggestedDeliveryFee.toFixed(2) }))}
                              className="rounded-lg border border-[#B9D8C7] bg-[#E4F5EA] px-3 py-2 text-[10px] font-bold text-[#0D7740] disabled:opacity-50"
                            >
                              Use Suggested ₱{posSuggestedDeliveryFee.toFixed(2)}
                            </button>
                          </div>
                          <p className="mt-2 text-[9px] text-[#71817A]">Suggested for {posLoadClass} load; Admin may confirm or adjust the final amount.</p>
                        </div>
                      </div>
                    )}

                    {/* POS Payment */}
<div className="border-t border-[#DDE6E0] pt-4 space-y-3">

  <div>
    <label className="block text-[10px] font-bold text-[#52645D] uppercase tracking-wider mb-1">
      Payment Method
    </label>

    <select
      value={posPaymentMethod}
      onChange={(e) => {
        const method =
          e.target.value as
            | 'cash'
            | 'card';

        setPosPaymentMethod(method);

        setPosCashReceived('');
        setPosCardPaymentConfirmed(false);
      }}
      className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#DDE6E0] bg-white text-[#34463F] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A]"
    >
      <option value="cash">
        Cash
      </option>

      <option value="card">
        Card
      </option>
    </select>
  </div>

  {/* CASH PAYMENT */}
  {posPaymentMethod === 'cash' && (
    <div className="space-y-3">

      <div>
        <label className="block text-[10px] font-bold text-[#52645D] uppercase tracking-wider mb-1">
          Cash Received
        </label>

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#52645D]">
            ₱
          </span>

          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={posCashReceived}
            onChange={(e) =>
              setPosCashReceived(
                e.target.value
              )
            }
            placeholder="0.00"
            className="w-full pl-8 pr-3 py-2.5 text-sm rounded-xl border border-[#DDE6E0] bg-white text-[#34463F] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A]"
          />
        </div>
      </div>

      {/* CHANGE */}
      <div
        className={`rounded-xl border p-3 ${
          posCashReceived.trim() === ''
            ? 'bg-[#F5F7F5] border-[#DDE6E0]'
            : posCashIsEnough
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}
      >
        {posCashReceived.trim() === '' ? (
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-[#71817A]">
              Change
            </span>

            <span className="text-sm font-bold text-[#71817A]">
              ₱0.00
            </span>
          </div>

        ) : posCashIsEnough ? (
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-green-700">
              Customer Change
            </span>

            <span className="text-lg font-bold text-green-700">
              ₱{posChange.toFixed(2)}
            </span>
          </div>

        ) : (
          <div className="flex justify-between items-center gap-3">
            <span className="text-xs font-semibold text-red-700">
              Amount Short
            </span>

            <span className="text-sm font-bold text-red-700">
              ₱{Math.max(
                posTotal -
                  (Number.isFinite(
                    posCashReceivedAmount
                  )
                    ? posCashReceivedAmount
                    : 0),
                0
              ).toFixed(2)}
            </span>
          </div>
        )}
      </div>

    </div>
  )}

  {/* CARD PAYMENT */}
  {posPaymentMethod === 'card' && (
    <div className="bg-[#F5F7F5] border border-[#DDE6E0] rounded-xl p-3">

      <label className="flex items-start gap-3 cursor-pointer">

        <input
          type="checkbox"
          checked={
            posCardPaymentConfirmed
          }
          onChange={(e) =>
            setPosCardPaymentConfirmed(
              e.target.checked
            )
          }
          className="mt-0.5 w-4 h-4 accent-[#2F7D5A]"
        />

        <div>
          <p className="text-xs font-bold text-[#34463F]">
            Confirm Card Payment
          </p>

          <p className="text-[10px] text-[#71817A] mt-1 leading-relaxed">
            Confirm that the customer's card payment was successfully processed using the external card terminal before completing this sale.
          </p>
        </div>

      </label>

    </div>
  )}

</div>

                    <div className="space-y-2 border-t border-steel-100 pt-3 text-sm">
                      <div className="flex justify-between"><span className="text-xs font-semibold text-steel-500">Product Subtotal</span><strong>₱{posProductSubtotal.toFixed(2)}</strong></div>
                      {posFulfillment === 'delivery' && (
                        <div className="flex justify-between"><span className="text-xs font-semibold text-steel-500">Delivery Fee</span><strong>₱{posFinalDeliveryFee.toFixed(2)}</strong></div>
                      )}
                      <div className="flex justify-between border-t border-steel-100 pt-2">
                        <span className="font-bold text-steel-600">Total Bill</span>
                        <span className="font-display font-bold text-construction-600 text-lg">₱{posTotal.toFixed(2)}</span>
                      </div>
                    </div>

<button
  type="submit"
  disabled={
    posSubmitting ||
    (
      posPaymentMethod === 'cash' &&
      !posCashIsEnough
    ) ||
    (
      posPaymentMethod === 'card' &&
      !posCardPaymentConfirmed
    )
  }
  className="w-full py-2.5 bg-[#2F7D5A] hover:bg-[#256548] text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md shadow-[#2F7D5A]/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#2F7D5A]"
>
  {posSubmitting
    ? 'Processing Sale...'
    : posPaymentMethod === 'cash'
    ? 'Complete Cash Sale'
    : 'Complete Card Sale'}
</button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

{/* TAB: RETURNS / REFUNDS / SALES VOIDS */}
{activeTab === 'saleAdjustments' && (
  <SalesAdjustmentPanel
    onChanged={async () => {
      await Promise.all([fetchSalesHistory(), fetchProducts(), fetchInventoryMovements()]);
    }}
  />
)}

{/* TAB: SALES HISTORY */}
{activeTab === 'sales' && (
  <div className="space-y-5 animate-fade-up">

    <div>
      <h2 className="text-2xl font-bold font-display text-steel-950">
        Sales History
      </h2>

      <p className="text-sm text-steel-500">
        Review completed sales with discounts, merchandise revenue, service/delivery fees, COGS, gross profit, and gross margin separated correctly.
      </p>
    </div>

    {/* Sales Date Filter */}
<div className="bg-white border border-[#DDE6E0] rounded-2xl p-4 shadow-sm">

  <div className="flex flex-col gap-4">

    <div>
      <h3 className="text-sm font-bold text-[#17372D]">
        Filter Sales by Date
      </h3>

      <p className="text-xs text-[#71817A] mt-1">
        View sales transactions and totals for a selected period.
      </p>
    </div>

    {/* Sales Search */}
<div className="relative w-full max-w-xl">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71817A]" />

  <input
    type="search"
    value={salesSearch}
    onChange={(e) =>
      setSalesSearch(e.target.value)
    }
    placeholder="Search reference, product/item, source, payment method, or status..."
    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-[#DDE6E0] bg-white text-[#34463F] placeholder:text-[#8A9892] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A]"
  />
</div>

    {/* Quick Date Buttons */}
    <div className="flex flex-wrap gap-2">

      {[
        { value: 'all', label: 'All Time' },
        { value: 'today', label: 'Today' },
        { value: 'week', label: 'This Week' },
        { value: 'month', label: 'This Month' },
        { value: 'custom', label: 'Custom Range' },
      ].map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() =>
            setSalesDatePreset(
              option.value as
                | 'all'
                | 'today'
                | 'week'
                | 'month'
                | 'custom'
            )
          }
          className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
            salesDatePreset === option.value
              ? 'bg-[#2F7D5A] text-white shadow-sm'
              : 'bg-[#F5F7F5] text-[#52645D] border border-[#DDE6E0] hover:bg-[#EAF1EC]'
          }`}
        >
          {option.label}
        </button>
      ))}

    </div>

    {/* Custom Date Range */}
    {salesDatePreset === 'custom' && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">

        <div>
          <label className="block text-xs font-bold text-[#52645D] uppercase tracking-wider mb-1">
            From
          </label>

          <input
            type="date"
            value={salesDateFrom}
            max={salesDateTo || undefined}
            onChange={(e) =>
              setSalesDateFrom(e.target.value)
            }
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#DDE6E0] bg-white text-[#34463F] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#52645D] uppercase tracking-wider mb-1">
            To
          </label>

          <input
            type="date"
            value={salesDateTo}
            min={salesDateFrom || undefined}
            onChange={(e) =>
              setSalesDateTo(e.target.value)
            }
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#DDE6E0] bg-white text-[#34463F] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A]"
          />
        </div>

      </div>
    )}

    <div className="text-xs text-[#71817A]">
      Showing{' '}
      <span className="font-bold text-[#17372D]">
        {filteredSalesHistory.length}
      </span>{' '}
      of{' '}
      <span className="font-bold text-[#17372D]">
        {salesHistory.length}
      </span>{' '}
      completed sales.
    </div>

  </div>
</div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {[
        ['Transactions', filteredSalesSummary.total_sales.toLocaleString()],
        ['Gross Merchandise', formatPeso(filteredSalesSummary.total_gross_merchandise_sales)],
        ['Discounts', formatPeso(filteredSalesSummary.total_discounts)],
        ['Returns / Refunds', formatPeso(filteredSalesSummary.total_refunds)],
        ['Net Merchandise Sales', formatPeso(filteredSalesSummary.total_net_merchandise_sales)],
        ['Service / Delivery Revenue', formatPeso(filteredSalesSummary.total_fee_revenue)],
        ['Total Revenue', formatPeso(filteredSalesSummary.total_revenue)],
        ['COGS', formatPeso(filteredSalesSummary.total_cogs)],
        ['Gross Profit', formatPeso(filteredSalesSummary.total_gross_profit)],
        ['Gross Profit Margin', `${Number(filteredSalesSummary.total_gross_profit_margin || 0).toFixed(2)}%`],
      ].map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-steel-200/60 bg-white p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-steel-500">
            {label}
          </span>
          <h3 className="mt-1 text-xl font-bold font-display text-steel-950">
            {value}
          </h3>
        </div>
      ))}
    </div>

    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-[11px] leading-5 text-[#416056]">
      <strong className="text-[#17372D]">Phase 4 adjusted-sale definition:</strong>{' '}
      Recorded returns/voids reduce merchandise or fee revenue. COGS is reversed only for items actually restocked at their original sale cost. Non-restockable returns remain a business loss.
    </div>

{/* Sales Transaction History */}
<div className="overflow-hidden rounded-2xl border border-steel-200/60 bg-white shadow-sm">
  <div className="flex flex-col gap-3 border-b border-steel-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h3 className="text-sm font-bold font-display text-steel-900">Completed Sales Transactions</h3>
      <p className="mt-1 text-xs text-steel-500">Compact view prioritizes the fields used most often. Full financial details remain one click away.</p>
    </div>
    <div className="inline-flex w-fit rounded-xl border border-[#DDE6E0] bg-[#F6F9F7] p-1" role="group" aria-label="Sales table view">
      <button type="button" onClick={() => setSalesTableView('compact')} className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition ${salesTableView === 'compact' ? 'bg-white text-[#0D7740] shadow-sm' : 'text-[#71817A] hover:text-[#17372D]'}`}>Compact</button>
      <button type="button" onClick={() => setSalesTableView('full')} className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition ${salesTableView === 'full' ? 'bg-white text-[#0D7740] shadow-sm' : 'text-[#71817A] hover:text-[#17372D]'}`}>Full Columns</button>
    </div>
  </div>

  {filteredSalesHistory.length === 0 ? (
    <div className="py-12 text-center text-steel-500">
      <ShoppingCart className="mx-auto mb-2 h-10 w-10 text-steel-300" />
      <p className="text-xs">{salesSearch.trim() ? 'No completed sales match your search and selected date period.' : salesDatePreset === 'all' ? 'No completed sales recorded yet.' : 'No completed sales found for the selected date period.'}</p>
    </div>
  ) : salesTableView === 'compact' ? (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[940px] text-left text-[11px]">
        <thead className="sticky top-0 z-10 border-b border-steel-200 bg-[#F7FAF8] text-[8px] uppercase tracking-[0.1em] text-[#71817A]">
          <tr>
            <th className="px-4 py-3">Date / Reference</th>
            <th className="px-4 py-3">Products / Items</th>
            <th className="px-3 py-3">Source</th>
            <th className="px-3 py-3 text-right">Qty</th>
            <th className="px-3 py-3 text-right">Net Merchandise</th>
            <th className="px-3 py-3 text-right">Total Revenue</th>
            <th className="px-3 py-3 text-right">Gross Profit / Margin</th>
            <th className="px-3 py-3">State</th>
            <th className="px-4 py-3 text-right">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-steel-100">
          {filteredSalesHistory.map((sale) => (
            <tr key={sale.sale_id} className="hover:bg-[#FAFCFB]">
              <td className="px-4 py-3 align-top">
                <p className="whitespace-nowrap font-semibold text-steel-600">{new Date(sale.sale_date).toLocaleString()}</p>
                <p className="mt-1 whitespace-nowrap font-extrabold text-[#17372D]">{sale.reference}</p>
              </td>
              <td className="max-w-[290px] px-4 py-3 align-top">
                <p className="line-clamp-2 font-semibold leading-5 text-steel-700">{sale.items_summary || '—'}</p>
                <p className="mt-1 text-[9px] text-steel-400">{sale.item_count} line item{sale.item_count === 1 ? '' : 's'}</p>
              </td>
              <td className="px-3 py-3 align-top"><span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-bold ${sale.source_label === 'POS' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-green-200 bg-green-50 text-green-700'}`}>{sale.source_label}</span></td>
              <td className="px-3 py-3 text-right align-top font-extrabold tabular-nums text-steel-800">{sale.net_quantity ?? sale.total_quantity}{sale.returned_quantity > 0 && <span className="mt-1 block text-[8px] font-semibold text-amber-600">{sale.returned_quantity} returned</span>}</td>
              <td className="px-3 py-3 text-right align-top font-bold tabular-nums text-steel-800">{formatPeso(sale.net_merchandise_sales)}</td>
              <td className="px-3 py-3 text-right align-top font-bold tabular-nums text-[#17372D]">{formatPeso(sale.total_revenue)}</td>
              <td className="px-3 py-3 text-right align-top"><p className="font-extrabold tabular-nums text-green-700">{formatPeso(sale.gross_profit)}</p><p className="mt-1 text-[9px] font-bold tabular-nums text-green-700">{Number(sale.gross_profit_margin || 0).toFixed(2)}%</p></td>
              <td className="px-3 py-3 align-top"><span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-bold ${sale.adjustment_state === 'Voided' ? 'border-red-200 bg-red-50 text-red-700' : sale.adjustment_state === 'Adjusted' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-green-200 bg-green-50 text-green-700'}`}>{sale.adjustment_state || 'Completed'}</span></td>
              <td className="px-4 py-3 text-right align-top"><button type="button" onClick={() => setSelectedSaleHistory(sale)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#CFE0D7] bg-white px-2.5 py-1.5 text-[9px] font-extrabold text-[#0D7740] hover:bg-emerald-50"><Eye className="h-3.5 w-3.5" />View</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="border-b border-steel-200 bg-steel-50">
          <tr className="text-left uppercase tracking-wider text-steel-500">
            <th className="px-4 py-3">Date</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Products / Items</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Quantity</th><th className="px-4 py-3">Gross Merchandise</th><th className="px-4 py-3">Discount</th><th className="px-4 py-3">Refunds</th><th className="px-4 py-3">Net Merchandise</th><th className="px-4 py-3">Service / Delivery</th><th className="px-4 py-3">Total Revenue</th><th className="px-4 py-3">COGS</th><th className="px-4 py-3">Gross Profit</th><th className="px-4 py-3">Gross Margin</th><th className="px-4 py-3">Payment Method</th><th className="px-4 py-3">Sale State</th>
          </tr>
        </thead>
        <tbody>
          {filteredSalesHistory.map((sale) => (
            <tr key={sale.sale_id} className="border-b border-steel-100 last:border-0 hover:bg-steel-50/50">
              <td className="whitespace-nowrap px-4 py-3 text-steel-500">{new Date(sale.sale_date).toLocaleString()}</td><td className="whitespace-nowrap px-4 py-3 font-semibold text-steel-800">{sale.reference}</td><td className="min-w-[220px] px-4 py-3 text-steel-700">{sale.items_summary || '—'}</td><td className="px-4 py-3"><span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${sale.source_label === 'POS' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-green-200 bg-green-50 text-green-700'}`}>{sale.source_label}</span></td><td className="px-4 py-3">{sale.item_count}</td><td className="whitespace-nowrap px-4 py-3 font-bold">{sale.net_quantity ?? sale.total_quantity}</td><td className="whitespace-nowrap px-4 py-3">{formatPeso(sale.gross_merchandise_sales)}</td><td className="whitespace-nowrap px-4 py-3 text-amber-700">{formatPeso(sale.discount_amount)}</td><td className="whitespace-nowrap px-4 py-3 text-red-700">{formatPeso(sale.total_refunds)}</td><td className="whitespace-nowrap px-4 py-3">{formatPeso(sale.net_merchandise_sales)}</td><td className="whitespace-nowrap px-4 py-3">{formatPeso(sale.fee_revenue)}</td><td className="whitespace-nowrap px-4 py-3 font-semibold">{formatPeso(sale.total_revenue)}</td><td className="whitespace-nowrap px-4 py-3">{formatPeso(sale.cogs)}</td><td className="whitespace-nowrap px-4 py-3 font-bold text-green-700">{formatPeso(sale.gross_profit)}</td><td className="whitespace-nowrap px-4 py-3 font-bold text-green-700">{Number(sale.gross_profit_margin || 0).toFixed(2)}%</td><td className="px-4 py-3">{formatPaymentMethod(sale.payment_method || 'cash')}</td><td className="px-4 py-3">{sale.adjustment_state || 'Completed'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>

{selectedSaleHistory && (
  <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="sale-detail-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelectedSaleHistory(null); }}>
    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[#DDE6E0] bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#E5ECE8] bg-white px-5 py-4">
        <div><p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#15803d]">Sale Details</p><h3 id="sale-detail-title" className="mt-1 font-display text-lg font-extrabold text-[#17372D]">{selectedSaleHistory.reference}</h3><p className="mt-1 text-[10px] text-[#71817A]">{new Date(selectedSaleHistory.sale_date).toLocaleString()}</p></div>
        <button type="button" onClick={() => setSelectedSaleHistory(null)} className="rounded-xl border border-[#DDE6E0] p-2 text-[#52635B] hover:bg-[#F5F8F6]" aria-label="Close sale details"><X className="h-4 w-4" /></button>
      </div>
      <div className="space-y-4 p-5">
        <div className="rounded-2xl border border-[#E5ECE8] bg-[#FAFCFB] p-4"><p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#71817A]">Products / Items</p><p className="mt-2 text-sm font-semibold leading-6 text-[#34463F]">{selectedSaleHistory.items_summary || '—'}</p></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['Source', selectedSaleHistory.source_label], ['Payment Method', formatPaymentMethod(selectedSaleHistory.payment_method || 'cash')], ['Sale State', selectedSaleHistory.adjustment_state || 'Completed'], ['Gross Merchandise', formatPeso(selectedSaleHistory.gross_merchandise_sales)], ['Discount', formatPeso(selectedSaleHistory.discount_amount)], ['Returns / Refunds', formatPeso(selectedSaleHistory.total_refunds)], ['Net Merchandise Sales', formatPeso(selectedSaleHistory.net_merchandise_sales)], ['Service / Delivery Revenue', formatPeso(selectedSaleHistory.fee_revenue)], ['Total Revenue', formatPeso(selectedSaleHistory.total_revenue)], ['COGS', formatPeso(selectedSaleHistory.cogs)], ['Gross Profit', formatPeso(selectedSaleHistory.gross_profit)], ['Gross Profit Margin', `${Number(selectedSaleHistory.gross_profit_margin || 0).toFixed(2)}%`], ['Original COGS', formatPeso(selectedSaleHistory.original_cogs)], ['COGS Reversed', formatPeso(selectedSaleHistory.cogs_reversed)], ['Returned Quantity', selectedSaleHistory.returned_quantity.toLocaleString()],
          ].map(([label, value]) => <div key={label} className="rounded-xl border border-[#E5ECE8] bg-white p-3"><p className="text-[8px] font-extrabold uppercase tracking-[0.1em] text-[#7A8E85]">{label}</p><p className="mt-1 text-sm font-extrabold tabular-nums text-[#17372D]">{value}</p></div>)}
        </div>
      </div>
    </div>
  </div>
)}
  </div>
)}

{/* TAB: INVENTORY MOVEMENT HISTORY */}
{activeTab === 'movementHistory' && (
  <div className="space-y-5 animate-fade-up">

    <div>
      <h2 className="text-2xl font-bold font-display text-steel-950">
        Inventory Movement History
      </h2>

      <p className="text-sm text-steel-500">
        Centralized audit trail for all Stock-In and Stock-Out transactions, supplier references, and supporting receipts.
      </p>
    </div>

    {/* Movement Filters */}
<div className="bg-white border border-[#DDE6E0] rounded-2xl p-4 shadow-sm">

  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">

    {/* Search */}
    <div className="relative xl:col-span-2">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71817A]" />

      <input
        type="text"
        value={movementSearch}
        onChange={(e) =>
          setMovementSearch(
            e.target.value
          )
        }
        placeholder="Search product, supplier, reference..."
        className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-[#DDE6E0] bg-white text-[#34463F] placeholder:text-[#8A9892] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A]"
      />
    </div>

    {/* Movement Type */}
    <div className="flex rounded-xl border border-[#DDE6E0] bg-[#F7FAF8] p-1">
      {([
        ['all', 'All'],
        ['Stock-In', 'Stock-In'],
        ['Stock-Out', 'Stock-Out'],
      ] as const).map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setMovementTypeFilter(value)}
          className={`flex-1 rounded-lg px-2.5 py-2 text-[11px] font-bold transition ${
            movementTypeFilter === value
              ? 'bg-[#17372D] text-white shadow-sm'
              : 'text-[#61766D] hover:bg-white hover:text-[#17372D]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>

    {/* Source */}
    <select
      value={movementSourceFilter}
      onChange={(e) => setMovementSourceFilter(e.target.value)}
      className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#DDE6E0] bg-white text-[#34463F] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A]"
    >
      <option value="all">All Sources</option>
      <option value="Opening Inventory">Opening Inventory</option>
      <option value="Stock Receiving">Stock Receiving</option>
      <option value="Sales Return">Sales Return</option>
      <option value="Sale Void Reversal">Sale Void Reversal</option>
      <option value="POS">POS</option>
      <option value="Pickup">Pickup</option>
      <option value="Shop & Go">Shop &amp; Go</option>
      <option value="Delivery">Delivery</option>
    </select>

    {/* Category */}
    <select
      value={movementCategoryFilter}
      onChange={(e) =>
        setMovementCategoryFilter(
          e.target.value
        )
      }
      className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#DDE6E0] bg-white text-[#34463F] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A]"
    >
      <option value="all">
        All Categories
      </option>

      {categories.map((category) => (
        <option
          key={category.category_id}
          value={category.category_name}
        >
          {category.category_name}
        </option>
      ))}
    </select>

    {/* Result Counter */}
    <div className="flex items-center justify-center xl:justify-end text-xs text-[#71817A]">
      Showing&nbsp;
      <span className="font-bold text-[#17372D]">
        {filteredInventoryMovements.length}
      </span>
      &nbsp;of&nbsp;
      <span className="font-bold text-[#17372D]">
        {inventoryMovements.length}
      </span>
    </div>

  </div>

  {/* Date Range */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 max-w-xl">

    <div>
      <label className="block text-[10px] font-bold text-[#52645D] uppercase tracking-wider mb-1">
        From
      </label>

      <input
        type="date"
        value={movementDateFrom}
        max={movementDateTo || undefined}
        onChange={(e) =>
          setMovementDateFrom(
            e.target.value
          )
        }
        className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#DDE6E0] bg-white text-[#34463F] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A]"
      />
    </div>

    <div>
      <label className="block text-[10px] font-bold text-[#52645D] uppercase tracking-wider mb-1">
        To
      </label>

      <input
        type="date"
        value={movementDateTo}
        min={movementDateFrom || undefined}
        onChange={(e) =>
          setMovementDateTo(
            e.target.value
          )
        }
        className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#DDE6E0] bg-white text-[#34463F] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A]"
      />
    </div>

  </div>

</div>

    <div className="overflow-hidden rounded-2xl border border-steel-200/60 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-steel-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold font-display text-steel-900">Movement Records</h3>
          <p className="mt-1 text-xs text-steel-500">Compact view combines related fields while keeping every original movement detail available.</p>
        </div>
        <div className="inline-flex w-fit rounded-xl border border-[#DDE6E0] bg-[#F6F9F7] p-1" role="group" aria-label="Inventory movement table view">
          <button type="button" onClick={() => setMovementTableView('compact')} className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition ${movementTableView === 'compact' ? 'bg-white text-[#0D7740] shadow-sm' : 'text-[#71817A] hover:text-[#17372D]'}`}>Compact</button>
          <button type="button" onClick={() => setMovementTableView('full')} className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition ${movementTableView === 'full' ? 'bg-white text-[#0D7740] shadow-sm' : 'text-[#71817A] hover:text-[#17372D]'}`}>Full Columns</button>
        </div>
      </div>

      {filteredInventoryMovements.length === 0 ? (
        <div className="py-12 text-center text-steel-500"><ArrowLeftRight className="mx-auto mb-2 h-10 w-10 text-steel-300" /><p className="text-xs">{inventoryMovements.length === 0 ? 'No inventory movements recorded yet.' : 'No inventory movements match the selected filters.'}</p></div>
      ) : movementTableView === 'compact' ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-[11px]">
            <thead className="sticky top-0 z-10 border-b border-steel-200 bg-[#F7FAF8] text-[8px] uppercase tracking-[0.1em] text-[#71817A]">
              <tr><th className="px-4 py-3">Date / Reference</th><th className="px-4 py-3">Product</th><th className="px-3 py-3">Movement</th><th className="px-3 py-3">Source</th><th className="px-3 py-3">Supplier</th><th className="px-3 py-3 text-right">Cost / Unit</th><th className="px-3 py-3">Recorded By</th><th className="px-4 py-3 text-right">Details</th></tr>
            </thead>
            <tbody className="divide-y divide-steel-100">
              {filteredInventoryMovements.map((movement) => (
                <tr key={movement.movement_id} className="hover:bg-[#FAFCFB]">
                  <td className="px-4 py-3 align-top"><p className="whitespace-nowrap font-semibold text-steel-600">{new Date(movement.movement_date).toLocaleString()}</p><p className="mt-1 whitespace-nowrap font-extrabold text-[#0D7740]">{movement.reference_label || '—'}</p></td>
                  <td className="max-w-[260px] px-4 py-3 align-top"><p className="line-clamp-2 font-extrabold leading-5 text-[#17372D]">{movement.product_name}</p><p className="mt-1 text-[8px] text-[#8A9992]">{movement.category || 'Uncategorized'}{movement.barcode ? ` · ${movement.barcode}` : ''}</p></td>
                  <td className="px-3 py-3 align-top"><span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-bold ${movement.movement_type === 'Stock-In' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{movement.movement_type === 'Stock-In' ? '+' : '-'}{movement.quantity} {movement.movement_type}</span></td>
                  <td className="px-3 py-3 align-top"><span className="inline-flex rounded-full border border-[#DDE6E0] bg-[#F7FAF8] px-2 py-1 text-[9px] font-bold text-[#52645D]">{movement.source_label || 'Inventory Movement'}</span></td>
                  <td className="px-3 py-3 align-top text-steel-600">{movement.supplier_name || '—'}</td>
                  <td className="px-3 py-3 text-right align-top font-bold tabular-nums text-steel-700">{formatPeso(Number(movement.supplier_price || 0))}</td>
                  <td className="px-3 py-3 align-top text-steel-600">{movement.recorded_by?.trim() || `Admin #${movement.admin_id}`}</td>
                  <td className="px-4 py-3 text-right align-top"><button type="button" onClick={() => setSelectedMovementHistory(movement)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#CFE0D7] bg-white px-2.5 py-1.5 text-[9px] font-extrabold text-[#0D7740] hover:bg-emerald-50"><Eye className="h-3.5 w-3.5" />View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-steel-200 bg-steel-50"><tr className="text-left uppercase tracking-wider text-steel-500"><th className="px-4 py-3">Date</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Cost / Unit</th><th className="px-4 py-3">Selling Price</th><th className="px-4 py-3">System Reference</th><th className="px-4 py-3">Supplier Reference</th><th className="px-4 py-3">Receipt</th><th className="px-4 py-3">Remarks</th><th className="px-4 py-3">Recorded By</th></tr></thead>
            <tbody>
              {filteredInventoryMovements.map((movement) => (
                <tr key={movement.movement_id} className="border-b border-steel-100 last:border-0 hover:bg-steel-50/50">
                  <td className="whitespace-nowrap px-4 py-3 text-steel-500">{new Date(movement.movement_date).toLocaleString()}</td><td className="px-4 py-3 font-semibold text-steel-800">{movement.product_name}</td><td className="px-4 py-3">{movement.movement_type}</td><td className="whitespace-nowrap px-4 py-3 font-bold">{movement.movement_type === 'Stock-In' ? '+' : '-'}{movement.quantity}</td><td className="whitespace-nowrap px-4 py-3">{movement.source_label || 'Inventory Movement'}</td><td className="px-4 py-3">{movement.supplier_name || '—'}</td><td className="px-4 py-3">{formatPeso(Number(movement.supplier_price || 0))}</td><td className="px-4 py-3">{formatPeso(Number(movement.selling_price || 0))}</td><td className="whitespace-nowrap px-4 py-3 text-[#2F7D5A]">{movement.reference_label || '—'}</td><td className="whitespace-nowrap px-4 py-3">{movement.supplier_reference || '—'}</td><td className="px-4 py-3">{movement.receipt_path ? <a href={movement.receipt_path} target="_blank" rel="noreferrer" className="font-bold text-[#0D7740] hover:underline">View Receipt</a> : '—'}</td><td className="px-4 py-3">{movement.remarks || '—'}</td><td className="whitespace-nowrap px-4 py-3">{movement.recorded_by?.trim() || `Admin #${movement.admin_id}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>

    {selectedMovementHistory && (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="movement-detail-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelectedMovementHistory(null); }}>
        <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[#DDE6E0] bg-white shadow-2xl">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#E5ECE8] bg-white px-5 py-4">
            <div><p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#15803d]">Inventory Movement</p><h3 id="movement-detail-title" className="mt-1 font-display text-lg font-extrabold text-[#17372D]">{selectedMovementHistory.reference_label || `Movement #${selectedMovementHistory.movement_id}`}</h3><p className="mt-1 text-[10px] text-[#71817A]">{new Date(selectedMovementHistory.movement_date).toLocaleString()}</p></div>
            <button type="button" onClick={() => setSelectedMovementHistory(null)} className="rounded-xl border border-[#DDE6E0] p-2 text-[#52635B] hover:bg-[#F5F8F6]" aria-label="Close movement details"><X className="h-4 w-4" /></button>
          </div>
          <div className="space-y-4 p-5">
            <div className="rounded-2xl border border-[#E5ECE8] bg-[#FAFCFB] p-4"><p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#71817A]">Product</p><p className="mt-2 text-sm font-extrabold text-[#17372D]">{selectedMovementHistory.product_name}</p><p className="mt-1 text-[9px] text-[#8A9992]">{selectedMovementHistory.category || 'Uncategorized'}{selectedMovementHistory.barcode ? ` · ${selectedMovementHistory.barcode}` : ''}</p></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Movement', `${selectedMovementHistory.movement_type === 'Stock-In' ? '+' : '-'}${selectedMovementHistory.quantity} ${selectedMovementHistory.movement_type}`], ['Source', selectedMovementHistory.source_label || 'Inventory Movement'], ['Recorded By', selectedMovementHistory.recorded_by?.trim() || `Admin #${selectedMovementHistory.admin_id}`], ['Supplier', selectedMovementHistory.supplier_name || '—'], ['Cost / Unit', formatPeso(Number(selectedMovementHistory.supplier_price || 0))], ['Selling Price', formatPeso(Number(selectedMovementHistory.selling_price || 0))], ['Supplier Reference', selectedMovementHistory.supplier_reference || '—'], ['Movement Reason', selectedMovementHistory.movement_reason || '—'], ['Remarks', selectedMovementHistory.remarks || '—'],
              ].map(([label, value]) => <div key={label} className="rounded-xl border border-[#E5ECE8] bg-white p-3"><p className="text-[8px] font-extrabold uppercase tracking-[0.1em] text-[#7A8E85]">{label}</p><p className="mt-1 break-words text-sm font-extrabold tabular-nums text-[#17372D]">{value}</p></div>)}
            </div>
            {selectedMovementHistory.receipt_path && <a href={selectedMovementHistory.receipt_path} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[#CFE0D7] bg-emerald-50 px-4 py-2.5 text-xs font-extrabold text-[#0D7740] hover:bg-emerald-100"><Eye className="h-4 w-4" />Open supporting receipt</a>}
          </div>
        </div>
      </div>
    )}
  </div>
)}

        {/* CENTRALIZED AUDIT LOGGING */}
        {activeTab === 'auditLogs' && (
          <AdminAuditLogPanel />
        )}

        {/* REPORTS CENTER */}
        {activeTab === 'reports' && (
          <section className="space-y-5 animate-fade-up">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2F7D5A]">
                  Sales &amp; Reports
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold text-[#17372D]">
                  Admin Reports Center
                </h2>
                <p className="mt-1 text-sm text-[#61766D]">
                  Generate operational reports from the current Rayjin Hardware records.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#CFE0D7] bg-white px-4 py-2.5 text-xs font-bold text-[#17372D] shadow-sm transition hover:border-[#2F7D5A] hover:text-[#15803D]"
                >
                  <Printer className="h-4 w-4" />
                  Print Report
                </button>
                <button
                  type="button"
                  onClick={handleExportReportCsv}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#15803D] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#126B34]"
                >
                  <Download className="h-4 w-4" />
                  Export to CSV
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#DDE6E0] bg-white shadow-sm">
              <div className="border-b border-[#DDE6E0] bg-[#12372A] px-5 py-5 text-white md:px-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                      <FileBarChart className="h-5 w-5 text-[#9DD3B6]" />
                    </span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9DD3B6]">
                        Rayjin Hardware
                      </p>
                      <h3 className="mt-0.5 text-lg font-bold">{reportTitle}</h3>
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#9DD3B6]">
                      Report generated
                    </p>
                    <p className="mt-1 text-xs font-semibold text-white">
                      {reportGeneratedAt.toLocaleString('en-PH')}
                    </p>
                  </div>
                </div>
              </div>

             <div className="grid grid-cols-1 gap-2 border-b border-[#E5ECE8] bg-[#F8FAF9] p-3 sm:grid-cols-2 xl:grid-cols-5">
  {([
    ['management', 'Management Summary'],
    ['sales', 'Sales Report'],
    ['inventory', 'Inventory Report'],
    ['lowStock', 'Low Stock Report'],
    ['stockMovement', 'Stock Movement Report'],
  ] as Array<[ReportType, string]>).map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setReportType(type);
                      setReportSearch('');
                      setReportGeneratedAt(new Date());
                    }}
                    className={`rounded-xl px-4 py-3 text-xs font-bold transition ${
                      reportType === type
                        ? 'bg-[#15803D] text-white shadow-sm'
                        : 'border border-[#DDE6E0] bg-white text-[#61766D] hover:border-[#89B69F] hover:text-[#17372D]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-4 md:p-5">
                <div className={`grid gap-3 ${
  reportType === 'management'
    ? 'grid-cols-1'
    : reportType === 'sales'
    ? 'md:grid-cols-[minmax(0,1fr)_180px_180px]'
    : reportType === 'stockMovement'
      ? 'xl:grid-cols-[minmax(0,1fr)_170px_170px_170px]'
      : 'md:grid-cols-[minmax(0,1fr)_240px]'
}`}>
                  <label className="relative block">
                    <span className="sr-only">Search report</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A8E85]" />
                    <input
                      type="search"
                      value={reportSearch}
                      onChange={(event) => {
                        setReportSearch(event.target.value);
                        setReportGeneratedAt(new Date());
                      }}
                      placeholder={
  reportType === 'management'
    ? 'Management Summary is generated from current integrated records...'
    : reportType === 'sales'
      ? 'Search reference, product, or sales source...'
    : reportType === 'stockMovement'
      ? 'Search product, supplier, source, or reference...'
      : 'Search product, category, or supplier...'
}
                      className="h-11 w-full rounded-xl border border-[#D5E1DA] bg-white pl-10 pr-4 text-xs font-medium text-[#17372D] outline-none transition focus:border-[#2F7D5A] focus:ring-2 focus:ring-[#2F7D5A]/10"
                    />
                  </label>

                  {reportType === 'management' ? null : reportType === 'sales' ? (
  <>
    <label>
      <span className="sr-only">Start date</span>
      <input
        type="date"
        value={reportDateFrom}
        max={reportDateTo || undefined}
        onChange={(event) => {
          setReportDateFrom(event.target.value);
          setReportGeneratedAt(new Date());
        }}
        className="h-11 w-full rounded-xl border border-[#D5E1DA] bg-white px-3 text-xs font-semibold text-[#34463F] outline-none focus:border-[#2F7D5A]"
        aria-label="Sales report start date"
      />
    </label>

    <label>
      <span className="sr-only">End date</span>
      <input
        type="date"
        value={reportDateTo}
        min={reportDateFrom || undefined}
        onChange={(event) => {
          setReportDateTo(event.target.value);
          setReportGeneratedAt(new Date());
        }}
        className="h-11 w-full rounded-xl border border-[#D5E1DA] bg-white px-3 text-xs font-semibold text-[#34463F] outline-none focus:border-[#2F7D5A]"
        aria-label="Sales report end date"
      />
    </label>
  </>
) : reportType === 'stockMovement' ? (
  <>
    <label>
      <span className="sr-only">
        Filter by movement type
      </span>

      <select
        value={reportMovementType}
        onChange={(event) => {
          setReportMovementType(
            event.target.value as
              | 'all'
              | 'Stock-In'
              | 'Stock-Out'
          );

          setReportGeneratedAt(new Date());
        }}
        className="h-11 w-full rounded-xl border border-[#D5E1DA] bg-white px-3 text-xs font-semibold text-[#34463F] outline-none focus:border-[#2F7D5A]"
      >
        <option value="all">
          All Movements
        </option>

        <option value="Stock-In">
          Stock In
        </option>

        <option value="Stock-Out">
          Stock Out
        </option>
      </select>
    </label>

    <label>
      <span className="sr-only">
        Stock movement report start date
      </span>

      <input
        type="date"
        value={reportMovementDateFrom}
        max={
          reportMovementDateTo ||
          undefined
        }
        onChange={(event) => {
          setReportMovementDateFrom(
            event.target.value
          );

          setReportGeneratedAt(
            new Date()
          );
        }}
        className="h-11 w-full rounded-xl border border-[#D5E1DA] bg-white px-3 text-xs font-semibold text-[#34463F] outline-none focus:border-[#2F7D5A]"
        aria-label="Stock movement report start date"
      />
    </label>

    <label>
      <span className="sr-only">
        Stock movement report end date
      </span>

      <input
        type="date"
        value={reportMovementDateTo}
        min={
          reportMovementDateFrom ||
          undefined
        }
        onChange={(event) => {
          setReportMovementDateTo(
            event.target.value
          );

          setReportGeneratedAt(
            new Date()
          );
        }}
        className="h-11 w-full rounded-xl border border-[#D5E1DA] bg-white px-3 text-xs font-semibold text-[#34463F] outline-none focus:border-[#2F7D5A]"
        aria-label="Stock movement report end date"
      />
    </label>
  </>
) : (
  <label>
    <span className="sr-only">
      Filter by category
    </span>

    <select
      value={reportCategory}
      onChange={(event) => {
        setReportCategory(
          event.target.value
        );

        setReportGeneratedAt(
          new Date()
        );
      }}
      className="h-11 w-full rounded-xl border border-[#D5E1DA] bg-white px-3 text-xs font-semibold text-[#34463F] outline-none focus:border-[#2F7D5A]"
    >
      <option value="all">
        All categories
      </option>

      {Array.from(
        new Set(
          products.map(
            (product) =>
              product.category
          )
        )
      )
        .filter(Boolean)
        .sort()
        .map((category) => (
          <option
            key={category}
            value={category}
          >
            {category}
          </option>
        ))}
    </select>
  </label>
)}
                </div>

                {reportType === 'management' && (
                  <div className="mt-4 space-y-3">
                    {managementOverviewError && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                        {managementOverviewError}
                      </div>
                    )}
                    {managementOverviewReport && (
                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
                        {[
                          ['Estimated Net Profit', formatPeso(managementOverviewReport.profitability.month.estimatedNetProfit)],
                          ['Operating Expenses', formatPeso(managementOverviewReport.profitability.month.operatingExpenses)],
                          ['Open POs', managementOverviewReport.purchasing.openPurchaseOrders.toLocaleString()],
                          ['Need Reorder', managementOverviewReport.replenishment.needsReorder.toLocaleString()],
                          ['Refunds Today', formatPeso(managementOverviewReport.saleAdjustmentsToday.refundAmount)],
                          ['Cashier Shift', managementOverviewReport.cashier.hasOpenShift ? `Open #${managementOverviewReport.cashier.currentShift?.shiftId}` : 'Closed / None'],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-xl border border-[#DDE6E0] bg-[#F8FAF9] p-4">
                            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#7A8E85]">{label}</p>
                            <p className="mt-2 text-base font-extrabold text-[#17372D]">{value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {reportType === 'sales' && (
                  <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
                    {[
                      ['Transactions', reportSalesSummary.totalSales.toLocaleString()],
                      ['Gross Merchandise', formatPeso(reportSalesSummary.grossMerchandiseSales)],
                      ['Discounts', formatPeso(reportSalesSummary.discounts)],
                      ['Returns / Refunds', formatPeso(reportSalesSummary.refunds)],
                      ['Net Merchandise Sales', formatPeso(reportSalesSummary.netMerchandiseSales)],
                      ['Service / Delivery Revenue', formatPeso(reportSalesSummary.feeRevenue)],
                      ['Total Revenue', formatPeso(reportSalesSummary.totalRevenue)],
                      ['COGS', formatPeso(reportSalesSummary.cost)],
                      ['Gross Profit', formatPeso(reportSalesSummary.grossProfit)],
                      ['Gross Margin', `${Number(reportSalesSummary.grossMargin || 0).toFixed(2)}%`],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-[#DDE6E0] bg-[#F8FAF9] p-4">
                        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#7A8E85]">
                          {label}
                        </p>
                        <p className="mt-2 text-lg font-extrabold text-[#17372D]">{value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {reportType === 'inventory' && (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ['Products', reportInventorySummary.products.toLocaleString()],
                      ['Current Units', reportInventorySummary.units.toLocaleString()],
                      ['Inventory Cost Value', formatPeso(reportInventorySummary.inventoryCostValue)],
                      ['Potential Retail Value', formatPeso(reportInventorySummary.retailValue)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-[#DDE6E0] bg-[#F8FAF9] p-4">
                        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#7A8E85]">{label}</p>
                        <p className="mt-2 text-lg font-extrabold text-[#17372D]">{value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {reportType === 'lowStock' && (
                  <div className="mt-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="text-xs font-bold text-red-800">Products below reorder level</p>
                        <p className="text-[10px] text-red-600">
  Each product uses its configured reorder level.
</p>
                      </div>
                    </div>
                    <strong className="text-xl text-red-700">{reportLowStockRows.length}</strong>
                  </div>
                )}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#71817A]">On-screen table</p>
                    <p className="mt-1 text-[10px] text-[#8A9992]">Compact view reduces horizontal scrolling. Print and CSV always keep the complete report fields.</p>
                  </div>
                  <div className="inline-flex w-fit rounded-xl border border-[#DDE6E0] bg-[#F6F9F7] p-1" role="group" aria-label="Report table view">
                    <button type="button" onClick={() => setReportTableView('compact')} className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition ${reportTableView === 'compact' ? 'bg-white text-[#0D7740] shadow-sm' : 'text-[#71817A] hover:text-[#17372D]'}`}>Compact</button>
                    <button type="button" onClick={() => setReportTableView('full')} className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition ${reportTableView === 'full' ? 'bg-white text-[#0D7740] shadow-sm' : 'text-[#71817A] hover:text-[#17372D]'}`}>Full Columns</button>
                  </div>
                </div>

                <div className="mt-3 overflow-x-auto rounded-xl border border-[#DDE6E0]">
                  <table className={`${reportTableView === 'compact' ? 'w-full' : 'min-w-full'} border-collapse text-left`}>
                    <thead className="bg-[#EEF5F1]">
                      <tr>
                        {reportScreenHeaders.map((header) => (
                          <th
                            key={header}
                            className={`px-4 py-3 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#587067] ${
                              reportType === 'sales'
                                ? 'whitespace-normal leading-4'
                                : 'whitespace-nowrap'
                            }`}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5ECE8] bg-white">
                      {reportTableRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={reportScreenHeaders.length}
                            className="px-4 py-12 text-center text-xs text-[#7A8E85]"
                          >
                            No records match the selected filters.
                          </td>
                        </tr>
                      ) : (
                        reportScreenRows.map((row, rowIndex) => (
                          <tr key={`${reportType}-${rowIndex}`} className="hover:bg-[#F8FAF9]">
                            {row.map((value, columnIndex) => (
                              <td
                                key={`${rowIndex}-${columnIndex}`}
                                className={`px-4 py-3 text-[11px] font-medium text-[#40564D] ${
                                  reportTableView === 'compact'
                                    ? columnIndex === 1
                                      ? 'max-w-[340px] whitespace-normal leading-4'
                                      : [3, 4, 5, 6].includes(columnIndex)
                                        ? 'whitespace-nowrap tabular-nums'
                                        : 'whitespace-normal leading-4'
                                    : reportType === 'sales'
                                      ? columnIndex === 2
                                        ? 'min-w-[220px] max-w-[340px] whitespace-normal leading-4'
                                        : [4, 5, 6, 7, 8, 9, 10, 11, 12, 13].includes(columnIndex)
                                          ? 'whitespace-nowrap text-right tabular-nums'
                                          : 'min-w-[110px] whitespace-normal leading-4'
                                      : 'whitespace-nowrap'
                                }`}
                              >
                                {value}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <p className="mt-3 text-right text-[10px] font-medium text-[#7A8E85]">
                  Showing {reportScreenRows.length.toLocaleString()} record{reportScreenRows.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          </section>
        )}

        </div>

        <footer className="-mx-4 mt-10 border-t border-[#D8E5DD] bg-white/75 px-4 py-4 text-[#61766D] backdrop-blur-sm md:-mx-6 md:px-6 lg:-mx-6 xl:-mx-8 xl:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[#15803d]"><Wrench className="h-4 w-4" /></span>
              <div>
                <p className="text-[10px] font-extrabold text-[#17372D]">© {new Date().getFullYear()} Rayjin Hardware Administration System</p>
                <p className="mt-0.5 text-[8px] font-medium text-[#8A9992]">Brgy. Poblacion, Zone 11, Initao, Misamis Oriental</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/project" className="rounded-lg px-3 py-2 text-[9px] font-extrabold text-[#52635B] transition hover:bg-emerald-50 hover:text-[#15803d]">Capstone Overview</Link>
              <button type="button" onClick={handleDashboardBackToTop} className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE6E0] bg-white px-3 py-2 text-[9px] font-extrabold text-[#17372D] transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-[#15803d]">Back to top <ArrowUp className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </footer>

      </main>
    </div>
  );
}
