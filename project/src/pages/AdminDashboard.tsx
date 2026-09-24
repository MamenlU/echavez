import React, {
  useState,
  useEffect,
  useRef
} from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { 
  LayoutDashboard, ClipboardList, Package, ScanBarcode, ArrowLeftRight,
  TrendingUp, AlertTriangle, CheckCircle, Clock, ShoppingCart, 
  Search, Shield, MapPin, Save, RefreshCw, UsersRound, Mail,
  Phone, CalendarDays, Eye, UserCheck, UserX, Menu, X,
  FileBarChart, Printer, Download, ArrowUp, Wrench
} from 'lucide-react';

type AdminTab =
  | 'overview'
  | 'customers'
  | 'orders'
  | 'deliveryRates'
  | 'products'
  | 'receiveStock'
  | 'categories'
  | 'suppliers'
  | 'pos'
  | 'sales'
  | 'movementHistory'
  | 'reports';

type ReportType =
  | 'sales'
  | 'inventory'
  | 'lowStock'
  | 'stockMovement';

const adminTabs: AdminTab[] = [
  'overview',
  'customers',
  'orders',
  'deliveryRates',
  'products',
  'receiveStock',
  'categories',
  'suppliers',
  'pos',
  'sales',
  'movementHistory',
  'reports',
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
  barangay: string;
  zone: DeliveryZone;
  surcharge: number;
  is_active: boolean;
  updated_at?: string;
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
  quantity: number;

  supplier_price: number;
  selling_price: number;

  movement_date: string;
  remarks: string | null;
  receipt_path?: string | null;
  source_label?: string | null;
  reference_label?: string | null;
}

interface SalesHistoryItem {
  sale_id: number;
  order_id: string | null;
  admin_id: number;
  sales_source: 'Online Order' | 'Onsite POS';
  revenue: number;
  payment_status: 'Paid' | 'Cancelled';
  sale_date: string;
  item_count: number;
total_quantity: number;
items_summary: string;
  cogs: number;
  gross_profit: number;
  reference: string;
  source_label: 'Pickup' | 'Shop & Go' | 'Delivery' | 'POS';
  payment_method: string;
}

interface SalesSummary {
  total_sales: number;
  total_revenue: number;
  total_cogs: number;
  total_gross_profit: number;
}

interface CartItem {
  product: Product;
  quantity: number;
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
  items: CartItem[];
  total: number;

  fulfillment:
    | 'pickup'
    | 'delivery'
    | 'shop_go';

  paymentMethod:
    | 'card'
    | 'gcash'
    | 'cash';

  payment_method?: string;

  customer_first_name?: string | null;
  customer_last_name?: string | null;
  customer_phone_number?: string | null;
  customer_email?: string | null;

  requested_pickup_date?: string | null;
  requested_pickup_time?: string | null;

  scheduled_pickup_date?: string | null;
  scheduled_pickup_time?: string | null;

  admin_message?: string | null;

  delivery_contact_person?: string | null;
  delivery_contact_number?: string | null;
  delivery_barangay?: string | null;
  delivery_address?: string | null;
  delivery_landmark?: string | null;
  delivery_instructions?: string | null;
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
const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

const adminNavClass = (tab: AdminTab) =>
  `group flex w-full items-center rounded-xl py-3 text-[13px] font-medium
   transition-all duration-200 active:scale-[0.98]
   ${
     isSidebarCollapsed
       ? 'gap-3 px-4 lg:justify-center lg:gap-0 lg:px-0'
       : 'gap-3 px-4'
   }
   ${
     activeTab === tab
       ? 'bg-emerald-50 text-[#15803d] ring-1 ring-emerald-100 shadow-sm'
       : 'text-[#476257] hover:bg-[#f2faf5] hover:text-[#15803d]'
   }`;
const adminNavLabelClass =
  isSidebarCollapsed
    ? 'lg:hidden'
    : '';

const adminSectionLabelClass =
  `px-4 pb-1 text-[10px] font-bold uppercase tracking-[0.18em]
   text-[#789086] ${
     isSidebarCollapsed ? 'lg:hidden' : ''
   }`;
   useEffect(() => {
  scrollAdminContentToTop('auto');
}, [activeTab]);


const [reportType, setReportType] = useState<ReportType>('sales');
const [reportSearch, setReportSearch] = useState('');
const [reportDateFrom, setReportDateFrom] = useState('');
const [reportDateTo, setReportDateTo] = useState('');
const [reportCategory, setReportCategory] = useState('all');
const [reportGeneratedAt, setReportGeneratedAt] = useState(new Date());

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
    total_revenue: 0,
    total_cogs: 0,
    total_gross_profit: 0,
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
  address: ''
});
const [editSupplierStatus, setEditSupplierStatus] = useState<
  'idle' | 'success' | 'error'
>('idle');

const [editSupplierError, setEditSupplierError] = useState('');
  const [newSupplier, setNewSupplier] = useState({
  supplier_name: '',
  contact_person: '',
  contact_number: '',
  address: ''
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
  const [deliveryRateSettings, setDeliveryRateSettings] =
    useState<DeliveryRateSetting[]>([]);
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
  const [posDeliveryDetails, setPosDeliveryDetails] = useState({
    customer_name: '',
    contact_person: '',
    contact_number: '',
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

    // Normal compact Product Selection height.
    const minimumHeight = 500;

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
  opening_supplier_price: ''
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
  selling_price: '',
  receipt_image: ''
});

const [stockReceivingProductQuery, setStockReceivingProductQuery] = useState('');
const [stockReceivingSupplierQuery, setStockReceivingSupplierQuery] = useState('');
const [stockReceivingSearch, setStockReceivingSearch] = useState('');
const [stockReceivingDateFrom, setStockReceivingDateFrom] = useState('');
const [stockReceivingDateTo, setStockReceivingDateTo] = useState('');
const [stockReceivingRequestId, setStockReceivingRequestId] = useState(() => crypto.randomUUID());

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
        total_revenue: 0,
        total_cogs: 0,
        total_gross_profit: 0,
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

  if (!stockReceiving.receipt_image) {
    setStockReceivingStatus('error');
    setStockReceivingMessage('Please attach a receipt image.');
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
    !stockReceiving.supplier_price ||
    supplierPrice <= 0
  ) {
    setStockReceivingStatus('error');
    setStockReceivingMessage(
      'Supplier cost must be greater than zero.'
    );
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
        ...(sellingPrice !== undefined && {
          selling_price: sellingPrice,
        }),
        receipt_image: stockReceiving.receipt_image,
        receivingRequestId: stockReceivingRequestId,
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
      selling_price: '',
      receipt_image: '',
    });

    setStockReceivingProductQuery('');
    setStockReceivingSupplierQuery('');
    setStockReceivingRequestId(crypto.randomUUID());

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

const handleReceiptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    setStockReceivingStatus('error');
    setStockReceivingMessage('Receipt must be a JPG, PNG, or WEBP image.');
    event.target.value = '';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    setStockReceivingStatus('error');
    setStockReceivingMessage('Receipt image must not exceed 5 MB.');
    event.target.value = '';
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
    address: supplier.address || ''
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
      fetchSalesHistory(),
      fetchProducts(),
      fetchSuppliers(),
      fetchInventoryMovements(),
    ]).then(() => setReportGeneratedAt(new Date()));
  }
}, [activeTab]);

useEffect(() => {
  if (activeTab === 'deliveryRates' || activeTab === 'pos') {
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

  const adminMessage =
    String(
      form.get('adminMessage') || ''
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
          adminMessage,
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

const handleSaveAdminMessage = async (orderId: string, message: string) => {
  const token = localStorage.getItem('token');
  if (!token) return handleAdminSessionExpired();
  try {
    const response = await fetch(`/api/orders/${orderId}/admin-message`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ adminMessage: message }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) return handleAdminSessionExpired();
    if (!response.ok) return alert(data.error || 'Unable to update the message.');
    alert(data.message || 'Message updated successfully.');
    await fetchOrders();
  } catch (error) {
    console.error('Admin message error:', error);
    alert('Unable to connect to the order service.');
  }
};

const handleOrderAction = async (
  order: Order,
  action: 'failed_delivery' | 'deactivate' | 'reactivate' | 'cancel' | 'cancel_permanently'
) => {
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
  } catch (error) {
    console.error('Order action error:', error);
    alert('Unable to connect to the order service.');
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

  opening_supplier_price:
    newProduct.opening_supplier_price
      ? Number(
          newProduct.opening_supplier_price
        )
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
  opening_supplier_price: '',
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

  // Delete product
const handleDeleteProduct = async (id: number) => {
  const confirmed = confirm(
    'Are you sure you want to delete this product?'
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
      `/api/products/${id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json().catch(() => ({}));

    if (res.status === 401 || res.status === 403) {
      handleAdminSessionExpired();
      return;
    }

    if (!res.ok) {
      alert(
        data.error || 'Unable to delete product.'
      );
      return;
    }

    await fetchProducts();

  } catch (err) {
    console.error(
      'Error deleting product:',
      err
    );

    alert(
      'Unable to delete product.'
    );
  }
};

  // POS operations
  const handleAddToPosCart = (
  product: Product
) => {
  if (product.stock <= 0) {
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

  const handleUpdatePosQty = (productId: number, amount: number) => {
    const existing = posCart.find(item => item.product.id === productId);
    if (!existing) return;
    const newQty = existing.quantity + amount;
    if (newQty <= 0) {
      setPosCart(posCart.filter(item => item.product.id !== productId));
    } else {
      setPosCart(posCart.map(item => 
        item.product.id === productId ? { ...item, quantity: newQty } : item
      ));
    }
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

  if (posFulfillment === 'delivery') {
    if (
      !posDeliveryDetails.customer_name.trim() ||
      !posDeliveryDetails.contact_person.trim() ||
      !posDeliveryDetails.contact_number.trim() ||
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
      .join('|') + `|${posFulfillment}|${deliveryFee}|${posDeliveryDetails.contact_number}`;

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
      customer_name: '', contact_person: '', contact_number: '', barangay: '',
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
  { key: 'approved', label: 'Approved' },
  { key: 'processing', label: 'Processing' },
  { key: 'ready', label: 'Ready for Pickup' },
  { key: 'completed', label: 'Completed' },
]
        : [
            { key: 'pending', label: 'Pending' },
            { key: 'approved', label: 'Approved' },
            { key: 'processing', label: 'Processing' },
            { key: 'ready', label: 'Ready for Pickup' },
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

  const getAdminOrderStatusLabel = (order: Order) => {
    if (order.fulfillment === 'pickup') {
  if (order.status === 'pending') {
    return 'For Approval';
  }

  if (order.status === 'awaiting_payment') {
    return 'Required Payment';
  }
}

    if (order.status === 'ready') return 'Ready for Pickup';
    return order.status.split('_').join(' ');
  };
  const sortedOrders = [...orders].sort((first, second) => {
    const priorityDifference = orderStatusPriority[first.status] - orderStatusPriority[second.status];
    if (priorityDifference !== 0) return priorityDifference;
    return new Date(second.date).getTime() - new Date(first.date).getTime();
  });

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

  const dashboardOrderTotal = Math.max(
    dashboardPendingCount +
      dashboardProcessingCount +
      completedOrderCount +
      dashboardCancelledCount,
    1
  );

  const completedOrderPercent =
    (completedOrderCount / dashboardOrderTotal) * 100;

  const pendingOrderPercent =
    (dashboardPendingCount / dashboardOrderTotal) * 100;

  const processingOrderPercent =
    (dashboardProcessingCount / dashboardOrderTotal) * 100;

  const dashboardStatusGradient =
    orders.length === 0
      ? '#E5ECE8'
      : `conic-gradient(
          #15944F 0 ${completedOrderPercent}%,
          #F59E0B ${completedOrderPercent}% ${completedOrderPercent + pendingOrderPercent}%,
          #3B82F6 ${completedOrderPercent + pendingOrderPercent}% ${completedOrderPercent + pendingOrderPercent + processingOrderPercent}%,
          #DC2626 ${completedOrderPercent + pendingOrderPercent + processingOrderPercent}% 100%
        )`;

  const recentDashboardOrders = [...orders]
    .sort(
      (firstOrder, secondOrder) =>
        new Date(secondOrder.date).getTime() -
        new Date(firstOrder.date).getTime()
    )
    .slice(0, 5);

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

  const dashboardMaximumRevenue = Math.max(
    ...dashboardSalesDays.map((day) => day.revenue),
    1
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
  (rate) => rate.barangay === posDeliveryDetails.barangay && rate.is_active
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
      reference
        .toLowerCase()
        .includes(query);

    const matchesType =
      movementTypeFilter === 'all' ||
      movement.movement_type ===
        movementTypeFilter;

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
      matchesCategory &&
      matchesDate
    );
  });

const receivedStockHistory = inventoryMovements.filter((movement) => {
  if (movement.movement_type !== 'Stock-In' || movement.remarks === 'Opening Inventory') return false;
  const query = stockReceivingSearch.trim().toLowerCase();
  const searchable = [
    movement.product_name,
    movement.barcode,
    movement.supplier_name,
    movement.reference_label,
  ].filter(Boolean).join(' ').toLowerCase();
  if (query && !searchable.includes(query)) return false;

  const movementDate = new Date(movement.movement_date);
  if (stockReceivingDateFrom && movementDate < new Date(`${stockReceivingDateFrom}T00:00:00`)) return false;
  if (stockReceivingDateTo && movementDate > new Date(`${stockReceivingDateTo}T23:59:59.999`)) return false;
  return true;
});

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

const filteredSalesSummary =
  filteredSalesHistory.reduce(
    (summary, sale) => {
      summary.total_sales += 1;
      summary.total_revenue += Number(
        sale.revenue
      );
      summary.total_cogs += Number(
        sale.cogs
      );
      summary.total_gross_profit += Number(
        sale.gross_profit
      );

      return summary;
    },
    {
      total_sales: 0,
      total_revenue: 0,
      total_cogs: 0,
      total_gross_profit: 0,
    }
  );

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
      reference,
      movement.remarks,
      movement.recorded_by,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedReportSearch);
  });

const reportSalesSummary = reportSalesRows.reduce(
  (summary, sale) => ({
    totalSales: summary.totalSales + 1,
    revenue: summary.revenue + Number(sale.revenue || 0),
    cost: summary.cost + Number(sale.cogs || 0),
    grossProfit:
      summary.grossProfit + Number(sale.gross_profit || 0),
  }),
  { totalSales: 0, revenue: 0, cost: 0, grossProfit: 0 }
);

const reportInventorySummary = reportInventoryRows.reduce(
  (summary, product) => ({
    products: summary.products + 1,
    units: summary.units + Number(product.stock || 0),
    stockValue:
      summary.stockValue +
      Number(product.stock || 0) * Number(product.price || 0),
  }),
  { products: 0, units: 0, stockValue: 0 }
);

const reportTitle =
  reportType === 'sales'
    ? 'Sales Report'
    : reportType === 'inventory'
      ? 'Inventory Report'
      : reportType === 'lowStock'
        ? 'Low Stock Report'
        : 'Stock Movement Report';

const reportTableHeaders =
  reportType === 'sales'
    ? [
  'Date',
  'Reference',
  'Products / Items',
  'Source',
  'Items',
  'Quantity',
  'Revenue',
  'Cost',
  'Gross Profit',
  'Payment Method',
  'Status',
]
    : reportType === 'inventory'
      ? [
          'Product',
          'Category',
          'Supplier(s)',
          'Current Stock',
          'Price',
          'Stock Value',
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
            'Reference',
            'Remarks',
            'Recorded By',
          ];

const reportTableRows: Array<Array<string | number>> =
  reportType === 'sales'
  ? reportSalesRows.map((sale) => [
      new Date(sale.sale_date).toLocaleString('en-PH'),
      sale.reference,
      sale.items_summary || '—',
      sale.source_label,
      sale.item_count,
      sale.total_quantity,
      formatPeso(sale.revenue),
      formatPeso(sale.cogs),
      formatPeso(sale.gross_profit),
      formatPaymentMethod(
        sale.payment_method || 'cash'
      ),
      sale.payment_status,
    ])
    : reportType === 'inventory'
      ? reportInventoryRows.map((product) => [
          product.name,
          product.category,
          getProductSupplierDisplay(product),
          product.stock,
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

              movement.remarks || '—',

              movement.recorded_by || '—',
            ];
          });

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
  size: ${reportType === 'stockMovement'
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
<div className="relative min-h-screen w-full bg-[#F4F7F5] pt-16 text-[#34463F] lg:h-screen lg:overflow-hidden">
      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close administration menu"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-x-0 bottom-0 top-16 z-30 bg-black/40 backdrop-blur-[1px] lg:hidden"
        />
      )}

      {/* Fixed desktop sidebar and slide-out mobile sidebar */}
<aside
  id="admin-sidebar-navigation"
  className={`fixed bottom-0 left-0 top-16 z-40 w-72
    transform overflow-y-auto overflow-x-hidden overscroll-contain
    border-r border-[#dfe9e2]
    bg-white text-[#17372d]
    shadow-[8px_0_30px_-24px_rgba(11,59,35,0.30)]
    transition-[width,transform] duration-300 ease-out
    lg:translate-x-0
    ${
      isSidebarOpen
        ? 'translate-x-0'
        : '-translate-x-full'
    }
    ${
      isSidebarCollapsed
        ? 'lg:w-20 lg:px-3'
        : 'lg:w-72 lg:px-4'
    }
    py-4`}
>
  <div
  className={`flex min-h-[42px] items-center border-b border-[#e3ece6] pb-3 ${
    isSidebarCollapsed
      ? 'justify-center'
      : 'justify-between'
  }`}
>
  {!isSidebarCollapsed && (
    <p
      className="
        text-[10px]
        font-bold
        uppercase
        tracking-[0.18em]
        text-[#789086]
      "
    >
      Administration Menu
    </p>
  )}

  <button
    type="button"
    onClick={() =>
      setIsSidebarCollapsed((current) => !current)
    }
    className="
      hidden h-8 w-8 shrink-0 items-center justify-center
      rounded-lg
      border border-[#d8e6dd]
      bg-white
      text-[#15803d]
      shadow-sm
      transition-all duration-200
      hover:border-emerald-200
      hover:bg-emerald-50
      lg:flex
    "
    aria-label={
      isSidebarCollapsed
        ? 'Expand administration sidebar'
        : 'Collapse administration sidebar'
    }
    title={
      isSidebarCollapsed
        ? 'Expand sidebar'
        : 'Collapse sidebar'
    }
  >
    <Menu className="h-4 w-4" />
  </button>
</div>

        <nav
  className="mt-5 space-y-1.5"
  aria-label="Administration sections"
  onClick={() => setIsSidebarOpen(false)}
>
          <p className={adminSectionLabelClass}>
            Dashboard
          </p>
          <button
  onClick={() => setActiveTab('overview')}
  className={adminNavClass('overview')}
  title="Dashboard Overview"
>
  <LayoutDashboard className="h-4 w-4 shrink-0" />

  <span className={adminNavLabelClass}>
    Dashboard Overview
  </span>
</button>

          <p className={adminSectionLabelClass}>
            Orders &amp; Delivery
          </p>
          <button
  onClick={() => setActiveTab('orders')}
  className={adminNavClass('orders')}
  title="Manage Orders"
>
  <ClipboardList className="h-4 w-4 shrink-0" />

  <span className={adminNavLabelClass}>
    Manage Orders
  </span>

  {(pendingCount + processingCount) > 0 && (
    <span
      className={`ml-auto rounded-full bg-[#15803d] px-2 py-0.5
        text-[10px] font-bold text-white
        ${isSidebarCollapsed ? 'lg:hidden' : ''}`}
    >
      {pendingCount + processingCount}
    </span>
  )}
</button>

<button
  onClick={() => setActiveTab('deliveryRates')}
  className={adminNavClass('deliveryRates')}
  title="Delivery Rates"
>
  <MapPin className="h-4 w-4 shrink-0" />
  <span className={adminNavLabelClass}>
    Delivery Rates
  </span>
</button>

<p className={adminSectionLabelClass}>
  Inventory
</p>

<button
  onClick={() => setActiveTab('products')}
  className={adminNavClass('products')}
  title="Product Inventory"
>
  <Package className="h-4 w-4 shrink-0" />
  <span className={adminNavLabelClass}>
    Product Inventory
  </span>
</button>

<button
  onClick={() => setActiveTab('receiveStock')}
  className={adminNavClass('receiveStock')}
  title="Receive Stock"
>
  <ArrowLeftRight className="h-4 w-4 shrink-0" />
  <span className={adminNavLabelClass}>
    Receive Stock
  </span>
</button>

<button
  onClick={() => setActiveTab('categories')}
  className={adminNavClass('categories')}
  title="Category Management"
>
  <Package className="h-4 w-4 shrink-0" />
  <span className={adminNavLabelClass}>
    Category Management
  </span>
</button>

<button
  onClick={() => setActiveTab('suppliers')}
  className={adminNavClass('suppliers')}
  title="Supplier Management"
>
  <Package className="h-4 w-4 shrink-0" />
  <span className={adminNavLabelClass}>
    Supplier Management
  </span>
</button>

<p className={adminSectionLabelClass}>
  Sales &amp; Reports
</p>

<button
  onClick={() => setActiveTab('pos')}
  className={adminNavClass('pos')}
  title="POS / New Sale"
>
  <ScanBarcode className="h-4 w-4 shrink-0" />
  <span className={adminNavLabelClass}>
    POS / New Sale
  </span>
</button>

<button
  onClick={() => setActiveTab('sales')}
  className={adminNavClass('sales')}
  title="Sales History"
>
  <TrendingUp className="h-4 w-4 shrink-0" />
  <span className={adminNavLabelClass}>
    Sales History
  </span>
</button>
          
<button
  onClick={() => setActiveTab('movementHistory')}
  className={adminNavClass('movementHistory')}
  title="Inventory Movements"
>
  <ArrowLeftRight className="h-4 w-4 shrink-0" />
  <span className={adminNavLabelClass}>
    Inventory Movements
  </span>
</button>

<button
  onClick={() => setActiveTab('reports')}
  className={adminNavClass('reports')}
  title="Reports Center"
>
  <FileBarChart className="h-4 w-4 shrink-0" />
  <span className={adminNavLabelClass}>
    Reports Center
  </span>
</button>

        </nav>
      </aside>

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
        ? 'lg:ml-20 lg:w-[calc(100%-5rem)]'
        : 'lg:ml-72 lg:w-[calc(100%-18rem)]'
    }`}
>
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
          <div className="space-y-5 animate-fade-up">
            {/* Legendary fleet banner. The text remains HTML so it stays crisp,
                accessible, and separate from the truck photograph. */}
            <section
              className="relative min-h-[240px] overflow-hidden rounded-3xl border border-[#285845] bg-[#0B3B23] bg-cover bg-center text-white shadow-lg shadow-[#12372A]/15"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, rgba(5, 47, 27, 0.98) 0%, rgba(5, 63, 34, 0.88) 34%, rgba(5, 63, 34, 0.38) 55%, rgba(5, 47, 27, 0.08) 100%), url('/images/rayjin-legendary-trucks-banner.png')",
              }}
            >
              <div className="relative z-10 flex min-h-[240px] max-w-lg flex-col justify-center p-6 md:p-8">
                <span className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-black/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8BE5B4] backdrop-blur-sm">
                  <Shield className="h-3.5 w-3.5" />
                  Rayjin Hardware Operations
                </span>

                <h2 className="font-display text-2xl font-bold leading-tight text-white md:text-3xl">
                  Welcome back, {user.first_name || user.username}!
                </h2>

                <p className="mt-2 max-w-md text-sm leading-relaxed text-[#D9EDE2]">
                  Monitor orders, sales, delivery rates, and inventory activity
                  from one clear administrative overview.
                </p>

                <div className="mt-5 flex items-center gap-2 border-t border-white/15 pt-4 text-xs text-white/75">
                  <CheckCircle className="h-4 w-4 text-[#6FE0A2]" />
                  <span>The five legendary company trucks</span>
                </div>
              </div>
            </section>

            {/* Live KPI statistics */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Business summary">
              <article className="group rounded-2xl border border-[#DDE6E0] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E4F5EA] text-[#0D7740]">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9991]">Sales</span>
                </div>
                <span className="text-xs font-semibold text-[#71817A]">Total Revenue</span>
                <h3 className="mt-1 font-display text-2xl font-bold text-[#17372D]">
                  ₱{Number(salesSummary.total_revenue).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </h3>
                <p className="mt-1 text-[10px] text-[#71817A]">Recorded paid sales</p>
              </article>

              <article className="group rounded-2xl border border-[#DDE6E0] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF4D9] text-[#D98608]">
                    <Clock className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9991]">Orders</span>
                </div>
                <span className="text-xs font-semibold text-[#71817A]">Pending Orders</span>
                <h3 className="mt-1 font-display text-2xl font-bold text-[#17372D]">
                  {dashboardPendingCount}
                </h3>
                <p className="mt-1 text-[10px] text-[#D98608]">Awaiting admin action</p>
              </article>

              <article className="group rounded-2xl border border-[#DDE6E0] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FDE8E8] text-[#D63C42]">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9991]">Inventory</span>
                </div>
                <span className="text-xs font-semibold text-[#71817A]">Low Stock Items</span>
                <h3 className="mt-1 font-display text-2xl font-bold text-[#17372D]">
                  {lowStockProducts.length} items
                </h3>
                <p className="mt-1 text-[10px] text-[#D63C42]">Needs restocking</p>
              </article>

              <article className="group rounded-2xl border border-[#DDE6E0] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E4F5EA] text-[#0D7740]">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9991]">Fulfillment</span>
                </div>
                <span className="text-xs font-semibold text-[#71817A]">Completed Orders</span>
                <h3 className="mt-1 font-display text-2xl font-bold text-[#17372D]">
                  {completedOrderCount} orders
                </h3>
                <p className="mt-1 text-[10px] text-[#0D7740]">Successfully fulfilled</p>
              </article>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(250px,0.72fr)_minmax(260px,0.8fr)]">
              {/* Seven-day sales chart */}
              <article className="rounded-2xl border border-[#DDE6E0] bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-sm font-bold text-[#17372D]">Sales Overview</h3>
                    <p className="mt-1 text-[10px] text-[#71817A]">Paid revenue during the last seven days</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sales')}
                    className="text-[10px] font-bold text-[#0D7740] hover:underline"
                  >
                    View sales history
                  </button>
                </div>

                {dashboardSalesDays.every((day) => day.revenue === 0) ? (
                  <div className="flex h-44 items-center justify-center rounded-xl bg-[#F7FAF8] text-xs text-[#71817A]">
                    No paid sales recorded during the last seven days.
                  </div>
                ) : (
                  <div className="flex h-44 items-end gap-2 border-b border-[#DDE6E0] px-2 pt-3">
                    {dashboardSalesDays.map((day) => (
                      <div key={day.label} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2 text-center">
                        <span className="truncate text-[9px] font-semibold text-[#71817A]">
                          {day.revenue > 0 ? `₱${day.revenue.toFixed(0)}` : '—'}
                        </span>
                        <div
                          className="mx-auto w-full max-w-9 rounded-t-md bg-gradient-to-t from-[#0D7740] to-[#32B56F]"
                          style={{
                            height: `${Math.max(
                              (day.revenue / dashboardMaximumRevenue) * 100,
                              day.revenue ? 8 : 2
                            )}%`,
                          }}
                          title={`${day.label}: ₱${day.revenue.toFixed(2)}`}
                        />
                        <span className="pb-2 text-[9px] font-semibold text-[#71817A]">{day.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              {/* Order status composition */}
              <article className="rounded-2xl border border-[#DDE6E0] bg-white p-5 shadow-sm">
                <h3 className="font-display text-sm font-bold text-[#17372D]">Order Status</h3>
                <p className="mt-1 text-[10px] text-[#71817A]">Current fulfillment distribution</p>

                <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row xl:flex-col">
                  <div
                    className="relative h-28 w-28 shrink-0 rounded-full"
                    style={{ background: dashboardStatusGradient }}
                    role="img"
                    aria-label={`${orders.length} total orders`}
                  >
                    <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white">
                      <strong className="text-xl font-bold text-[#17372D]">{orders.length}</strong>
                      <span className="text-[9px] text-[#71817A]">Total orders</span>
                    </div>
                  </div>

                  <div className="grid w-full gap-2 text-[10px]">
                    <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-[#52635B]"><span className="h-2 w-2 rounded-full bg-[#15944F]" />Completed</span><strong>{completedOrderCount}</strong></div>
                    <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-[#52635B]"><span className="h-2 w-2 rounded-full bg-[#F59E0B]" />Pending</span><strong>{dashboardPendingCount}</strong></div>
                    <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-[#52635B]"><span className="h-2 w-2 rounded-full bg-[#3B82F6]" />In progress</span><strong>{dashboardProcessingCount}</strong></div>
                    <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-[#52635B]"><span className="h-2 w-2 rounded-full bg-[#DC2626]" />Cancelled</span><strong>{dashboardCancelledCount}</strong></div>
                  </div>
                </div>
              </article>

              {/* Quick navigation actions */}
              <article className="rounded-2xl border border-[#DDE6E0] bg-white p-5 shadow-sm">
                <h3 className="font-display text-sm font-bold text-[#17372D]">Quick Actions</h3>
                <p className="mt-1 text-[10px] text-[#71817A]">Open common administrative tasks</p>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('products')}
                    className="flex min-h-20 flex-col items-start justify-center rounded-xl bg-[#0D7740] p-3 text-left text-white transition-colors hover:bg-[#0A6135]"
                  >
                    <Package className="mb-2 h-5 w-5" />
                    <strong className="text-xs">Add Product</strong>
                    <span className="mt-0.5 text-[9px] text-white/70">Create an item</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('pos')}
                    className="flex min-h-20 flex-col items-start justify-center rounded-xl bg-[#EAF6EF] p-3 text-left text-[#0D6337] transition-colors hover:bg-[#DCEFE4]"
                  >
                    <ScanBarcode className="mb-2 h-5 w-5" />
                    <strong className="text-xs">New POS Sale</strong>
                    <span className="mt-0.5 text-[9px] text-[#557466]">Start transaction</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('receiveStock')}
                    className="flex min-h-20 flex-col items-start justify-center rounded-xl bg-[#EAF6EF] p-3 text-left text-[#0D6337] transition-colors hover:bg-[#DCEFE4]"
                  >
                    <ArrowLeftRight className="mb-2 h-5 w-5" />
                    <strong className="text-xs">Receive Stock</strong>
                    <span className="mt-0.5 text-[9px] text-[#557466]">Update inventory</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="flex min-h-20 flex-col items-start justify-center rounded-xl bg-[#EAF6EF] p-3 text-left text-[#0D6337] transition-colors hover:bg-[#DCEFE4]"
                  >
                    <ClipboardList className="mb-2 h-5 w-5" />
                    <strong className="text-xs">View Orders</strong>
                    <span className="mt-0.5 text-[9px] text-[#557466]">Open order queue</span>
                  </button>
                </div>
              </article>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.8fr)]">
              {/* Recent orders */}
              <article className="overflow-hidden rounded-2xl border border-[#DDE6E0] bg-white shadow-sm">
                <div className="flex items-start justify-between gap-4 border-b border-[#E5ECE8] p-5">
                  <div>
                    <h3 className="font-display text-sm font-bold text-[#17372D]">Recent Orders</h3>
                    <p className="mt-1 text-[10px] text-[#71817A]">Latest customer orders and fulfillment status</p>
                  </div>
                  <button type="button" onClick={() => setActiveTab('orders')} className="text-[10px] font-bold text-[#0D7740] hover:underline">View all orders</button>
                </div>

                {recentDashboardOrders.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#71817A]">No orders have been recorded.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-xs">
                      <thead className="bg-[#F7FAF8] text-[9px] uppercase tracking-wider text-[#71817A]">
                        <tr><th className="px-5 py-3">Order ID</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Total</th></tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5ECE8]">
                        {recentDashboardOrders.map((order) => (
                          <tr key={order.id} className="text-[#405149] hover:bg-[#F9FBFA]">
                            <td className="whitespace-nowrap px-5 py-3 font-bold text-[#17372D]">{order.id}</td>
                            <td className="px-4 py-3">{[order.customer_first_name, order.customer_last_name].filter(Boolean).join(' ') || 'Customer'}</td>
                            <td className="px-4 py-3">{order.items.reduce((total, item) => total + item.quantity, 0)}</td>
                            <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-bold capitalize ${order.status === 'completed' || order.status === 'ready' ? 'bg-[#E4F5EA] text-[#0D7740]' : order.status === 'cancelled' || order.status === 'rejected' ? 'bg-[#FDE8E8] text-[#C7353B]' : 'bg-[#FFF4D9] text-[#C97800]'}`}>{order.status.split('_').join(' ')}</span></td>
                            <td className="whitespace-nowrap px-5 py-3 text-right font-bold text-[#17372D]">₱{Number(order.total).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>

              {/* Low-stock summary */}
              <article className="overflow-hidden rounded-2xl border border-[#DDE6E0] bg-white shadow-sm">
                <div className="flex items-start justify-between gap-4 border-b border-[#E5ECE8] p-5">
                  <div>
                    <h3 className="font-display text-sm font-bold text-[#17372D]">Low Stock Items</h3>
                    <p className="mt-1 text-[10px] text-[#71817A]">Products that may need restocking</p>
                  </div>
                  <button
  type="button"
  onClick={() => {
    setReportType('lowStock');
    setActiveTab('reports');
  }}
  className="text-[10px] font-bold text-[#0D7740] hover:underline"
>
  View low-stock report
</button>
                </div>

                {lowStockProducts.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 p-8 text-xs text-[#0D7740]"><CheckCircle className="h-4 w-4" />All products have sufficient stock.</div>
                ) : (
                  <div className="divide-y divide-[#E5ECE8]">
                    {lowStockProducts.slice(0, 5).map((product) => (
                      <div key={product.id} className="flex items-center justify-between gap-4 px-5 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[#17372D]">{product.name}</p>
                          <p className="mt-0.5 text-[9px] text-[#71817A]">{product.category}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="inline-flex rounded-full bg-[#FDE8E8] px-2 py-1 text-[9px] font-bold text-[#C7353B]">{product.stock} left</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </section>
          </div>
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

{/* TAB 2: ORDER MANAGER */}
{activeTab === 'orders' && (
  <div className="space-y-5 animate-fade-up">

    <div>
      <h2 className="text-2xl font-bold font-display text-steel-950">
        Fulfillment Center
      </h2>

      <p className="text-sm text-steel-500">
        Process online customer orders and update dispatch status.
      </p>
    </div>

    {orders.length === 0 ? (

      <div className="text-center py-12 bg-white border border-steel-200/60 rounded-2xl text-steel-500">
        <p className="text-xs">
          No orders logged in store database.
        </p>
      </div>

    ) : (

      <div className="space-y-4">

        {sortedOrders.map((order) => (

          <div
            key={order.id}
            className="bg-white border border-steel-200/60 rounded-2xl p-5 shadow-sm"
          >

            {/* ORDER HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-steel-100 pb-4 mb-4">

              <div className="flex items-center gap-4">

                <div>
                  <span className="text-[10px] font-bold text-steel-400 block">
                    ORDER ID
                  </span>

                  <h4 className="text-sm font-bold text-steel-800">
                    {order.id}
                  </h4>
                </div>

                <div className="h-6 w-px bg-steel-100"></div>

                <div>
                  <span className="text-[10px] font-bold text-steel-400 block">FULFILLMENT</span>
                  <span className="text-xs font-bold text-steel-700">
                    {order.fulfillment === 'shop_go'
                      ? 'Shop & Go'
                      : order.fulfillment === 'delivery'
                        ? 'Delivery'
                        : 'Pickup'}
                  </span>
                </div>

                <div className="h-6 w-px bg-steel-100"></div>

                <div>
                  <span className="text-[10px] font-bold text-steel-400 block">
                    PAYMENT
                  </span>

                  <span className="text-xs font-bold text-steel-700 uppercase">
                    {formatPaymentMethod(
                      order.payment_method ||
                      order.paymentMethod ||
                      'cash'
                    )}
                  </span>
                </div>

              </div>

              <div className="flex items-center gap-3">

                <span className="text-sm font-bold text-steel-950">
                  ₱{(
                    Number(order.total) +
                    Number(order.service_fee || 0) +
                    Number(order.delivery_fee || 0)
                  ).toFixed(2)}
                </span>

                {/* STATUS BADGE */}
                <span
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    order.status === 'completed'
                      ? 'bg-green-50 text-green-700 border border-green-200'

                      : order.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'

                      : order.status === 'processing'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'

                      : order.status === 'ready'
                      ? 'bg-teal-50 text-teal-700 border border-teal-200'

                      : order.status === 'out_for_delivery'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'

                      : order.status === 'failed_delivery'
                      ? 'bg-red-50 text-red-700 border border-red-200'

                      : order.status === 'deactivated'
                      ? 'bg-steel-100 text-steel-600 border border-steel-200'

                      : order.status === 'rejected'
                      ? 'bg-red-50 text-red-700 border border-red-200'

                      : order.status === 'cancelled'
                      ? 'bg-steel-100 text-steel-600 border border-steel-200'

                      : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  }`}
                >
                  {getAdminOrderStatusLabel(order)}
                </span>

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

{/* FULFILLMENT STATUS TRACKER */}
<div className="mb-4 rounded-xl border border-[#DDE6E0] bg-white p-4">
  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71817A]">
      {order.fulfillment === 'delivery' ? 'Delivery Status Tracker' : 'Pickup Status Tracker'}
    </span>
    {['failed_delivery', 'deactivated'].includes(order.status) && (
      <span className="text-[10px] font-bold text-red-700">
        Progress paused: {order.status.split('_').join(' ')}
      </span>
    )}
  </div>
  <div className="relative grid grid-cols-5 gap-2 text-center">
   <div className="absolute top-4 left-[9%] right-[9%] h-0.5 bg-[#E5ECE8]" />
    {getAdminOrderWorkflow(order).map((step, index, steps) => {
      const activeIndex = steps.findIndex(
        (candidate) => candidate.key === getAdminOrderProgressStatus(order)
      );
      const reached = activeIndex >= index && !['cancelled', 'rejected'].includes(order.status);
      return (
        <div key={step.key} className="relative z-10 flex flex-col items-center">
          <span className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-extrabold ${
            reached
              ? 'border-[#166534] bg-[#15803D] text-white'
              : 'border-[#DDE6E0] bg-white text-[#71817A]'
          }`}>
            {index + 1}
          </span>
          <span className="mt-1.5 text-[9px] font-bold leading-tight text-[#52635B]">{step.label}</span>
        </div>
      );
    })}
  </div>
</div>

{/* PICKUP ADMIN MESSAGE */}
{order.fulfillment === 'pickup' && (
  <form
    className="mb-4 rounded-xl border border-[#DDE6E0] bg-[#F7FAF8] p-4"
    onSubmit={(event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      void handleSaveAdminMessage(order.id, String(formData.get('adminMessage') || ''));
    }}
  >
    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#52635B]">
      Admin Message to Customer
    </label>
    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
      <textarea
        name="adminMessage"
        maxLength={500}
        rows={2}
        defaultValue={order.admin_message || ''}
        placeholder="Add pickup instructions or a note for the customer."
        className="min-h-20 flex-1 rounded-xl border border-[#DDE6E0] bg-white px-3 py-2 text-xs text-[#34463F] focus:border-[#2F7D5A] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/15"
      />
      <button
        type="submit"
        className="self-end rounded-xl bg-[#2F7D5A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#256548]"
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


    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">

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


    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">

      <div className="rounded-lg bg-white border border-amber-100 p-3">
        <span className="text-[9px] font-bold uppercase tracking-wider text-steel-400 block">
          Product Subtotal
        </span>
        <p className="text-sm font-bold text-steel-900 mt-1">
          ₱{Number(order.total).toFixed(2)}
        </p>
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

    <form
  onSubmit={(event) => {
    event.preventDefault();

    const formData =
      new FormData(event.currentTarget);

    void handleSaveAdminMessage(
      order.id,
      String(
        formData.get('adminMessage') || ''
      )
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
      defaultValue={
        order.admin_message || ''
      }
      placeholder="Add delivery instructions or a note for the customer."
      className="w-full px-3 py-2.5 text-xs rounded-xl border border-steel-200 bg-white text-steel-800 placeholder:text-steel-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none disabled:bg-steel-100 disabled:text-steel-500"
    />
  </div>

  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-[10px] text-steel-500">
      The delivery fee is system-calculated and cannot be manually changed for this order.
    </p>

    <button
      type="submit"
      disabled={[
        'completed',
        'rejected',
        'cancelled'
      ].includes(order.status)}
      className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-steel-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95"
    >
      Update Message
    </button>
  </div>
</form>

  </div>

)}

{/* SHOP & GO SCHEDULE */}
{order.fulfillment === 'shop_go' && (

  <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">

    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">

      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
          Shop & Go — Express Pickup
        </span>

        <h4 className="text-sm font-bold text-[#17372D] mt-1">
          Pickup Schedule
        </h4>

        <p className="text-[10px] text-steel-500 mt-1">
          Review the customer's preferred schedule.
          Keep the same schedule to confirm it, or change
          the date/time to reschedule.
        </p>
      </div>


      <div className="rounded-lg bg-white border border-emerald-100 px-4 py-3">

        <span className="text-[9px] font-bold uppercase tracking-wider text-steel-400 block">
          Customer Requested
        </span>

        <p className="text-xs font-bold text-steel-800 mt-1">
          {order.requested_pickup_date
            ? normalizePickupDateForInput(
                order.requested_pickup_date
              )
            : 'No requested date'}
        </p>

        <p className="text-xs font-semibold text-emerald-700 mt-0.5">
          {order.requested_pickup_time
            ? normalizePickupTimeForInput(
                order.requested_pickup_time
              )
            : 'No requested time'}
        </p>

      </div>

    </div>


    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      <div className="rounded-lg border border-emerald-100 bg-white p-3">
        <span className="text-[9px] font-bold uppercase tracking-wider text-steel-400">Product Subtotal</span>
        <p className="mt-1 text-sm font-bold text-steel-900">₱{Number(order.total).toFixed(2)}</p>
      </div>
      <div className="rounded-lg border border-emerald-100 bg-white p-3">
        <span className="text-[9px] font-bold uppercase tracking-wider text-steel-400">Shop &amp; Go Service Fee</span>
        <p className="mt-1 text-sm font-bold text-emerald-700">₱{Number(order.service_fee || 50).toFixed(2)}</p>
      </div>
      <div className="rounded-lg border border-emerald-100 bg-white p-3">
        <span className="text-[9px] font-bold uppercase tracking-wider text-steel-400">Order Total</span>
        <p className="mt-1 text-sm font-bold text-[#17372D]">₱{(Number(order.total) + Number(order.service_fee || 50)).toFixed(2)}</p>
      </div>
    </div>

    <form
      onSubmit={(e) =>
        handleSaveShopGoSchedule(
          order.id,
          e
        )
      }
      className="grid grid-cols-1 md:grid-cols-2 gap-3"
    >

      {/* FINAL DATE */}
      <div>

        <label className="block text-[10px] font-bold text-steel-500 uppercase tracking-wider mb-1">
          Final Pickup Date *
        </label>

        <input
          type="date"
          name="scheduledPickupDate"
          required
          disabled={['completed', 'cancelled', 'rejected'].includes(order.status)}
          defaultValue={
            normalizePickupDateForInput(
              order.scheduled_pickup_date ||
              order.requested_pickup_date
            )
          }
          className="w-full px-3 py-2.5 text-xs rounded-xl border border-steel-200 bg-white text-steel-800 focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A]"
        />

      </div>


      {/* FINAL TIME */}
      <div>

        <label className="block text-[10px] font-bold text-steel-500 uppercase tracking-wider mb-1">
          Final Pickup Time *
        </label>

        <input
          type="time"
          name="scheduledPickupTime"
          required
          disabled={['completed', 'cancelled', 'rejected'].includes(order.status)}
          defaultValue={
            normalizePickupTimeForInput(
              order.scheduled_pickup_time ||
              order.requested_pickup_time
            )
          }
          className="w-full px-3 py-2.5 text-xs rounded-xl border border-steel-200 bg-white text-steel-800 focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A]"
        />

      </div>


      {/* ADMIN MESSAGE */}
      <div className="md:col-span-2">

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
          disabled={['completed', 'cancelled', 'rejected'].includes(order.status)}
          defaultValue={
            order.admin_message || ''
          }
          placeholder="Example: Your requested 3:00 PM pickup is unavailable. Please pick up your order after 5:00 PM."
          className="w-full px-3 py-2.5 text-xs rounded-xl border border-steel-200 bg-white text-steel-800 placeholder:text-steel-400 focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A] resize-none"
        />

      </div>


      <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">

        <p className="text-[10px] text-steel-400">
          Saving the schedule does not automatically approve the order.
        </p>

        {!['completed', 'cancelled', 'rejected'].includes(order.status) && (
          <button
            type="submit"
            className="px-4 py-2.5 bg-[#2F7D5A] hover:bg-[#256548] text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95"
          >
            {order.scheduled_pickup_date && order.scheduled_pickup_time
              ? 'Edit Schedule'
              : 'Save Confirmed Schedule'}
          </button>
        )}

      </div>

    </form>


    {/* SAVED SCHEDULE INDICATOR */}
    {order.scheduled_pickup_date &&
     order.scheduled_pickup_time && (

      <div className="mt-3 p-3 rounded-lg bg-white border border-emerald-200">

        <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-700 block">
          Confirmed / Final Schedule
        </span>

        <p className="text-xs font-bold text-steel-800 mt-1">
          {normalizePickupDateForInput(
            order.scheduled_pickup_date
          )}
          {' — '}
          {normalizePickupTimeForInput(
            order.scheduled_pickup_time
          )}
        </p>

        {order.admin_message && (
          <p className="text-[10px] text-steel-500 mt-2">
            Message: {order.admin_message}
          </p>
        )}

      </div>

    )}

  </div>

)}

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
  ? 'Mark Out for Delivery'
  : 'Mark Ready for Pickup'}
                    </span>

                    <span className="text-[10px] text-steel-400">
                      {order.fulfillment === 'delivery'
                        ? 'Review the address and system-calculated delivery fee before approving.'
                        : order.fulfillment === 'shop_go'
                          ? 'Pickup schedule is confirmed. Verify the order and payment before approving.'
                          : 'Review the customer and order details, then approve the Standard Pickup order.'}
                    </span>

                  </div>

                  <button
                    onClick={() =>
                      handleRejectOrder(order.id)
                    }
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold rounded-lg transition-all active:scale-95"
                  >
                    Reject Order
                  </button>

                  <button
                    onClick={() =>
                      handleAdvanceOrderStatus(
                        order.id
                      )
                    }
                    className="px-4 py-2 bg-[#2F7D5A] hover:bg-[#256548] text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95"
                  >
                    {order.fulfillment === 'delivery'
                      ? 'Approve Delivery'
                      : 'Approve Order'}
                  </button>

                </div>

              ) : order.status === 'approved' ? (

                <div className="flex flex-col items-end gap-1.5">
                  {order.fulfillment === 'pickup' && (
                    <span className="text-[10px] font-semibold text-amber-700">
                      {(order.payment_method ||
                      order.paymentMethod ||
                     'cash') === 'cash'
  ? 'Cash payment will be confirmed when the customer collects the order.'
  : 'Online payment confirmed. The order can now be processed.'}
                    </span>
                  )}
                  <button
                    onClick={() =>
                      handleAdvanceOrderStatus(
                        order.id
                      )
                    }
                    className="px-4 py-2 bg-[#2F7D5A] hover:bg-[#256548] text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95"
                  >
                Start Processing
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

            {!['completed', 'cancelled', 'rejected'].includes(order.status) && (
              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-steel-100 pt-4">
                {order.fulfillment === 'delivery' ? (
                  <>
                    {!['failed_delivery', 'deactivated'].includes(order.status) && (
                      <>
                        {order.status === 'out_for_delivery' && (
                          <button
                            type="button"
                            onClick={() => handleOrderAction(order, 'failed_delivery')}
                            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-800 hover:bg-amber-100"
                          >
                            Failed Delivery
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOrderAction(order, 'deactivate')}
                          className="rounded-lg border border-steel-200 bg-steel-50 px-3 py-2 text-[10px] font-bold text-steel-700 hover:bg-steel-100"
                        >
                          Deactivate Order
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOrderAction(order, 'cancel_permanently')}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700 hover:bg-red-100"
                    >
                      Cancel Order Permanently
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOrderAction(order, 'cancel')}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700 hover:bg-red-100"
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            )}

          </div>

        ))}

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
                  Manage delivery availability and barangay surcharges within Initao.
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
              + the selected barangay surcharge. The Admin may still confirm a different
              final fee while reviewing difficult-to-reach delivery addresses.
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
                  <table className="w-full min-w-[760px] text-left">
                    <thead className="bg-[#F5F7F5] border-b border-steel-200">
                      <tr className="text-[10px] uppercase tracking-wider text-steel-500">
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
                      <label className="block text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">Stock Qty</label>
                      <input 
                        type="number" 
                        required
                        value={newProduct.stock}
                        onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                        placeholder="25"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 bg-white text-steel-950 focus:outline-none focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500"
                      />
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
                        The product and its opening Stock-In movement are saved together.
                      </p>
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
  opening_supplier_price: '',
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

  opening_supplier_price: ''
});
              }}
              className="px-2.5 py-1.5 bg-steel-100 hover:bg-steel-200 text-steel-700 text-[10px] font-bold rounded-lg transition-all"
            >
              Edit
            </button>

            <button
              onClick={() => handleDeleteProduct(p.id)}
              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold rounded-lg transition-all"
            >
              Delete
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

{/* DEDICATED STOCK RECEIVING */}
{activeTab === 'receiveStock' && (
  <div className="space-y-6 animate-fade-up">
    <div>
      <h2 className="text-2xl font-bold font-display text-steel-950">Receive Stock</h2>
      <p className="mt-1 text-sm text-steel-500">
        Record supplier deliveries, attach the receipt, and update inventory in one transaction.
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

      <form onSubmit={handleStockReceiving} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-steel-500">
          1. Product
          <input
            list="receiving-products"
            required
            value={stockReceivingProductQuery}
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

        <label className="block text-xs font-bold uppercase tracking-wider text-steel-500">
          5. Receipt Attachment
          <input
            type="file" accept="image/jpeg,image/png,image/webp" required onChange={handleReceiptChange}
            className="mt-1 block w-full rounded-lg border border-steel-200 bg-white px-3 py-2 text-xs normal-case tracking-normal file:mr-3 file:rounded-md file:border-0 file:bg-[#E4F5EA] file:px-3 file:py-1.5 file:text-[10px] file:font-bold file:text-[#0D7740]"
          />
        </label>

        <label className="block text-xs font-bold uppercase tracking-wider text-steel-500">
          6. Selling Price (₱)
          <input
            type="number" min="0.01" step="0.01" required value={stockReceiving.selling_price}
            onChange={(event) => setStockReceiving({ ...stockReceiving, selling_price: event.target.value })}
            className="mt-1 w-full rounded-lg border border-steel-200 px-3 py-2.5 text-xs normal-case tracking-normal focus:border-[#2F7D5A] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/15"
          />
        </label>

        {stockReceiving.receipt_image && (
          <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-[#CDE4D6] bg-[#F7FAF8] p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#52635B]">Receipt Preview</p>
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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="font-display text-base font-bold text-[#17372D]">Received Stock History</h3>
          <p className="mt-1 text-xs text-[#71817A]">Trace received items, supplier costs, receipts, and recorded dates.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            type="search" value={stockReceivingSearch}
            onChange={(event) => setStockReceivingSearch(event.target.value)}
            placeholder="Search product, barcode, supplier"
            className="rounded-lg border border-steel-200 px-3 py-2 text-xs focus:border-[#2F7D5A] focus:outline-none"
          />
          <input type="date" value={stockReceivingDateFrom} onChange={(event) => setStockReceivingDateFrom(event.target.value)} className="rounded-lg border border-steel-200 px-3 py-2 text-xs" />
          <input type="date" value={stockReceivingDateTo} onChange={(event) => setStockReceivingDateTo(event.target.value)} className="rounded-lg border border-steel-200 px-3 py-2 text-xs" />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-[#DDE6E0]">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-[#EEF5F1] text-[9px] uppercase tracking-wider text-[#587067]">
            <tr>{['Product', 'Supplier(s)', 'Qty', 'Supplier Cost', 'Receipt', 'Selling Price', 'Date / Time'].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-[#E5ECE8]">
            {receivedStockHistory.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-[#71817A]">No received-stock records match the filters.</td></tr>
            ) : receivedStockHistory.map((movement) => (
              <tr key={movement.movement_id} className="hover:bg-[#F8FAF9]">
                <td className="px-4 py-3"><strong className="block text-[#34463F]">{movement.product_name}</strong><span className="text-[9px] text-[#71817A]">{movement.barcode || 'No barcode'}</span></td>
                <td className="px-4 py-3">{movement.supplier_name || 'Not recorded'}</td>
                <td className="px-4 py-3 font-bold">{movement.quantity}</td>
                <td className="px-4 py-3">{formatPeso(Number(movement.supplier_price))}</td>
                <td className="px-4 py-3">{movement.receipt_path ? <a href={movement.receipt_path} target="_blank" rel="noreferrer" className="font-bold text-[#0D7740] hover:underline">View receipt</a> : 'None'}</td>
                <td className="px-4 py-3">{formatPeso(Number(movement.selling_price))}</td>
                <td className="whitespace-nowrap px-4 py-3">{new Date(movement.movement_date).toLocaleString('en-PH')}</td>
              </tr>
            ))}
          </tbody>
        </table>
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

{/* TAB 4: POS COUNTER */}
{activeTab === 'pos' && (
          <div className="space-y-6 animate-fade-up">
            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:items-stretch">
  {/* Product picker */}
  <div
  ref={posProductPanelRef}
  className="lg:col-span-7 flex min-h-[500px] min-w-0 flex-col gap-4 rounded-2xl border border-steel-200/60 bg-white p-5 shadow-sm"
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
                            <span className="text-xs font-bold text-steel-800 w-5 text-center">{item.quantity}</span>
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
                          <option value="pickup">Store Counter Pickup</option>
                          <option value="delivery">Deliver Out</option>
                        </select>
                      </div>
                    </div>

                    {posFulfillment === 'delivery' && (
                      <div className="space-y-3 rounded-xl border border-[#CDE4D6] bg-[#F3FAF6] p-4">
                        <div>
                          <h4 className="text-xs font-bold text-[#17372D]">Deliver Out Details</h4>
                          <p className="mt-1 text-[10px] text-[#71817A]">Required for an Admin-created delivery sale within Initao.</p>
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
                            Barangay *
                            <select
                              required value={posDeliveryDetails.barangay}
                              onChange={(event) => setPosDeliveryDetails((current) => ({ ...current, barangay: event.target.value, delivery_fee: '' }))}
                              className="mt-1 w-full rounded-lg border border-[#DDE6E0] bg-white px-3 py-2 text-xs normal-case tracking-normal focus:border-[#2F7D5A] focus:outline-none"
                            >
                              <option value="">Select Initao barangay</option>
                              {deliveryRateSettings.filter((rate) => rate.is_active).map((rate) => (
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

{/* TAB: SALES HISTORY */}
{activeTab === 'sales' && (
  <div className="space-y-5 animate-fade-up">

    <div>
      <h2 className="text-2xl font-bold font-display text-steel-950">
        Sales History
      </h2>

      <p className="text-sm text-steel-500">
        Review completed sales and verify source, revenue, cost, gross profit,
        payment method, and transaction status.
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

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

      {/* Total Sales */}
      <div className="bg-white border border-steel-200/60 p-4 rounded-2xl shadow-sm">
        <ShoppingCart className="w-5 h-5 text-green-500 mb-2" />

        <span className="text-xs font-semibold text-steel-500">
          Total Sales
        </span>

        <h3 className="text-2xl font-bold font-display text-steel-950 mt-0.5">
          {filteredSalesSummary.total_sales}
        </h3>
      </div>

      {/* Revenue */}
      <div className="bg-white border border-steel-200/60 p-4 rounded-2xl shadow-sm">
        <TrendingUp className="w-5 h-5 text-[#2F7D5A] mb-2" />

        <span className="text-xs font-semibold text-steel-500">
          Total Revenue
        </span>

        <h3 className="text-2xl font-bold font-display text-steel-950 mt-0.5">
          ₱{Number(filteredSalesSummary.total_revenue).toFixed(2)}
        </h3>
      </div>

      {/* COGS */}
      <div className="bg-white border border-steel-200/60 p-4 rounded-2xl shadow-sm">
        <Package className="w-5 h-5 text-yellow-500 mb-2" />

        <span className="text-xs font-semibold text-steel-500">
          COGS
        </span>

        <h3 className="text-2xl font-bold font-display text-steel-950 mt-0.5">
          ₱{Number(filteredSalesSummary.total_cogs).toFixed(2)}
        </h3>
      </div>

      {/* Gross Profit */}
      <div className="bg-white border border-steel-200/60 p-4 rounded-2xl shadow-sm">
        <CheckCircle className="w-5 h-5 text-green-600 mb-2" />

        <span className="text-xs font-semibold text-steel-500">
          Gross Profit
        </span>

        <h3 className="text-2xl font-bold font-display text-steel-950 mt-0.5">
          ₱{Number(filteredSalesSummary.total_gross_profit).toFixed(2)}
        </h3>
      </div>

    </div>

{/* Sales Transaction History */}
<div className="bg-white border border-steel-200/60 rounded-2xl shadow-sm overflow-hidden">

  <div className="px-5 py-4 border-b border-steel-100">
    <h3 className="text-sm font-bold font-display text-steel-900">
      Completed Sales Transactions
    </h3>

    <p className="text-xs text-steel-500 mt-1">
      Recorded Online Order and Onsite POS sales.
    </p>
  </div>

  {filteredSalesHistory.length === 0 ? (
    <div className="text-center py-12 text-steel-500">
      <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-steel-300" />

      <p className="text-xs">
  {salesSearch.trim()
  ? 'No completed sales match your search and selected date period.'
  : salesDatePreset === 'all'
    ? 'No completed sales recorded yet.'
    : 'No completed sales found for the selected date period.'}
</p>

    </div>
  ) : (
    <div className="overflow-x-auto">

      <table className="w-full text-xs">

        <thead className="bg-steel-50 border-b border-steel-200">
          <tr className="text-left text-steel-500 uppercase tracking-wider">

            <th className="px-4 py-3">Date</th>
<th className="px-4 py-3">Reference</th>
<th className="px-4 py-3">Products / Items</th>
<th className="px-4 py-3">Source</th>
<th className="px-4 py-3">Items</th>
            <th className="px-4 py-3">Quantity</th>
            <th className="px-4 py-3">Revenue</th>
            <th className="px-4 py-3">Cost</th>
            <th className="px-4 py-3">Gross Profit</th>
            <th className="px-4 py-3">Payment Method</th>
            <th className="px-4 py-3">Status</th>

          </tr>
        </thead>

        <tbody>
          {filteredSalesHistory.map((sale) => (
            <tr
              key={sale.sale_id}
              className="border-b border-steel-100 last:border-0 hover:bg-steel-50/50"
            >

              <td className="px-4 py-3 whitespace-nowrap text-steel-500">
  {new Date(sale.sale_date).toLocaleString()}
</td>

<td className="px-4 py-3 font-semibold text-steel-800 whitespace-nowrap">
  {sale.reference}
</td>

<td className="px-4 py-3 text-steel-700 min-w-[220px]">
  {sale.items_summary || '—'}
</td>

<td className="px-4 py-3">
                <span
                  className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                    sale.source_label === 'POS'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}
                >
                  {sale.source_label}
                </span>
              </td>

              <td className="px-4 py-3 text-steel-700">
                {sale.item_count}
              </td>

              <td className="px-4 py-3 font-bold text-steel-800">
                {sale.total_quantity}
              </td>

              <td className="px-4 py-3 font-semibold text-steel-800 whitespace-nowrap">
                ₱{Number(sale.revenue).toFixed(2)}
              </td>

              <td className="px-4 py-3 text-steel-700 whitespace-nowrap">
                ₱{Number(sale.cogs).toFixed(2)}
              </td>

              <td className="px-4 py-3 font-bold text-green-700 whitespace-nowrap">
                ₱{Number(sale.gross_profit).toFixed(2)}
              </td>

              <td className="px-4 py-3">
                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                  {formatPaymentMethod(sale.payment_method || 'cash')}
                </span>
              </td>

              <td className="px-4 py-3">
                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                  {sale.payment_status}
                </span>
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

{/* TAB: INVENTORY MOVEMENT HISTORY */}
{activeTab === 'movementHistory' && (
  <div className="space-y-5 animate-fade-up">

    <div>
      <h2 className="text-2xl font-bold font-display text-steel-950">
        Inventory Movement History
      </h2>

      <p className="text-sm text-steel-500">
        Review all recorded Stock-In and Stock-Out transactions.
      </p>
    </div>

    {/* Movement Filters */}
<div className="bg-white border border-[#DDE6E0] rounded-2xl p-4 shadow-sm">

  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">

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

    {/* Type */}
    <select
      value={movementTypeFilter}
      onChange={(e) =>
        setMovementTypeFilter(
          e.target.value as
            | 'all'
            | 'Stock-In'
            | 'Stock-Out'
        )
      }
      className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#DDE6E0] bg-white text-[#34463F] focus:outline-none focus:ring-2 focus:ring-[#2F7D5A]/20 focus:border-[#2F7D5A]"
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

    <div className="bg-white border border-steel-200/60 rounded-2xl shadow-sm overflow-hidden">

      {filteredInventoryMovements.length === 0 ? (
        <div className="text-center py-12 text-steel-500">
          <ArrowLeftRight className="w-10 h-10 mx-auto mb-2 text-steel-300" />
          <p className="text-xs">
  {inventoryMovements.length === 0
    ? 'No inventory movements recorded yet.'
    : 'No inventory movements match the selected filters.'}
</p>

        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">

            <thead className="bg-steel-50 border-b border-steel-200">
              <tr className="text-left text-steel-500 uppercase tracking-wider">

                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Cost / Unit</th>
                <th className="px-4 py-3">Selling Price</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Remarks</th>
                <th className="px-4 py-3">Recorded By</th>

              </tr>
            </thead>

            <tbody>
              {filteredInventoryMovements.map((movement) => (
                <tr
                  key={movement.movement_id}
                  className="border-b border-steel-100 last:border-0 hover:bg-steel-50/50"
                >

                  <td className="px-4 py-3 whitespace-nowrap text-steel-500">
                    {new Date(movement.movement_date).toLocaleString()}
                  </td>

                  <td className="px-4 py-3 font-semibold text-steel-800">
                    {movement.product_name}
                  </td>

                  <td className="px-4 py-3">
  <span
    className={`px-2 py-1 rounded-full text-[10px] font-bold ${
      movement.movement_type === 'Stock-In'
        ? 'bg-green-50 text-green-700 border border-green-200'
        : 'bg-red-50 text-red-700 border border-red-200'
    }`}
  >
    {movement.movement_type}
  </span>
</td>

{/* Quantity */}
<td className="px-4 py-3 whitespace-nowrap">
  
  <span
    className={`font-bold ${
      movement.movement_type === 'Stock-In'
        ? 'text-green-700'
        : 'text-red-600'
    }`}
  >
    {movement.movement_type === 'Stock-In'
      ? '+'
      : '-'}
    {movement.quantity}
  </span>
</td>

{/* Source */}
<td className="px-4 py-3 whitespace-nowrap">
  <span className="text-xs font-semibold text-[#34463F]">
    {movement.source_label || 'Inventory Movement'}
  </span>
</td>

{/* Supplier */}
<td className="px-4 py-3 text-steel-600">
  {movement.supplier_name || '—'}
</td>

{/* Cost / Unit */}
<td className="px-4 py-3 text-steel-700">
  ₱{Number(movement.supplier_price).toFixed(2)}
</td>

{/* Selling Price */}
<td className="px-4 py-3 text-steel-700">
  ₱{Number(movement.selling_price).toFixed(2)}
</td>

{/* Reference */}
<td className="px-4 py-3 text-steel-600 whitespace-nowrap">
  <span className="font-semibold text-[#2F7D5A]">
    {movement.reference_label || '—'}
  </span>
</td>

{/* Remarks */}
<td className="px-4 py-3 text-steel-500">
  {movement.remarks || '—'}
</td>

{/* Recorded By */}
<td className="px-4 py-3 whitespace-nowrap text-steel-600">
  {movement.recorded_by?.trim() || `Admin #${movement.admin_id}`}
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

             <div className="grid grid-cols-1 gap-2 border-b border-[#E5ECE8] bg-[#F8FAF9] p-3 sm:grid-cols-2 xl:grid-cols-4">
  {([
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
  reportType === 'sales'
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
  reportType === 'sales'
    ? 'Search reference, product, or sales source...'
    : reportType === 'stockMovement'
      ? 'Search product, supplier, source, or reference...'
      : 'Search product, category, or supplier...'
}
                      className="h-11 w-full rounded-xl border border-[#D5E1DA] bg-white pl-10 pr-4 text-xs font-medium text-[#17372D] outline-none transition focus:border-[#2F7D5A] focus:ring-2 focus:ring-[#2F7D5A]/10"
                    />
                  </label>

                  {reportType === 'sales' ? (
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

                {reportType === 'sales' && (
                  <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                      ['Total Sales', reportSalesSummary.totalSales.toLocaleString()],
                      ['Revenue', formatPeso(reportSalesSummary.revenue)],
                      ['Cost', formatPeso(reportSalesSummary.cost)],
                      ['Gross Profit', formatPeso(reportSalesSummary.grossProfit)],
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
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      ['Products', reportInventorySummary.products.toLocaleString()],
                      ['Current Units', reportInventorySummary.units.toLocaleString()],
                      ['Stock Value', formatPeso(reportInventorySummary.stockValue)],
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

                <div className="mt-5 overflow-x-auto rounded-xl border border-[#DDE6E0]">
                  <table className="min-w-full border-collapse text-left">
                    <thead className="bg-[#EEF5F1]">
                      <tr>
                        {reportTableHeaders.map((header) => (
                          <th
                            key={header}
                            className="whitespace-nowrap px-4 py-3 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#587067]"
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
                            colSpan={reportTableHeaders.length}
                            className="px-4 py-12 text-center text-xs text-[#7A8E85]"
                          >
                            No records match the selected filters.
                          </td>
                        </tr>
                      ) : (
                        reportTableRows.map((row, rowIndex) => (
                          <tr key={`${reportType}-${rowIndex}`} className="hover:bg-[#F8FAF9]">
                            {row.map((value, columnIndex) => (
                              <td
                                key={`${rowIndex}-${columnIndex}`}
                                className="whitespace-nowrap px-4 py-3 text-[11px] font-medium text-[#40564D]"
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
                  Showing {reportTableRows.length.toLocaleString()} record{reportTableRows.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          </section>
        )}

        <footer className="-mx-4 mt-8 bg-[#0B4B2B] text-white md:-mx-6 lg:-mx-6 xl:-mx-8">
          <div className="grid gap-8 px-6 py-9 sm:grid-cols-2 xl:grid-cols-[1.45fr_1fr_1fr] xl:px-10">
            <div>
              <Link
  to="/project"
  aria-label="Open the Rayjin Hardware Capstone Presentation"
  className="
    group flex w-fit items-center gap-3
    rounded-xl
    outline-none
    transition
    focus-visible:ring-2
    focus-visible:ring-emerald-300
    focus-visible:ring-offset-2
    focus-visible:ring-offset-[#0B4B2B]
  "
>
  <span
    className="
      flex h-10 w-10 items-center justify-center
      rounded-xl
      bg-[#22C55E]
      text-[#07321D]
      shadow-sm
      transition-transform
      group-hover:scale-105
    "
  >
    <Wrench className="h-5 w-5" strokeWidth={2.5} />
  </span>

  <div>
    <p className="font-display text-sm font-extrabold tracking-wide transition group-hover:text-emerald-200">
      RAYJIN
    </p>

    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300">
      Hardware
    </p>
  </div>
</Link>
              <p className="mt-4 max-w-md text-xs leading-5 text-emerald-100/80">
                Integrated online ordering, point-of-sale, inventory, delivery, and reporting tools for Rayjin Hardware operations.
              </p>
              <span className="mt-4 inline-flex rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-semibold text-emerald-100">
                Administration Console
              </span>
            </div>

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-300">Dashboard Sections</p>
              <div className="mt-4 grid gap-2 text-xs text-emerald-50/85">
                <button type="button" onClick={() => setActiveTab('overview')} className="w-fit hover:text-white">Overview</button>
                <button type="button" onClick={() => setActiveTab('orders')} className="w-fit hover:text-white">Manage Orders</button>
                <button type="button" onClick={() => setActiveTab('reports')} className="w-fit hover:text-white">Reports Center</button>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-300">System Areas</p>
              <div className="mt-4 grid gap-2 text-xs text-emerald-50/85">
                <button type="button" onClick={() => setActiveTab('products')} className="w-fit hover:text-white">Product Inventory</button>
                <button type="button" onClick={() => setActiveTab('pos')} className="w-fit hover:text-white">POS / New Sale</button>
                <button type="button" onClick={() => setActiveTab('deliveryRates')} className="w-fit hover:text-white">Delivery Rates</button>
                <button type="button" onClick={() => setActiveTab('sales')} className="w-fit hover:text-white">Sales History</button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-white/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between xl:px-10">
            <p className="text-[10px] text-emerald-100/65">
              © {new Date().getFullYear()} Rayjin Hardware — Administration System
            </p>
            <button
              type="button"
              onClick={handleDashboardBackToTop}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-[10px] font-bold text-white transition hover:bg-white/15"
            >
              Back to top
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </footer>

      </main>
    </div>
  );
}
