import { Footer } from '../components/Footer';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DeliveryLocationMap } from '../components/DeliveryLocationMap';
import { CustomerMessages } from '../components/CustomerMessages';
import { ProductDetailsModal } from '../components/ProductDetailsModal';
import { PopularProducts, type PopularProduct } from '../components/PopularProducts';
import { PremiumCategoryShowcase } from '../components/PremiumCategoryShowcase';
import { CustomerConfidenceCards } from '../components/CustomerConfidenceCards';
import {
  RAYJIN_CONTACT
} from '../data/contact';
import { 
  ShoppingCart, Clock, BadgePercent, 
  Search, Plus, Minus, Trash2, CreditCard, CheckCircle, 
  MapPin, Phone, Mail, ArrowRight, Package, Truck, Store, Wrench,
  ShieldCheck, MessageCircle
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  description: string | null;
  unit: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  brand: string;
  status?: 'active' | 'inactive';
  delivery_class?: 'light' | 'standard' | 'bulky';
  bulk_quantity_threshold?: number | null;
  fulfillment_rule?: 'all' | 'delivery_only';
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Order {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
  original_subtotal?: number | string | null;
  discount_amount?: number | string | null;
  fulfillment: 'pickup' | 'delivery' | 'shop_go';
  paymentMethod: 'card' | 'gcash' | 'cash';
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
  payment_method?: string;
  payment_status?: 'Pending' | 'Paid' | 'Failed' | 'Cancelled' | null;
  created_at?: string;
  service_fee?: number | string | null;
  delivery_fee?: number | string | null;
  delivery_load_class?: 'light' | 'standard' | 'bulky' | null;
  delivery_contact_person?: string | null;
  delivery_contact_number?: string | null;
  delivery_municipality?: string | null;
  delivery_barangay?: string | null;
  delivery_address?: string | null;
  delivery_landmark?: string | null;
  delivery_instructions?: string | null;
  delivery_latitude?: number | string | null;
  delivery_longitude?: number | string | null;
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

previous_status?: string | null;
}

interface CustomerUser {
  id?: number;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  address?: string;
  supporting_address?: string;
  role?: string;
}

interface DeliveryRate {
  municipality: string;
  barangay: string;
  zone: string;
  surcharge: number | string;
}

interface DeliveryAreasResponse {
  municipalities: string[];
  barangays: Record<string, string[]>;
}

const PH_LOCAL_MOBILE_PATTERN = /^9\d{9}$/;

const toLocalPhilippineMobile = (value: string | undefined) => {
  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '');

  if (/^639\d{9}$/.test(digits)) return digits.slice(2);
  if (/^09\d{9}$/.test(digits)) return digits.slice(1);
  if (/^9\d{9}$/.test(digits)) return digits;

  // Preserve an unrecognized legacy value so it is visibly invalid and can
  // be corrected by the customer instead of silently changing stored data.
  return digits;
};

const normalizeProfileMobileInput = (value: string) => {
  let digits = value.replace(/\D/g, '');
  if (/^639\d{9}$/.test(digits)) digits = digits.slice(2);
  if (/^09\d{9}$/.test(digits)) digits = digits.slice(1);
  return digits.slice(0, 10);
};

const hasUsableProductImage = (product?: Product | null) =>
  Boolean(
    product?.image &&
      (product.image.startsWith('/') ||
        product.image.startsWith('http') ||
        product.image.startsWith('data:')),
  );

export function CustomerDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
const activeTab = searchParams.get('tab') || 'overview';

const navbarProductSearch =
  searchParams.get('search');

const setActiveTab = (tab: string) => {
  setSearchParams({ tab });
};

const openOrderMessages = (orderId: string) => {
  setSearchParams({ tab: 'messages', order: orderId });
};

useEffect(() => {
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: 'auto',
  });
}, [activeTab]);

const [user, setUser] = useState<CustomerUser>({
  username: 'customer',
  email: 'customer@system.com'
});
  const [profileStatus, setProfileStatus] = useState<'idle' | 'saved'>('idle');
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [firstOrderDiscount, setFirstOrderDiscount] = useState({
    loaded: false,
    eligible: false,
    minimumSubtotal: 1000,
    discountPercent: 20,
  });
  const [products, setProducts] =
  useState<Product[]>([]);

const [productsLoading, setProductsLoading] =
  useState(true);

const [productsError, setProductsError] =
  useState('');

const [activeCategoryNames, setActiveCategoryNames] =
  useState<string[]>([]);
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
    address: '',
    supporting_address: ''
  });
  const profilePhoneIsValid = PH_LOCAL_MOBILE_PATTERN.test(profileData.phone_number);
  const [deliveryRates, setDeliveryRates] = useState<DeliveryRate[]>([]);
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryAreasResponse>({
    municipalities: ['Initao', 'Libertad', 'Naawan', 'Gitagum'],
    barangays: {},
  });
  const [deliveryDetails, setDeliveryDetails] = useState({
    contactPerson: '',
    contactNumber: '',
    municipality: '',
    barangay: '',
    address: '',
    landmark: '',
    instructions: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  useEffect(() => {
  if (
    activeTab !== 'catalog' ||
    navbarProductSearch === null
  ) {
    return;
  }

  setSearchQuery(navbarProductSearch);

  // Navbar search should search the whole catalog,
  // not remain restricted by a previous category.
  setSelectedCategory('All');
}, [activeTab, navbarProductSearch]);

  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery' | 'shop_go'>('pickup');
  const [shopGoPickup, setShopGoPickup] = useState({ date: '', time: '' });
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'gcash' | 'cash'>('gcash');
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [continuingPaymentOrderId, setContinuingPaymentOrderId] = useState<string | null>(null);
  const [
  expandedCompletedOrderUpdates,
  setExpandedCompletedOrderUpdates
] = useState<Record<string, boolean>>({});

const [completedOrdersExpanded, setCompletedOrdersExpanded] =
  useState(false);
const [closedOrdersExpanded, setClosedOrdersExpanded] =
  useState(false);

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
  const [selectedProductDetails, setSelectedProductDetails] = useState<Product | null>(null);
  const [detailsQuantity, setDetailsQuantity] = useState(1);
  const [addedProductToast, setAddedProductToast] = useState<{ name: string; qty: number } | null>(null);

  useEffect(() => {

    // Load customer detail
const userStr = localStorage.getItem('user');
let currentUser: CustomerUser | null = null;

if (userStr) {
  const parsedUser = JSON.parse(userStr) as CustomerUser;

  currentUser = parsedUser;
  setUser(parsedUser);

  setProfileData(prev => ({
    ...prev,
    first_name: parsedUser.first_name || '',
    last_name: parsedUser.last_name || '',
    email: parsedUser.email || '',
    phone_number: toLocalPhilippineMobile(parsedUser.phone_number),
    address: parsedUser.address || '',
    supporting_address: parsedUser.supporting_address || '',
  }));
}

    // Load cart from localStorage
    const savedCart = localStorage.getItem('customer_cart');
    if (savedCart) setCart(JSON.parse(savedCart));

    // Fetch live products from the Rayjin Hardware database.
const fetchProducts = async () => {
  setProductsLoading(true);
  setProductsError('');

  try {
    const res = await fetch('/api/products');

    if (!res.ok) {
      throw new Error(
        `Unable to load products. HTTP ${res.status}`
      );
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      throw new Error(
        'Invalid product data received from the server.'
      );
    }

    // An empty array is valid.
    // It means there are currently no products to display.
    setProducts(data);
  } catch (error) {
    console.error(
      'Failed to load live products:',
      error
    );

    // Never substitute fake/sample inventory.
    setProducts([]);

    setProductsError(
      'Unable to load the live product catalog. Please try again later.'
    );
  } finally {
    setProductsLoading(false);
  }
};
    fetchProducts();

    // Fetch active categories managed by Admin
    const fetchActiveCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        if (!res.ok) return;

        const data = await res.json();
        if (!Array.isArray(data)) return;

        setActiveCategoryNames(
          data
            .map((category: { category_name?: string }) => category.category_name?.trim())
            .filter((category: string | undefined): category is string => Boolean(category))
        );
      } catch (error) {
        console.error('Failed to fetch active categories:', error);
      }
    };
    fetchActiveCategories();

    // Fetch Orders
const fetchOrders = async () => {
  if (!currentUser?.id) {
    return;
  }

  const token = localStorage.getItem('token');

  if (!token) {
    console.error('Cannot fetch customer orders: no authentication token.');
    return;
  }

  try {
    const res = await fetch(`/api/orders/${currentUser.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      setOrders(data);
      return;
    }

    const data = await res.json();

    console.error(
      'Unable to fetch customer orders:',
      data.error || `HTTP ${res.status}`
    );

  } catch (err) {
    console.error('Failed to fetch orders', err);
  }
};

    fetchOrders();

    const fetchFirstOrderDiscount = async () => {
      const token = localStorage.getItem('token');
      if (!token || !currentUser?.id) return;

      try {
        const response = await fetch('/api/orders/discount/eligibility', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) return;

        const data = await response.json();
        setFirstOrderDiscount({
          loaded: true,
          eligible: Boolean(data.eligible),
          minimumSubtotal: Number(data.minimumSubtotal || 1000),
          discountPercent: Number(data.discountPercent || 20),
        });
      } catch (error) {
        console.error('Unable to load first-order discount eligibility:', error);
      }
    };

    fetchFirstOrderDiscount();

    const fetchProfile = async () => {
      if (!currentUser?.id) return;
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch('/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;

        const data = await response.json();
        const profileUser = data.user || data;
        const mergedUser = { ...currentUser, ...profileUser };
        setUser(mergedUser);
        setProfileData({
          first_name: profileUser.first_name || '',
          last_name: profileUser.last_name || '',
          phone_number: toLocalPhilippineMobile(profileUser.phone_number),
          email: profileUser.email || '',
          address: profileUser.address || '',
          supporting_address: profileUser.supporting_address || '',
        });
        setDeliveryDetails((previous) => ({
          ...previous,
          contactPerson: `${profileUser.first_name || ''} ${profileUser.last_name || ''}`.trim(),
          contactNumber: profileUser.phone_number || '',
          address: profileUser.address || '',
          landmark: profileUser.supporting_address || '',
        }));
        localStorage.setItem('user', JSON.stringify(mergedUser));
      } catch (error) {
        console.error('Unable to refresh customer profile:', error);
      }
    };

    const fetchDeliveryAreas = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const response = await fetch('/api/orders/delivery-areas', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) setDeliveryAreas(await response.json());
      } catch (error) {
        console.error('Unable to load supported delivery areas:', error);
      }
    };

    const fetchDeliveryRates = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const response = await fetch('/api/orders/delivery-rates', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) setDeliveryRates(await response.json());
      } catch (error) {
        console.error('Unable to load delivery rates:', error);
      }
    };

    fetchProfile();
    fetchDeliveryAreas();
    fetchDeliveryRates();

  }, []);

  // Toast effect
  useEffect(() => {
    if (addedProductToast) {
      const timer = setTimeout(() => {
        setAddedProductToast(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [addedProductToast]);

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('customer_cart', JSON.stringify(newCart));
    window.dispatchEvent(new Event('cart-updated'));
  };

  const handleAddToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      saveCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      saveCart([...cart, { product, quantity: 1 }]);
    }
    setAddedProductToast({ name: product.name, qty: 1 });
  };

  const handleUpdateQuantity = (productId: number, amount: number) => {
    const existing = cart.find(item => item.product.id === productId);
    if (!existing) return;
    const newQty = existing.quantity + amount;
    if (newQty <= 0) {
      saveCart(cart.filter(item => item.product.id !== productId));
    } else {
      saveCart(cart.map(item => 
        item.product.id === productId 
          ? { ...item, quantity: newQty }
          : item
      ));
    }
  };

  const handleRemoveFromCart = (productId: number) => {
    saveCart(cart.filter(item => item.product.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);

  const cartDeliveryOnlyItems = cart.filter((item) => {
    const liveProduct = products.find((product) => product.id === item.product.id);
    return (liveProduct?.fulfillment_rule || item.product.fulfillment_rule || 'all') === 'delivery_only';
  });
  const cartDeliveryOnlyQuantity = cartDeliveryOnlyItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const deliveryChargeMultiplier = cartDeliveryOnlyQuantity > 0
    ? cartDeliveryOnlyQuantity
    : 1;
  const cartRequiresDelivery = cartDeliveryOnlyItems.length > 0;

  useEffect(() => {
    if (cartRequiresDelivery && fulfillment !== 'delivery') {
      setFulfillment('delivery');
    }
  }, [cartRequiresDelivery, fulfillment]);

  const deliveryClassRank = { light: 1, standard: 2, bulky: 3 } as const;
  const cartDeliveryLoadClass = cart.reduce<'light' | 'standard' | 'bulky'>((highest, item) => {
    const liveProduct = products.find((product) => product.id === item.product.id);
    let itemClass = liveProduct?.delivery_class || item.product.delivery_class || 'standard';
    const threshold = Number(
      liveProduct?.bulk_quantity_threshold ?? item.product.bulk_quantity_threshold
    );
    if (Number.isInteger(threshold) && threshold > 0 && item.quantity >= threshold) {
      itemClass = 'bulky';
    }
    return deliveryClassRank[itemClass] > deliveryClassRank[highest] ? itemClass : highest;
  }, 'light');
  const deliveryBaseFees = { light: 60, standard: 150, bulky: 300 } as const;
  const selectedDeliveryRate = deliveryRates.find(
    (rate) =>
      rate.municipality === deliveryDetails.municipality &&
      rate.barangay === deliveryDetails.barangay
  );
  const availableDeliveryBarangays = deliveryRates.filter(
    (rate) => rate.municipality === deliveryDetails.municipality
  );
  const estimatedDeliveryFee = fulfillment === 'delivery' && selectedDeliveryRate
    ? (deliveryBaseFees[cartDeliveryLoadClass] + Number(selectedDeliveryRate.surcharge)) * deliveryChargeMultiplier
    : 0;
  const shopGoServiceFee = fulfillment === 'shop_go' ? 50 : 0;
  const firstOrderDiscountAmount =
    firstOrderDiscount.loaded &&
    firstOrderDiscount.eligible &&
    cartTotal >= firstOrderDiscount.minimumSubtotal
      ? Number(
          (cartTotal * (firstOrderDiscount.discountPercent / 100)).toFixed(2)
        )
      : 0;
  const discountedCartSubtotal = Number(
    (cartTotal - firstOrderDiscountAmount).toFixed(2)
  );
  const amountUntilFirstOrderDiscount = Math.max(
    firstOrderDiscount.minimumSubtotal - cartTotal,
    0
  );
  const estimatedGrandTotal =
    discountedCartSubtotal + estimatedDeliveryFee + shopGoServiceFee;

  const handleCheckout = async (
  e: React.FormEvent
) => {
  e.preventDefault();

  if (cart.length === 0) {
    return;
  }

  if (!user || !user.id) {
    alert(
      'You must be logged in before placing an order.'
    );
    return;
  }

  const token =
    localStorage.getItem('token');

  if (!token) {
    alert(
      'Your session has expired. Please log in again.'
    );
    return;
  }

  if (cartRequiresDelivery && fulfillment !== 'delivery') {
    alert('This cart contains a Delivery-only product. Please use Delivery to continue.');
    setFulfillment('delivery');
    return;
  }

  if (fulfillment === 'shop_go') {
    if (!shopGoPickup.date || !shopGoPickup.time) {
      alert('Please select your preferred Shop & Go pickup date and time.');
      return;
    }
  }

  if (fulfillment === 'delivery') {
    if (cartTotal < 400) {
      alert('Delivery orders require a minimum product subtotal of ₱400.');
      return;
    }
    if (
      !deliveryDetails.contactPerson.trim() ||
      !deliveryDetails.contactNumber.trim() ||
      !deliveryDetails.municipality ||
      !deliveryDetails.barangay ||
      !deliveryDetails.address.trim()
    ) {
      alert('Please complete the contact person, contact number, municipality, barangay, and delivery address.');
      return;
    }
    if (!selectedDeliveryRate) {
      alert('Please select an active delivery barangay for the chosen municipality.');
      return;
    }
    if (
  deliveryDetails.latitude === null ||
  deliveryDetails.longitude === null
) {
  alert(
    'Please select and confirm the exact delivery location on the map.'
  );
  return;
}
  }

  setCheckoutStatus('processing');

  const finalTotal = estimatedGrandTotal;

  try {
    // Cash orders begin as Pending and must still
    // be confirmed by the store.
    //
    // Online payments begin as Awaiting Payment.
    const orderStatus =
      paymentMethod === 'cash'
        ? 'pending'
        : 'awaiting_payment';

    const res = await fetch(
      '/api/orders',
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',

          Authorization:
            `Bearer ${token}`,
        },

        body: JSON.stringify({
  fulfillment,
  paymentMethod,
  status: orderStatus,
  items: cart,

  requestedPickupDate: fulfillment === 'shop_go' ? shopGoPickup.date : null,
  requestedPickupTime: fulfillment === 'shop_go' ? shopGoPickup.time : null,
  deliveryContactPerson: fulfillment === 'delivery' ? deliveryDetails.contactPerson : null,
  deliveryContactNumber: fulfillment === 'delivery' ? deliveryDetails.contactNumber : null,
  deliveryMunicipality: fulfillment === 'delivery' ? deliveryDetails.municipality : null,
  deliveryBarangay: fulfillment === 'delivery' ? deliveryDetails.barangay : null,
  deliveryAddress: fulfillment === 'delivery' ? deliveryDetails.address : null,
  deliveryLandmark: fulfillment === 'delivery' ? deliveryDetails.landmark : null,
  deliveryInstructions: fulfillment === 'delivery' ? deliveryDetails.instructions : null,
  deliveryLatitude: fulfillment === 'delivery' ? deliveryDetails.latitude : null,
  deliveryLongitude: fulfillment === 'delivery' ? deliveryDetails.longitude : null,
}),
      }
    );

    const orderData =
      await res
        .json()
        .catch(() => ({}));

    if (
      res.status === 401
    ) {
      throw new Error(
        'Your session has expired. Please log in again.'
      );
    }

    if (!res.ok) {
      const message =
        orderData.error ||
        'Unable to place your order.';

      // Give the customer a clear explanation when
      // the backend rejects checkout because the
      // stored contact number is missing or invalid.
      if (
        message
          .toLowerCase()
          .includes('contact number')
      ) {
        alert(
          `${message}\n\n` +
          'Please update your contact number in My Profile, then try again.'
        );

        setCheckoutStatus('idle');
        setActiveTab('profile');
        return;
      }

      throw new Error(message);
    }

    const newOrderId =
      orderData.orderId;

    if (!newOrderId) {
      throw new Error(
        'The order was created without an order ID.'
      );
    }

    if (orderData.firstOrderPromotionConsumed) {
      setFirstOrderDiscount((current) => ({
        ...current,
        loaded: true,
        eligible: false,
      }));
    }

    // =================================================
    // CASH ORDER
    // =================================================
    if (paymentMethod === 'cash') {

      const ordersRes =
        await fetch(
          `/api/orders/${user.id}`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const ordersData =
        await ordersRes
          .json()
          .catch(() => []);

      if (!ordersRes.ok) {
        throw new Error(
          'Your order was created, but your order list could not be refreshed.'
        );
      }

      setOrders(ordersData);

      const productsRes =
        await fetch('/api/products');

      if (productsRes.ok) {
        setProducts(
          await productsRes.json()
        );
      }

      saveCart([]);

      setCheckoutStatus('success');

      setTimeout(() => {
        setCheckoutStatus('idle');
        setActiveTab('orders');
      }, 1500);

      return;
    }

    // =================================================
    // PAYMONGO ORDER
    // =================================================

    localStorage.setItem(
      'pending_payment_order_id',
      newOrderId
    );

    const paymongoRes =
      await fetch(
        '/api/paymongo/create-link',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            orderId: newOrderId,
            amount: finalTotal,
            description:
              `Rayjin Hardware Order ${newOrderId}`,
            paymentMethod,
          }),
        }
      );

    const paymongoData =
      await paymongoRes
        .json()
        .catch(() => ({}));

    if (
      paymongoRes.status === 401
    ) {
      throw new Error(
        'Your session could not be verified for online payment. Please log in again.'
      );
    }

    if (!paymongoRes.ok) {
      throw new Error(
        paymongoData.error ||
        'Failed to create payment link.'
      );
    }

    const checkoutUrl =
      paymongoData.checkoutUrl;

    if (!checkoutUrl) {
      throw new Error(
        'Payment checkout URL was not received.'
      );
    }

    saveCart([]);

    window.location.href =
      checkoutUrl;

  } catch (err) {
    console.error(
      'Checkout error:',
      err
    );

    setCheckoutStatus('idle');

    if (err instanceof Error) {
      alert(err.message);
    } else {
      alert(
        'An error occurred during checkout. Please try again.'
      );
    }
  }
};

  const saveProfile = async () => {
  const token =
    localStorage.getItem('token');

  if (!token) {
    alert(
      'Your session has expired. Please log in again.'
    );
    return;
  }

  if (!profilePhoneIsValid) {
    alert('Enter a valid Philippine mobile number: +63 followed by 10 digits starting with 9.');
    return;
  }

  try {
    const res = await fetch(
      '/api/auth/profile',
      {
        method: 'PUT',

        headers: {
          'Content-Type':
            'application/json',

          Authorization:
            `Bearer ${token}`,
        },

        body: JSON.stringify({
          first_name:
            profileData.first_name.trim(),

          last_name:
            profileData.last_name.trim(),

          phone_number:
            `+63${profileData.phone_number}`,

          address:
            profileData.address.trim(),

          // Preserve any legacy supporting-address value in the
          // database so existing Delivery landmark data is not lost.
          supporting_address:
            profileData.supporting_address,
        }),
      }
    );

    const data =
      await res
        .json()
        .catch(() => ({}));

    if (!res.ok) {
      alert(
        data.error ||
        'Unable to update your profile.'
      );
      return;
    }

    const savedUser = data.user || {};
    const updatedUser = {
      ...user,
      ...savedUser,
    };

    const savedFirstName =
      savedUser.first_name ?? profileData.first_name;
    const savedLastName =
      savedUser.last_name ?? profileData.last_name;
    const savedPhoneNumber =
      savedUser.phone_number ?? profileData.phone_number;
    const savedAddress =
      savedUser.address ?? profileData.address;

    setUser(updatedUser);

    setProfileData((prev) => ({
      ...prev,
      first_name: savedFirstName || '',
      last_name: savedLastName || '',
      phone_number: toLocalPhilippineMobile(savedPhoneNumber),
      address: savedAddress || '',
      supporting_address:
        savedUser.supporting_address ??
        prev.supporting_address ??
        '',
    }));

    // Refresh checkout defaults immediately after saving so the
    // updated contact details and address are used without a reload.
    setDeliveryDetails((previous) => ({
      ...previous,
      contactPerson:
        `${savedFirstName || ''} ${savedLastName || ''}`.trim(),
      contactNumber:
        savedPhoneNumber || '',
      address:
        savedAddress || '',
    }));

    localStorage.setItem(
      'user',
      JSON.stringify(updatedUser)
    );

    window.dispatchEvent(
      new Event('storage')
    );

    setProfileStatus('saved');
    setIsProfileEditing(false);

    setTimeout(() => {
      setProfileStatus('idle');
    }, 2500);

  } catch (err) {
    console.error(
      'Profile save error:',
      err
    );

    alert(
      'Unable to save your profile. Please try again.'
    );
  }
};

  const handleSaveProfile = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!isProfileEditing) return;

    void saveProfile();
  };

  const sourceProducts = products;

  const customerVisibleProducts = activeCategoryNames.length > 0
    ? sourceProducts.filter((product) => activeCategoryNames.some(name => name.trim().toLowerCase() === product.category?.trim().toLowerCase()))
    : sourceProducts;
  const availableProducts = customerVisibleProducts.filter(
    (product) => Number(product.stock) > 0 && product.status !== 'inactive'
  );
  const categories = activeCategoryNames.length > 0
    ? ['All', ...activeCategoryNames]
    : [
        'All',
        ...Array.from(
          new Set(
            sourceProducts
              .map((product) => product.category?.trim())
              .filter((category): category is string => Boolean(category))
          )
        ),
      ];

  const normalizedSearchQuery =
  searchQuery.trim().toLowerCase();

const filteredProducts =
  availableProducts.filter((product) => {
    const searchableValues = [
      product.name,
      product.brand,
      product.category,
    ];

    const matchesSearch =
      !normalizedSearchQuery ||
      searchableValues
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(normalizedSearchQuery)
        );

    const matchesCategory =
      selectedCategory === 'All' ||
      product.category?.trim().toLowerCase() === selectedCategory.trim().toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const featuredProducts = availableProducts.slice(0, 20);

  const normalizeCategoryName = (value: string) =>
    value.trim().toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ');
  const preferredFeaturedCategories = [
    'Tools',
    'Construction',
    'Electrical',
    'Plumbing',
    'Lumber & Wood',
    'Fasteners',
  ];
  const activeCategoriesOnly = categories.slice(1);
  const preferredMatches = preferredFeaturedCategories
    .map((preferred) =>
      activeCategoriesOnly.find(
        (category) => normalizeCategoryName(category) === normalizeCategoryName(preferred)
      )
    )
    .filter((category): category is string => Boolean(category));

  const shopCategories = [
    ...preferredMatches,
    ...activeCategoriesOnly.filter(
      (category) => !preferredMatches.some(
        (featured) => normalizeCategoryName(featured) === normalizeCategoryName(category)
      )
    ),
  ].slice(0, 6);
  const customerDisplayName = user.first_name?.trim() || user.username || 'Customer';

  const isOnlinePaymentOrder = (order: Order) => {
    const method = order.payment_method || order.paymentMethod || 'cash';
    return ['card', 'gcash', 'paymongo'].includes(method);
  };

  const canContinueOnlinePayment = (order: Order) => {
    if (!isOnlinePaymentOrder(order) || order.status !== 'awaiting_payment') {
      return false;
    }

    return ['Pending', 'Failed'].includes(order.payment_status || 'Pending');
  };
const paymentPolicyHours = () => 48;

const paymentDeadline = (
  order: Order
) => {
  // Use the original order creation time for the
  // shared 48-hour online-payment deadline.
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
      paymentPolicyHours() *
        60 *
        60 *
        1000
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

  // Plain database DATE such as 2026-10-03.
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      rawDate
    )
  ) {
    datePart = rawDate;
  } else {
    // If the backend returned an ISO/UTC value,
    // first convert it to the Philippine calendar date.
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

  const pickupArrivalDeadline = (
  order: Order
) => {
  // Use the original database creation timestamp only.
  // The Pickup arrival deadline is exactly 48 hours
  // from when the order was originally placed.
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

  const handleContinuePayment = async (order: Order) => {
    if (!canContinueOnlinePayment(order)) {
      alert('This order is not currently eligible for online payment.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token || !user?.id) {
      alert('Your session has expired. Please log in again.');
      return;
    }

    setContinuingPaymentOrderId(order.id);

    try {
      const response = await fetch('/api/paymongo/continue-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        // The backend uses the saved order as the source of truth for amount,
        // payment method, ownership, and the current PayMongo session.
        body: JSON.stringify({ orderId: order.id }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        alert('Your session has expired. Please log in again.');
        return;
      }

      if (!response.ok) {
        alert(data.error || 'Unable to continue payment. Please check My Orders again.');
        return;
      }

      if (data.paymentStatus === 'Paid') {
        if (localStorage.getItem('pending_payment_order_id') === order.id) {
          localStorage.removeItem('pending_payment_order_id');
        }

        const ordersResponse = await fetch(`/api/orders/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (ordersResponse.ok) {
          setOrders(await ordersResponse.json());
        }

        alert(
  order.fulfillment === 'pickup'
    ? `Payment is already confirmed. Your Pickup order is approved and awaiting your arrival. Please present Order ID ${order.id} at Rayjin Hardware before processing begins.`
    : order.fulfillment === 'delivery'
      ? 'Payment is already confirmed. Your Delivery order is awaiting store approval.'
      : 'Payment is already confirmed. Your Shop & Go order is awaiting the existing Express Pickup approval and schedule workflow.'
);
        return;
      }

      if (!data.checkoutUrl || typeof data.checkoutUrl !== 'string') {
        alert('The payment session could not be continued. Please try again later or contact the store.');
        return;
      }

      localStorage.setItem('pending_payment_order_id', order.id);
      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error('Continue payment error:', error);
      alert('Unable to connect to the payment service. Please try again from My Orders.');
    } finally {
      setContinuingPaymentOrderId(null);
    }
  };

  const formatOrderDateTime = (value?: string | null) => {
    if (!value) return 'Not yet available';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString('en-PH');
  };

  const formatPickupDate = (value?: string | null) => {
    if (!value) return 'Not set';

    const parsed = new Date(String(value));

    if (Number.isNaN(parsed.getTime())) {
      return String(value).slice(0, 10);
    }

    return parsed.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPickupTime = (value?: string | null) => {
    if (!value) return '';

    const match = String(value).match(/^(\d{1,2}):(\d{2})/);

    if (!match) return String(value);

    const hour24 = Number(match[1]);
    const minute = match[2];
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;

    return `${hour12}:${minute} ${period}`;
  };

  const getOrderStatusLabel = (order: Order) => {
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

  const labels: Record<Order['status'], string> = {
    pending: 'Pending',
    awaiting_payment: 'Awaiting Payment',
    approved: 'Approved',
    processing: 'Processing',
    ready: 'Ready for Pickup',
    out_for_delivery: 'Out for Delivery',
    failed_delivery: 'Failed Delivery',
    deactivated: 'Temporarily Deactivated',
    completed: 'Completed',
    cancelled: 'Cancelled',
    rejected: 'Rejected',
  };

  return labels[order.status] || order.status;
};

  const getOrderSteps = (order: Order) => (
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

  const getOrderProgressStatus = (order: Order) => {
    if (order.status === 'awaiting_payment') {
  return 'pending';
}
    if (['failed_delivery', 'deactivated'].includes(order.status)) {
      return order.previous_status || 'pending';
    }
    return order.status;
  };

  const getCustomerOrderGuidance = (order: Order) => {
  const paymentMethod = String(
    order.payment_method ||
    order.paymentMethod ||
    'cash'
  )
    .trim()
    .toLowerCase();

  const onlinePayment = [
    'card',
    'gcash',
    'paymongo'
  ].includes(paymentMethod);

  const paymentPaid =
    String(order.payment_status || '')
      .trim()
      .toLowerCase() === 'paid';

  // Awaiting-payment orders already have the dedicated
  // Continue Payment card in My Orders.
  if (order.status === 'awaiting_payment') {
    return null;
  }

// Pending guidance is fulfillment-specific.
// Pickup, Delivery, and Shop & Go do not use
// exactly the same verification workflow.
if (order.status === 'pending') {

  // ----------------------------------------------
  // STANDARD PICKUP — WAITING FOR ADMIN APPROVAL
  // ----------------------------------------------
  if (
    order.fulfillment === 'pickup'
  ) {
    return {
      title:
        'Pickup Order — Awaiting Store Approval',

      message:
        'Rayjin Hardware is reviewing your Pickup order. Once approved, please visit the store and present your Order ID. Processing and preparation will begin only after you arrive and our staff verifies your Order ID.',

      containerClass:
        'border-amber-200 bg-amber-50 text-amber-950',

      titleClass:
        'text-amber-700',
    };
  }

  // ----------------------------------------------
  // DELIVERY
  // ----------------------------------------------
  if (
    order.fulfillment === 'delivery'
  ) {

    // Successful online payment:
    // payment is already verified, but Delivery
    // still requires the existing Admin review.
if (
  onlinePayment &&
  paymentPaid
) {
  return {
    title:
      'Payment Confirmed — Delivery Review in Progress',

    message:
      'Your payment has been successfully received and verified. Rayjin Hardware is now reviewing your Delivery order and may contact you to confirm your phone number or delivery address before approval. Please keep your provided contact number available.',

    contactText:
      'Didn’t receive a verification call? You may contact Rayjin Hardware at 923-282-23.',

    containerClass:
      'border-emerald-200 bg-emerald-50 text-emerald-950',

    titleClass:
      'text-emerald-700',
  };
}

    // Cash on Delivery:
    // exactly 48 hours from original order placement.
    const deadline =
      deliveryVerificationDeadline(
        order
      );

    const deadlineReached =
      Boolean(
        deadline &&
        pickupDeadlineNow >=
          deadline.getTime()
      );

    if (deadlineReached) {
      return {
        title:
          'Delivery Verification Deadline Passed — Store Review Required',

        message:
          'The 48-hour verification period for this Delivery order has ended. Your order has not been rejected yet. Rayjin Hardware will review the order before further action is taken. If the required phone number or delivery-address verification has not been completed, the store may reject the order.',

        contactText:
          'If you still need to complete order verification, you may contact Rayjin Hardware at 923-282-23.',

        deadlineText:
          deadline
            ? formatPickupDeadline(
                deadline
              )
            : null,

        deadlineLabel:
          'Delivery Verification Deadline',

        deadlineNote:
          'This deadline is exactly 48 hours from the original Delivery order placement time.',

        containerClass:
          'border-red-200 bg-red-50 text-red-950',

        titleClass:
          'text-red-700',
      };
    }

    return {
      title:
        'Delivery Order — Awaiting Verification',

      message:
        'Rayjin Hardware will contact you to verify your phone number and delivery address before your order can be approved. Please keep your provided contact number available. Verification should be completed within 48 hours from the time your order was placed. If verification cannot be completed within this period, the order may be rejected.',

      contactText:
        'Didn’t receive a verification call? You may contact Rayjin Hardware at 923-282-23.',

      deadlineText:
        deadline
          ? formatPickupDeadline(
              deadline
            )
          : null,

      deadlineLabel:
        'Delivery Verification Deadline',

      deadlineNote:
        'This deadline is exactly 48 hours from the original Delivery order placement time.',

      containerClass:
        'border-amber-200 bg-amber-50 text-amber-950',

      titleClass:
        'text-amber-700',
    };
  }

  // ----------------------------------------------
// SHOP & GO
// ----------------------------------------------
if (
  order.fulfillment === 'shop_go'
) {

  // Successful online payment:
  // payment is already verified, but Shop & Go
  // still requires Admin review and schedule confirmation.
if (
  onlinePayment &&
  paymentPaid
) {
  const requestedPickupAt =
    shopGoScheduleDateTime(
      order.requested_pickup_date,
      order.requested_pickup_time
    );

  const hasConfirmedSchedule =
    Boolean(
      order.scheduled_pickup_date &&
      order.scheduled_pickup_time
    );

  const requestedPickupPassed =
    Boolean(
      requestedPickupAt &&
      !hasConfirmedSchedule &&
      pickupDeadlineNow >=
        requestedPickupAt.getTime()
    );

  if (requestedPickupPassed) {
    return {
      title:
        'Payment Confirmed — Pickup Schedule Needs Confirmation',

      message:
        'Your payment has been successfully received and verified. Your requested Shop & Go pickup time has passed, but Rayjin Hardware has not yet confirmed the final pickup schedule. Please do not visit the store based on the original requested time. The store may contact you to arrange a new confirmed pickup date and time.',

      contactText:
        'Didn’t receive a schedule update? You may contact Rayjin Hardware at 923-282-23.',

      containerClass:
        'border-amber-200 bg-amber-50 text-amber-950',

      titleClass:
        'text-amber-700',
    };
  }

  return {
    title:
      'Payment Confirmed — Shop & Go Review in Progress',

    message:
      'Your payment has been successfully received and verified. Rayjin Hardware is reviewing your Shop & Go order and requested pickup schedule. The store will confirm the final pickup date and time before preparation begins. Please keep your provided contact number available in case schedule coordination is needed.',

    contactText:
      'Didn’t receive a schedule confirmation or store update? You may contact Rayjin Hardware at 923-282-23.',

    containerClass:
      'border-emerald-200 bg-emerald-50 text-emerald-950',

    titleClass:
      'text-emerald-700',
  };
}

  // Cash Shop & Go:
  // exactly 48 hours from original order placement.
  const deadline =
    shopGoVerificationDeadline(
      order
    );

  const deadlineReached =
    Boolean(
      deadline &&
      pickupDeadlineNow >=
        deadline.getTime()
    );

    const requestedPickupAt =
  shopGoScheduleDateTime(
    order.requested_pickup_date,
    order.requested_pickup_time
  );

const hasConfirmedSchedule =
  Boolean(
    order.scheduled_pickup_date &&
    order.scheduled_pickup_time
  );

const requestedPickupPassed =
  Boolean(
    requestedPickupAt &&
    !hasConfirmedSchedule &&
    pickupDeadlineNow >=
      requestedPickupAt.getTime()
  );

  if (deadlineReached) {
    return {
      title:
        'Shop & Go Verification Deadline Passed — Store Review Required',

      message:
        'The 48-hour verification and schedule-confirmation period for this Shop & Go order has ended. Your order has not been rejected yet. Rayjin Hardware will review the order before further action is taken. If the required order verification or pickup-schedule confirmation has not been completed, the store may reject the order.',

      contactText:
        'If you still need to complete verification or confirm your pickup schedule, you may contact Rayjin Hardware at 923-282-23.',

      deadlineText:
        deadline
          ? formatPickupDeadline(
              deadline
            )
          : null,

      deadlineLabel:
        'Shop & Go Verification Deadline',

      deadlineNote:
        'This deadline is exactly 48 hours from the original Shop & Go order placement time.',

      containerClass:
        'border-red-200 bg-red-50 text-red-950',

      titleClass:
        'text-red-700',
    };
  }

  if (requestedPickupPassed) {
  return {
    title:
      'Requested Pickup Time Not Yet Confirmed',

    message:
      'Your requested Shop & Go pickup time has passed, but the final pickup schedule has not yet been confirmed by Rayjin Hardware. Please do not visit the store based on the original requested time. The store may contact you to verify your order details and arrange a new confirmed pickup schedule. Your 48-hour verification period is still based on the original order placement time.',

    contactText:
      'Didn’t receive a verification call or schedule update? You may contact Rayjin Hardware at 923-282-23.',

    deadlineText:
      deadline
        ? formatPickupDeadline(
            deadline
          )
        : null,

    deadlineLabel:
      'Shop & Go Verification Deadline',

    deadlineNote:
      'The requested pickup time is only your preferred schedule until Rayjin Hardware confirms a final pickup date and time. The verification deadline remains exactly 48 hours from the original order placement time.',

    containerClass:
      'border-amber-200 bg-amber-50 text-amber-950',

    titleClass:
      'text-amber-700',
  };
}

    return {
    title:
      'Shop & Go Order — Awaiting Verification',

    message:
      'Rayjin Hardware will contact you to verify your order details and requested pickup schedule before your Shop & Go order can be approved. Please keep your provided contact number available. Verification and schedule confirmation should be completed within 48 hours from the time your order was placed. If verification cannot be completed within this period, the order may be rejected.',

    contactText:
      'Didn’t receive a verification call or schedule confirmation? You may contact Rayjin Hardware at 923-282-23.',

    deadlineText:
      deadline
        ? formatPickupDeadline(
            deadline
          )
        : null,

    deadlineLabel:
      'Shop & Go Verification Deadline',

    deadlineNote:
      'This deadline is exactly 48 hours from the original Shop & Go order placement time.',

    containerClass:
      'border-amber-200 bg-amber-50 text-amber-950',

    titleClass:
      'text-amber-700',
  };
}

// closes: if (order.status === 'pending')
}

  // --------------------------------------------------
  // STANDARD PICKUP
  // --------------------------------------------------

  if (order.fulfillment === 'pickup') {
    if (order.status === 'approved') {
if (onlinePayment && paymentPaid) {
  return {
    title:
      'Payment Confirmed — Pickup Approved',
    message:
      `Your payment has been successfully verified and your Pickup order has been approved. When you are ready to collect your order, please visit Rayjin Hardware and present Order ID ${order.id}. Our staff will verify your Order ID before processing and preparation begin. No 48-hour arrival deadline applies to this paid order.`,
    containerClass:
      'border-emerald-200 bg-emerald-50 text-emerald-950',
    titleClass:
      'text-emerald-700',
  };
}

const deadline =
  pickupArrivalDeadline(order);

const deadlineReached =
  Boolean(
    deadline &&
    pickupDeadlineNow >=
      deadline.getTime()
  );

if (deadlineReached) {
  return {
    title:
      'Pickup Deadline Passed — Store Review Required',

    message:
      'The 48-hour arrival period for this Pickup order has ended. Your order has not been cancelled yet. Rayjin Hardware will review the order before any further action is taken. If your Order ID has not yet been verified, the store may cancel the order in accordance with the Pickup policy.',

    deadlineText:
      deadline
        ? formatPickupDeadline(deadline)
        : null,

    containerClass:
      'border-red-200 bg-red-50 text-red-950',

    titleClass:
      'text-red-700',
  };
}

return {
  title:
    'Order Approved — Awaiting Your Arrival',

  message:
    `Your Pickup order has been approved. Please visit Rayjin Hardware and present Order ID ${order.id} to our staff. We will verify your Order ID and complete any required in-store payment before order processing and preparation begin. Please arrive within 48 hours from the time your order was originally placed. If you do not arrive within this period, your order may be cancelled.`,

  deadlineText:
    deadline
      ? formatPickupDeadline(deadline)
      : null,

  containerClass:
    'border-amber-200 bg-amber-50 text-amber-950',

  titleClass:
    'text-amber-700',
};

}

    if (order.status === 'processing') {
      return {
        title:
          'Order ID Verified — Processing',
        message:
          'Your Order ID has been verified and your order is now being processed and prepared for pickup.',
        containerClass:
          'border-blue-200 bg-blue-50 text-blue-950',
        titleClass:
          'text-blue-700',
      };
    }

    if (order.status === 'ready') {
      return {
        title:
          'Ready for Pickup',
        message:
          `Your order is ready for pickup. Please keep Order ID ${order.id} available for final verification and release.`,
        containerClass:
          'border-emerald-200 bg-emerald-50 text-emerald-950',
        titleClass:
          'text-emerald-700',
      };
    }
  }

  // --------------------------------------------------
  // SHOP & GO / EXPRESS PICKUP
  // --------------------------------------------------
  if (order.fulfillment === 'shop_go') {
    if (order.status === 'approved') {
      return {
        title:
          'Shop & Go Approved',
        message:
          'Your Express Pickup order has been approved. Rayjin Hardware will prepare your order according to the confirmed pickup schedule. Please wait until it is marked Ready for Express Pickup before collection.',
        containerClass:
          'border-emerald-200 bg-emerald-50 text-emerald-950',
        titleClass:
          'text-emerald-700',
      };
    }

    if (order.status === 'processing') {
      return {
        title:
          'Express Pickup Preparation',
        message:
          'Your Shop & Go order is currently being prepared for Express Pickup. Please follow the confirmed pickup schedule shown below.',
        containerClass:
          'border-blue-200 bg-blue-50 text-blue-950',
        titleClass:
          'text-blue-700',
      };
    }

if (order.status === 'ready') {
  const confirmedPickupAt =
    shopGoScheduleDateTime(
      order.scheduled_pickup_date,
      order.scheduled_pickup_time
    );

  const confirmedPickupPassed =
    Boolean(
      confirmedPickupAt &&
      pickupDeadlineNow >=
        confirmedPickupAt.getTime()
    );

  if (confirmedPickupPassed) {
    return {
      title:
        'Confirmed Pickup Schedule Missed',

      message:
        `Your confirmed Shop & Go pickup schedule has passed, and Order ID ${order.id} has not yet been collected. Your order remains Ready for Express Pickup and has not been marked Completed. Please contact Rayjin Hardware before visiting the store so pickup instructions can be coordinated.`,

      contactText:
        'To coordinate your pickup, please contact Rayjin Hardware at 923-282-23.',

      containerClass:
        'border-amber-200 bg-amber-50 text-amber-950',

      titleClass:
        'text-amber-700',
    };
  }

  return {
    title:
      'Ready for Express Pickup',

    message:
      `Your Shop & Go order is ready. Please arrive according to the confirmed pickup schedule shown below and present Order ID ${order.id} for quick verification and release.`,

    containerClass:
      'border-emerald-200 bg-emerald-50 text-emerald-950',

    titleClass:
      'text-emerald-700',
  };
}

// closes: if (order.fulfillment === 'shop_go')
}

  // --------------------------------------------------
  // DELIVERY
  // --------------------------------------------------
  if (order.fulfillment === 'delivery') {
    if (order.status === 'approved') {
      return {
        title:
          'Delivery Order Approved',
        message:
          'Your delivery order has been approved and will proceed to preparation. Please keep your contact number available in case Rayjin Hardware needs to confirm delivery details.',
        containerClass:
          'border-emerald-200 bg-emerald-50 text-emerald-950',
        titleClass:
          'text-emerald-700',
      };
    }

    if (order.status === 'processing') {
      return {
        title:
          'Preparing Your Delivery',
        message:
          'Your order is currently being prepared for delivery. Please keep your contact number available for delivery coordination.',
        containerClass:
          'border-blue-200 bg-blue-50 text-blue-950',
        titleClass:
          'text-blue-700',
      };
    }

    if (order.status === 'out_for_delivery') {
      return {
        title:
          'Out for Delivery',
        message:
          'Your order is on the way. Please keep the delivery contact number available so the driver can coordinate with you if necessary.',
        containerClass:
          'border-blue-200 bg-blue-50 text-blue-950',
        titleClass:
          'text-blue-700',
      };
    }

    if (order.status === 'failed_delivery') {
      return {
        title:
          'Delivery Attempt Unsuccessful',
        message:
          'The delivery could not be completed. Please review the latest message from Rayjin Hardware or contact the store for the next delivery arrangement.',
        containerClass:
          'border-red-200 bg-red-50 text-red-950',
        titleClass:
          'text-red-700',
      };
    }
  }

  return null;
};

const customerOrderStatusPriority: Record<Order['status'], number> = {
  awaiting_payment: 1,
  failed_delivery: 2,
  deactivated: 2,
  pending: 3,
  approved: 4,
  processing: 5,
  ready: 6,
  out_for_delivery: 6,
  completed: 7,
  cancelled: 8,
  rejected: 9,
};

const getCustomerOrderGroup = (
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

const customerOrderGroupRank = {
  active: 1,
  completed: 2,
  closed: 3,
} as const;

const sortedCustomerOrders = [...orders].sort(
  (first, second) => {
    const firstGroup =
      getCustomerOrderGroup(first);
    const secondGroup =
      getCustomerOrderGroup(second);

    const groupDifference =
      customerOrderGroupRank[firstGroup] -
      customerOrderGroupRank[secondGroup];

    if (groupDifference !== 0) {
      return groupDifference;
    }

    if (firstGroup === 'active') {
      const statusDifference =
        customerOrderStatusPriority[first.status] -
        customerOrderStatusPriority[second.status];

      if (statusDifference !== 0) {
        return statusDifference;
      }
    }

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
  }
);

const activeOrderCount =
  sortedCustomerOrders.filter(
    (order) =>
      getCustomerOrderGroup(order) ===
      'active'
  ).length;

const completedOrderCount =
  sortedCustomerOrders.filter(
    (order) =>
      getCustomerOrderGroup(order) ===
      'completed'
  ).length;

const closedOrderCount =
  sortedCustomerOrders.filter(
    (order) =>
      getCustomerOrderGroup(order) ===
      'closed'
  ).length;

const visibleCustomerOrders =
  sortedCustomerOrders.filter(
    (order) => {
      const group =
        getCustomerOrderGroup(order);

      if (group === 'completed') {
        return completedOrdersExpanded;
      }

      if (group === 'closed') {
        return closedOrdersExpanded;
      }

      return true;
    }
  );

const getCustomerOrderGroupLabel = (
  group: 'active' | 'completed' | 'closed'
) => {
  if (group === 'completed') {
    return 'Completed Orders';
  }

  if (group === 'closed') {
    return 'Cancelled / Rejected';
  }

  return 'Active Orders';
};

  const getProductImage = (product: Product, prominent = false) => {
    if (hasUsableProductImage(product)) {
      return (
  <img
    src={product.image}
    loading="lazy"
    alt={product.name}
    className={prominent
      ? "h-full max-h-[215px] w-full max-w-[96%] object-contain mx-auto transition-transform duration-300 group-hover:scale-105"
      : "h-full max-h-[190px] w-full max-w-[92%] object-contain mx-auto transition-transform duration-300 group-hover:scale-105"}
  />
);
    }
    return <Package aria-hidden="true" className="h-12 w-12 text-emerald-300" />;
  };

  const displayPriceUnit = (product: Product) => {
    if (product.name.toLowerCase().includes('nails')) {
      return ' / kg';
    }
    return '';
  };

  return (
    <div className="w-full bg-[#f6faf7] [container-type:inline-size]">
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-10 px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      
      {/* ========================================================
          TAB 1: OVERVIEW (HOME)
          ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-10 animate-fade-up">
          
          {/* Personalized customer hub hero */}
          <section
            id="customer-home-top"
            className="relative isolate left-1/2 -mt-6 w-[100cqw] -translate-x-1/2 overflow-hidden border-b border-[#dfe9e2] bg-[#eef7f0] text-[#123c2d]"
          >
            <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_18%,rgba(34,197,94,0.12),transparent_30%),linear-gradient(115deg,#fbfdfb_0%,#eef7f0_50%,#dcefdc_100%)]" aria-hidden />
            <img
              src="/images/rayjin-storefront-hero.png"
              alt="Rayjin Hardware construction and hardware products"
              className="absolute inset-0 -z-10 hidden h-full w-full object-cover object-center lg:block"
            />
            <div className="absolute inset-0 -z-[5] hidden bg-[linear-gradient(90deg,rgba(249,252,250,0.995)_0%,rgba(246,251,247,0.975)_34%,rgba(239,248,242,0.82)_50%,rgba(236,247,239,0.34)_68%,rgba(236,247,239,0.05)_84%,rgba(236,247,239,0)_100%)] lg:block" aria-hidden />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-[4] hidden h-36 bg-gradient-to-t from-[#e6f3e9]/45 to-transparent lg:block" aria-hidden />

            <div className="relative mx-auto min-h-[525px] max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex min-h-[525px] items-center py-12 lg:py-14">
                <div className="w-full max-w-2xl lg:max-w-[52%]">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#15803d] shadow-sm backdrop-blur-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Rayjin Hardware Customer Hub
                  </div>

                  <p className="mt-5 text-sm font-semibold text-[#15803d]">Welcome back, {customerDisplayName}!</p>

                  <h1 className="mt-2 max-w-xl font-display text-4xl font-extrabold leading-[1.04] tracking-tight text-[#123c2d] sm:text-5xl lg:text-[3.6rem]">
                    Your project starts
                    <span className="block text-[#16a34a]">with the right supplies.</span>
                  </h1>

                  <p className="mt-5 max-w-xl text-sm leading-7 text-[#4f675d] sm:text-base">
                    Shop live inventory, track your orders, and talk directly with Rayjin Hardware from one customer account.
                  </p>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('catalog')}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#15803d] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-[#166534] active:scale-[0.98]"
                    >
                      <ShoppingCart className="h-4 w-4" /> Browse Products <ArrowRight className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('orders')}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white/90 px-5 py-3 text-sm font-extrabold text-[#17372d] shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-white"
                    >
                      <Package className="h-4 w-4" /> Track My Orders
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('messages')}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50/90 px-5 py-3 text-sm font-extrabold text-[#15803d] transition hover:-translate-y-0.5 hover:bg-emerald-100"
                    >
                      <MessageCircle className="h-4 w-4" /> Message Rayjin
                    </button>
                  </div>

                  <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-bold text-[#526b61]">
                    <span className="inline-flex items-center gap-1.5"><Package className="h-4 w-4 text-[#16a34a]" /> Live inventory</span>
                    <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[#16a34a]" /> Secure checkout</span>
                    <span className="inline-flex items-center gap-1.5"><Truck className="h-4 w-4 text-[#16a34a]" /> Pickup &amp; delivery</span>
                    <span className="inline-flex items-center gap-1.5"><MessageCircle className="h-4 w-4 text-[#16a34a]" /> Customer support</span>
                  </div>

                  <div className="mt-8 overflow-hidden rounded-3xl border border-[#dce9df] bg-white shadow-[0_24px_55px_-36px_rgba(11,59,35,0.55)] lg:hidden">
                    <div className="aspect-[1916/821] w-full">
                      <img
                        src="/images/rayjin-storefront-hero.png"
                        alt="Rayjin Hardware product assortment"
                        className="h-full w-full object-cover object-center"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pointer-events-none absolute bottom-7 right-4 hidden max-w-[270px] rounded-2xl border border-emerald-100/25 bg-[#0b3b23]/90 p-4 shadow-[0_20px_45px_-28px_rgba(5,46,22,0.8)] backdrop-blur-xl sm:right-6 lg:right-8 lg:block">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-emerald-200 ring-1 ring-white/15">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-extrabold text-white">One account, one clear workflow</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-emerald-50/80">Browse, order, track fulfillment, and return to your conversations anytime.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section aria-label="First order promotion" className="relative overflow-hidden rounded-3xl border border-emerald-900/10 bg-[linear-gradient(110deg,#0b3b23_0%,#106333_58%,#16a34a_100%)] px-5 py-6 text-white shadow-[0_24px_55px_-38px_rgba(5,46,22,0.85)] sm:px-7">
            <div aria-hidden className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[34px] border-white/5" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex max-w-3xl items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-emerald-100 ring-1 ring-white/15">
                  <BadgePercent className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-200">First-order customer benefit</p>
                  <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight">20% OFF your first eligible order</h2>
                  <p className="mt-2 text-sm leading-6 text-emerald-50/85">
                    {firstOrderDiscount.loaded && firstOrderDiscount.eligible
                      ? `Your account is eligible. Reach ₱${firstOrderDiscount.minimumSubtotal.toLocaleString('en-PH')} in products and the discount will be applied automatically at checkout.`
                      : 'New customer accounts receive 20% off their first online order with a minimum ₱1,000 product subtotal.'}
                  </p>
                </div>
              </div>

              <div className="relative flex shrink-0 flex-wrap items-center gap-3 lg:justify-end">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold">
                  {firstOrderDiscount.loaded && firstOrderDiscount.eligible ? 'Eligible on this account' : 'One-time first-order offer'}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-[#0b3b23] transition hover:-translate-y-0.5 hover:bg-emerald-50"
                >
                  Shop Products
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </section>

          <CustomerConfidenceCards />

          {!productsLoading && !productsError && shopCategories.length > 0 && (
            <PremiumCategoryShowcase
              id="customer-categories"
              compact
              categories={shopCategories}
              products={availableProducts}
              onSelect={(category) => { setSelectedCategory(category); setActiveTab('catalog'); }}
              onBrowseAll={() => { setSelectedCategory('All'); setActiveTab('catalog'); }}
              description="Browse the active categories represented in Rayjin Hardware's current customer-visible catalog. Counts come from live available products."
            />
          )}

<PopularProducts
  compact
  onSelect={(popular: PopularProduct) => {
    const liveProduct = products.find((product) => Number(product.id) === Number(popular.id));
    if (liveProduct) {
      setSelectedProductDetails(liveProduct);
    } else {
      setSearchQuery(popular.name);
      setSelectedCategory('All');
      setActiveTab('catalog');
    }
  }}
/>

{/* Shop & Go — billboard-style promotion; checkout logic remains unchanged */}
<section
  aria-labelledby="customer-shop-go-title"
  className="relative overflow-hidden rounded-[2.15rem] border border-emerald-900/10 bg-[#063a24] shadow-[0_28px_70px_-38px_rgba(5,46,22,0.82)]"
>
  <div className="grid min-h-[390px] lg:grid-cols-[0.9fr_1.1fr]">
    {/* Billboard copy */}
    <div className="relative z-10 flex flex-col justify-center overflow-hidden px-7 py-10 text-white sm:px-10 lg:px-12 lg:py-12">
      <div
        className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 rounded-full bg-white/5 blur-3xl"
        aria-hidden
      />

      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/25 bg-white/10 px-3.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.2em] text-emerald-200 backdrop-blur-sm">
          <Store className="h-3.5 w-3.5" />
          Rayjin Hardware · Shop &amp; Go
        </div>

        <h2
          id="customer-shop-go-title"
          className="mt-5 max-w-xl font-display text-[2rem] font-extrabold leading-[1.06] tracking-tight sm:text-[2.35rem] lg:text-[2.65rem]"
        >
          Order ahead. Pick up faster.
        </h2>

        <p className="mt-4 max-w-xl text-sm leading-6 text-emerald-50/80">
          Shop Rayjin Hardware online, choose Shop &amp; Go at checkout,
          select your preferred pickup schedule, and collect your prepared
          order when it is ready.
        </p>

        <div className="mt-6 grid max-w-xl gap-2 sm:grid-cols-3">
          {[
            { icon: ShoppingCart, label: 'Order online' },
            { icon: Clock, label: 'Choose pickup time' },
            { icon: Package, label: 'Collect when ready' },
          ].map(({ icon: StepIcon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.07] px-3 py-2.5 text-[10px] font-bold text-emerald-50 backdrop-blur-sm"
            >
              <StepIcon className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All');
              setActiveTab('catalog');
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-xs font-extrabold text-emerald-950 shadow-lg shadow-black/15 transition-all hover:-translate-y-0.5 hover:bg-emerald-300 active:scale-[0.98]"
          >
            Browse Products
            <ArrowRight className="h-3.5 w-3.5" />
          </button>

          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-100/70">
            Initao, Misamis Oriental
          </span>
        </div>
      </div>
    </div>

    {/* Promotional photo */}
    <div className="relative min-h-[310px] overflow-hidden sm:min-h-[360px] lg:min-h-[390px]">
      <img
        src="/images/shop_go_promo.png"
        alt="Prepared Rayjin Hardware order being collected through Shop and Go express pickup"
        className="absolute inset-0 h-full w-full object-cover object-[48%_center]"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#063a24]/50 via-transparent to-transparent lg:bg-[linear-gradient(90deg,#063a24_0%,rgba(6,58,36,0.92)_10%,rgba(6,58,36,0.62)_22%,rgba(6,58,36,0.18)_38%,transparent_56%)]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-24 bg-gradient-to-r from-[#063a24] via-[#063a24]/70 to-transparent lg:block" />

      <div className="absolute bottom-5 right-5 max-w-[230px] rounded-2xl border border-white/20 bg-[#062f1f]/82 p-4 text-white shadow-xl shadow-black/20 backdrop-blur-md sm:bottom-6 sm:right-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-emerald-950">
            <CheckCircle className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-300">
              Express Pickup
            </p>
            <p className="mt-1 text-xs font-bold leading-5">
              Your hardware order can be prepared before you arrive.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

          {/* Featured Products */}
          <section className="space-y-5" aria-labelledby="featured-products-title">
              <div className="flex items-end justify-between gap-4 border-b border-[#e2ebe5] pb-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">Available now</p>
                  <h2 id="featured-products-title" className="mt-1 text-xl font-extrabold text-[#17372d] tracking-tight font-display">
                    Featured hardware products
                  </h2>
                </div>
                <button 
                  onClick={() => setActiveTab('catalog')}
                  className="text-xs font-bold text-[#15803d] hover:text-[#166534] flex items-center gap-1 group transition-colors"
                >
                  View all products 
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>

              {productsLoading ? (
  <div className="rounded-2xl border border-[#e2ebe5] bg-white py-10 text-center">
    <p className="text-xs font-semibold text-[#61766d]">
      Loading live inventory...
    </p>
  </div>
) : productsError ? (
  <div className="rounded-2xl border border-red-100 bg-red-50/40 py-10 text-center">
    <p className="text-xs font-bold text-red-600">
      Live inventory is temporarily unavailable.
    </p>
  </div>
) : featuredProducts.length === 0 ? (
  <div className="rounded-2xl border border-[#e2ebe5] bg-white py-10 text-center">
    <p className="text-xs font-semibold text-[#61766d]">
      No products are currently available.
    </p>
  </div>
) : (
  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
    {featuredProducts.map(product => (
                  <article key={product.id} className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#e2ebe5] bg-white shadow-[0_10px_30px_-24px_rgba(11,59,35,0.65)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_20px_38px_-25px_rgba(11,59,35,0.55)]">
                    <div 
                      onClick={() => { setSelectedProductDetails(product); setDetailsQuantity(1); }}
                      className="relative flex h-60 cursor-pointer items-center justify-center overflow-hidden border-b border-[#edf2ee] bg-gradient-to-br from-[#f8faf8] to-[#eef7f1] p-2"
                    >
                      {getProductImage(product, true)}
                      {product.fulfillment_rule === 'delivery_only' && (
                        <span className="absolute left-3 top-3 rounded-full border border-amber-200 bg-amber-50/95 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-amber-800 shadow-sm">
                          Delivery Only
                        </span>
                      )}
                      <span className="absolute right-3 top-3 rounded-full border border-gray-200 bg-white/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-gray-600 shadow-sm">
                        {product.brand}
                      </span>
                    </div>

                    <div className="flex flex-grow flex-col justify-between p-5">
                      <div 
                        onClick={() => { setSelectedProductDetails(product); setDetailsQuantity(1); }}
                        className="cursor-pointer"
                      >
                        <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">{product.category}</span>
                        <h3 className="mt-1 min-h-10 text-sm font-extrabold leading-5 text-[#17372d]">{product.name}</h3>
                        <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          Number(product.stock) <= 5
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {Number(product.stock) <= 5 ? 'Only' : 'In stock'}: {product.stock} {product.unit}
                        </span>
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#edf2ee] pt-4">
                        <span className="text-base font-extrabold text-[#17372d] font-display">
                          ₱{Number(product.price).toFixed(2)}{displayPriceUnit(product)}
                        </span>
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="flex items-center gap-1 rounded-lg bg-[#15803d] px-3 py-2 text-[10px] font-bold text-white shadow-sm transition-all hover:bg-[#166534] active:scale-95"
                        >
                          <Plus className="w-3 h-3" /> Add to Cart
                        </button>
                      </div>
                    </div>
                  </article>
                                ))}
              </div>
            )}
          </section>

          {/* Bottom Grid: How It Works */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
            
            {/* How It Works Timeline */}
            <div id="customer-how-it-works" className="scroll-mt-24 lg:col-span-12 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-extrabold text-gray-900 tracking-tight font-display mb-6">
                How It Works
              </h3>

              {/* 5-Step visual timeline */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 relative">
                <div className="hidden sm:block absolute top-5 left-[8%] right-[8%] h-0.5 bg-gray-100 -z-0"></div>

                <div className="text-center flex flex-col items-center z-10">
                  <div className="w-10 h-10 rounded-full bg-[#15803d] text-white flex items-center justify-center text-xs font-extrabold shadow-md border-4 border-white shrink-0">
                    1
                  </div>
                  <span className="text-[10px] font-bold text-gray-900 block mt-2">Browse products</span>
                  <span className="text-[9px] text-gray-400 mt-0.5 max-w-[120px] mx-auto block leading-tight">Explore the online catalog.</span>
                </div>

                <div className="text-center flex flex-col items-center z-10">
                  <div className="w-10 h-10 rounded-full bg-[#15803d] text-white flex items-center justify-center text-xs font-extrabold shadow-md border-4 border-white shrink-0">
                    2
                  </div>
                  <span className="text-[10px] font-bold text-gray-900 block mt-2">Add items to cart</span>
                  <span className="text-[9px] text-gray-400 mt-0.5 max-w-[120px] mx-auto block leading-tight">Review products and add to cart.</span>
                </div>

                <div className="text-center flex flex-col items-center z-10">
                  <div className="w-10 h-10 rounded-full bg-[#15803d] text-white flex items-center justify-center text-xs font-extrabold shadow-md border-4 border-white shrink-0">
                    3
                  </div>
                  <span className="text-[10px] font-bold text-gray-900 block mt-2">Choose fulfillment</span>
                  <span className="text-[9px] text-gray-400 mt-0.5 max-w-[120px] mx-auto block leading-tight">Choose pickup, delivery, or Shop & Go.</span>
                </div>

                <div className="text-center flex flex-col items-center z-10">
                  <div className="w-10 h-10 rounded-full bg-[#15803d] text-white flex items-center justify-center text-xs font-extrabold shadow-md border-4 border-white shrink-0">
                    4
                  </div>
                  <span className="text-[10px] font-bold text-gray-900 block mt-2">Complete payment</span>
                  <span className="text-[9px] text-gray-400 mt-0.5 max-w-[120px] mx-auto block leading-tight">Secure PayMongo or Cash.</span>
                </div>

                <div className="text-center flex flex-col items-center z-10">
                  <div className="w-10 h-10 rounded-full bg-[#15803d] text-white flex items-center justify-center text-xs font-extrabold shadow-md border-4 border-white shrink-0">
                    5
                  </div>
                  <span className="text-[10px] font-bold text-gray-900 block mt-2">Track order</span>
                  <span className="text-[9px] text-gray-400 mt-0.5 max-w-[120px] mx-auto block leading-tight">View fulfillment updates in My Orders.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: PRODUCT CATALOG
          ======================================================== */}
      {activeTab === 'catalog' && (
        <div className="space-y-6 animate-fade-up">
<section className="overflow-hidden rounded-[28px] border border-[#dfe9e2] bg-white shadow-[0_18px_45px_-34px_rgba(11,59,35,0.45)]">

  <div className="flex flex-col gap-5 border-b border-[#edf2ee] px-5 py-6 sm:px-6 lg:flex-row lg:items-end lg:justify-between">

    <div className="max-w-xl">

      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#15803d]">
        Live Rayjin Hardware inventory
      </p>

      <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#17372d]">
        Hardware Catalog
      </h2>

      <p className="mt-2 text-sm leading-6 text-[#61766d]">
        Browse available tools and construction
        materials, then add what you need to
        your cart.
      </p>

    </div>

    <div className="relative w-full lg:max-w-md">

      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8d84]" />

      <input
        type="search"
        placeholder="Search products, categories, or brands..."
        value={searchQuery}
        onChange={(e) =>
          setSearchQuery(
            e.target.value
          )
        }
        className="h-12 w-full rounded-2xl border border-[#dce7df] bg-[#f8fbf9] pl-10 pr-4 text-sm font-medium text-[#17372d] outline-none transition placeholder:text-[#8a9992] focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
      />

    </div>

  </div>

  <div className="px-5 py-4 sm:px-6">

    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:pb-0">

      {categories.map(
        (cat) => (
          <button
            key={cat}
            type="button"
            onClick={() =>
              setSelectedCategory(
                cat
              )
            }
            className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-bold transition-all active:scale-95 ${
              selectedCategory === cat
                ? 'bg-[#15803d] text-white shadow-sm'
                : 'border border-[#dce7df] bg-white text-[#52635b] hover:border-emerald-200 hover:bg-emerald-50 hover:text-[#15803d]'
            }`}
          >
            {cat}
          </button>
        )
      )}

    </div>

  </div>

</section>

          {/* Catalog Product Grid */}
          {productsLoading ? (
  <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
    <Package className="w-16 h-16 text-gray-300 mx-auto mb-3" />

    <p className="text-sm font-semibold text-gray-500">
      Loading live product inventory...
    </p>
  </div>
) : productsError ? (
  <div className="text-center py-16 bg-white rounded-3xl border border-red-100 shadow-sm">
    <Package className="w-16 h-16 text-red-200 mx-auto mb-3" />

    <p className="text-sm font-bold text-red-600">
      Product catalog unavailable
    </p>

    <p className="mt-1 text-xs text-gray-500">
      {productsError}
    </p>
  </div>
) : availableProducts.length === 0 ? (
  <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
    <Package className="w-16 h-16 text-gray-300 mx-auto mb-3" />

    <p className="text-sm font-semibold text-gray-500">
      No products are currently available.
    </p>
  </div>
) : filteredProducts.length === 0 ? (
  <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
    <Package className="w-16 h-16 text-gray-300 mx-auto mb-3" />

    <p className="text-sm font-semibold text-gray-500">
      No products match your current search or category filter.
    </p>
  </div>
) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map(product => (
                <div key={product.id} className="group flex min-h-full flex-col overflow-hidden rounded-[24px] border border-[#deebe2] bg-white shadow-[0_14px_36px_-30px_rgba(11,59,35,0.72)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-[0_26px_48px_-30px_rgba(11,59,35,0.58)]">
                  <div 
                    onClick={() => { setSelectedProductDetails(product); setDetailsQuantity(1); }}
                    className="relative flex h-48 cursor-pointer items-center justify-center overflow-hidden border-b border-[#edf2ee] bg-[#f6faf7] p-5"
                  >
                    {getProductImage(product)}
                    {product.fulfillment_rule === 'delivery_only' && (
                      <span className="absolute left-3 top-3 rounded-full border border-amber-200 bg-amber-50/95 px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-wider text-amber-800 shadow-sm">
                        Delivery Only
                      </span>
                    )}
                    {product.brand && (
                      <span className="absolute right-3 top-3 rounded-full border border-[#dde8e0] bg-white/95 px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-wider text-[#5d7067] shadow-sm">
                        {product.brand}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <div 
                      onClick={() => { setSelectedProductDetails(product); setDetailsQuantity(1); }}
                      className="cursor-pointer"
                    >
                      <span className="block text-[9px] font-extrabold uppercase tracking-[0.14em] text-emerald-700">{product.category}</span>
                      <h4 className="mt-1 min-h-10 text-sm font-extrabold leading-5 text-[#17372d]">{product.name}</h4>
                      <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700">
                        {product.stock} {product.unit} available
                      </span>
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#edf2ee] pt-4">
                      <span className="font-display text-base font-extrabold text-[#17372d]">₱{Number(product.price).toFixed(2)}{displayPriceUnit(product)}</span>
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#15803d] px-3.5 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#166534] active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 3: SHOPPING CART
          ======================================================== */}
      {activeTab === 'cart' && (
        <div className="space-y-3 animate-fade-up">
          <section className="rounded-[22px] border border-[#dfe9e2] bg-white px-4 py-3.5 shadow-[0_16px_38px_-32px_rgba(11,59,35,0.45)] sm:px-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#15803d]">
                  Your order workspace
                </p>
                <h2 className="mt-0.5 font-display text-xl font-extrabold tracking-tight text-[#17372d] sm:text-2xl">
                  Your Shopping Cart
                </h2>
                <p className="mt-0.5 text-[11px] leading-5 text-[#61766d]">
                  Review items and finish checkout without losing your place.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#61766d]">
                <span className="rounded-full bg-[#f3f8f4] px-3 py-1.5">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} item{cart.reduce((sum, item) => sum + item.quantity, 0) === 1 ? '' : 's'}
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
                  ₱{cartTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </section>
          
          {cart.length === 0 ? (
            <div className="rounded-[28px] border border-[#deebe2] bg-white py-20 text-center shadow-[0_16px_38px_-30px_rgba(11,59,35,0.55)]">
              <ShoppingCart className="w-20 h-20 text-gray-200 mx-auto mb-4" />
              <h3 className="font-bold text-gray-800 text-base">Your cart is empty</h3>
              <p className="text-xs text-gray-500 mt-1">Explore our catalog to add tools and materials to your order.</p>
              <button
                onClick={() => setActiveTab('catalog')}
                className="mt-6 px-6 py-3 bg-[#15803d] hover:bg-[#166534] text-white text-xs font-bold rounded-xl shadow-lg active:scale-95 transition-all uppercase tracking-wide"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
              
              {/* Cart Items List */}
              <div className="rounded-[22px] border border-[#deebe2] bg-white p-3.5 shadow-[0_16px_38px_-30px_rgba(11,59,35,0.55)] sm:p-4 lg:col-span-6 xl:col-span-5">
                <div className="mb-2.5 flex items-center justify-between border-b border-[#edf2ee] pb-2.5">
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#15803d]">Cart items</p>
                    <p className="mt-0.5 text-xs font-semibold text-[#61766d]">
                      {cart.length} product{cart.length === 1 ? '' : 's'} in this order
                    </p>
                  </div>
                  <span className="rounded-lg bg-[#f6faf7] px-3 py-2 text-xs font-extrabold text-[#17372d]">
                    ₱{cartTotal.toFixed(2)}
                  </span>
                </div>
                <div className="space-y-1.5 scroll-smooth lg:max-h-[calc(100vh-12.75rem)] lg:overflow-y-auto lg:pr-1 lg:[scrollbar-width:thin] lg:[scrollbar-color:#c7d4cc_transparent] lg:[&::-webkit-scrollbar]:w-1.5 lg:[&::-webkit-scrollbar-track]:bg-transparent lg:[&::-webkit-scrollbar-thumb]:rounded-full lg:[&::-webkit-scrollbar-thumb]:bg-[#c7d4cc]">
                {cart.map(item => (
                  <div key={item.product.id} className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[#edf2ee] bg-[#fbfdfb] p-2.5 transition-colors duration-200 hover:border-[#d9e8df] hover:bg-white sm:flex-nowrap">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-white text-xl">
                      {getProductImage(item.product)}
                    </div>

                    <div className="flex-grow min-w-0">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{item.product.brand}</span>
                      <h4 className="truncate text-[11px] font-bold leading-snug text-gray-800 sm:text-xs">{item.product.name}</h4>
                      {(products.find((product) => product.id === item.product.id)?.fulfillment_rule || item.product.fulfillment_rule) === 'delivery_only' && (
                        <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-amber-800">
                          Delivery Only
                        </span>
                      )}
                      <span className="mt-0.5 block text-[10px] font-medium text-gray-500">₱{Number(item.product.price).toFixed(2)}{displayPriceUnit(item.product)} / unit</span>
                    </div>

                    {/* Quantity Operations */}
                    <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white p-1 sm:ml-0">
                      <button 
                        type="button"
                        aria-label={`Decrease quantity for ${item.product.name}`}
                        onClick={() => handleUpdateQuantity(item.product.id, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded text-gray-600 transition-all duration-150 hover:bg-emerald-50 hover:text-[#15803d] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-gray-800 w-6 text-center select-none">{item.quantity}</span>
                      <button 
                        type="button"
                        aria-label={`Increase quantity for ${item.product.name}`}
                        onClick={() => handleUpdateQuantity(item.product.id, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded text-gray-600 transition-all duration-150 hover:bg-emerald-50 hover:text-[#15803d] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Total and Remove */}
                    <div className="ml-auto shrink-0 text-right">
                      <p className="font-display text-xs font-bold text-gray-950 sm:text-sm">₱{(Number(item.product.price) * item.quantity).toFixed(2)}</p>
                      <button
                        type="button"
                        aria-label={`Remove ${item.product.name} from cart`}
                        onClick={() => handleRemoveFromCart(item.product.id)}
                        className="mt-1 inline-flex items-center gap-1 rounded text-[10px] font-semibold text-red-500 transition-all duration-150 hover:text-red-600 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>
                ))}
                </div>
              </div>

              {/* Checkout Panel */}
              <div className="lg:col-span-6 xl:col-span-7">
                <form
                  onSubmit={handleCheckout}
                  className="relative space-y-3 overflow-hidden rounded-[22px] border border-[#deebe2] bg-white p-3.5 shadow-[0_22px_48px_-34px_rgba(11,59,35,0.65)] sm:p-4 lg:sticky lg:top-20 lg:flex lg:max-h-[calc(100vh-5.75rem)] lg:flex-col lg:space-y-0"
                >
                  
                  {/* PayMongo Loading Gateway Overlay */}
                  {checkoutStatus === 'processing' && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                      <div className="w-12 h-12 border-4 border-emerald-200 border-t-[#15803d] rounded-full animate-spin"></div>
                      {paymentMethod === 'cash' ? (
                        <>
                          <h4 className="font-display font-extrabold text-gray-900 mt-4 text-sm">Processing Order...</h4>
                          <p className="text-[10px] text-gray-500 mt-1 max-w-[200px] leading-relaxed">
                            Your cash order is being recorded. Please wait.
                          </p>
                        </>
                      ) : (
                        <>
                          <h4 className="font-display font-extrabold text-gray-900 mt-4 text-sm">Connecting to PayMongo...</h4>
                          <p className="text-[10px] text-gray-500 mt-1 max-w-[200px] leading-relaxed">
                            Creating your secure {paymentMethod === 'gcash' ? 'GCash' : 'Card'} checkout session.
                          </p>
                          <p className="text-[9px] text-gray-400 mt-2">You will be redirected to PayMongo.</p>
                        </>
                      )}
                    </div>
                  )}

                  {checkoutStatus === 'success' && (
                    <div className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                      <CheckCircle className="w-16 h-16 text-emerald-600 animate-bounce" />
                      <h4 className="font-display font-extrabold text-emerald-800 mt-4 text-sm">Payment Confirmed!</h4>
                      <p className="text-[10px] text-gray-500 mt-1">Your order has been recorded successfully. Redirecting...</p>
                    </div>
                  )}

                  <h3 className="border-b border-gray-100 pb-2.5 text-[13px] font-extrabold uppercase tracking-wide text-gray-950 lg:shrink-0">
                    Checkout Summary
                  </h3>

                  <div className="space-y-3 scroll-smooth overscroll-contain lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:py-3 lg:pr-2 lg:[scrollbar-width:thin] lg:[scrollbar-color:#b8c8bf_transparent] lg:[&::-webkit-scrollbar]:w-1.5 lg:[&::-webkit-scrollbar-track]:bg-transparent lg:[&::-webkit-scrollbar-thumb]:rounded-full lg:[&::-webkit-scrollbar-thumb]:bg-[#b8c8bf]">
                  {cartRequiresDelivery && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10px] leading-relaxed text-amber-900">
                      <strong className="block text-[10px] uppercase tracking-wider">Delivery required</strong>
                      This cart contains {cartDeliveryOnlyItems.length} Delivery-only product{cartDeliveryOnlyItems.length === 1 ? '' : 's'}. Pickup and Shop &amp; Go are unavailable for this order.
                    </div>
                  )}
                 {/* Fulfillment Selection */}
<div className="border-b border-[#edf2ee] pb-3">

  <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#52635b]">
    How would you like to receive your order?
  </label>

  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">

    {/* STANDARD PICKUP */}
    <button
      type="button"
      disabled={cartRequiresDelivery}
      aria-disabled={cartRequiresDelivery}
      onClick={() => !cartRequiresDelivery && setFulfillment('pickup')}
      className={`flex min-h-[76px] flex-col gap-1.5 rounded-xl border p-2.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-1 ${
        cartRequiresDelivery
          ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 opacity-70'
          : fulfillment === 'pickup'
          ? 'border-[#15803d] bg-emerald-50/50 text-[#15803d] ring-1 ring-[#15803d]/10 shadow-[0_8px_18px_-16px_rgba(21,128,61,0.55)]'
          : 'border-gray-200 text-gray-600 hover:border-emerald-200 hover:bg-emerald-50/30'
      }`}
    >
      <div className="flex items-center gap-2">
        <Store className="w-4 h-4 shrink-0" />

        <span className="text-[10px] font-bold">
          Standard Pickup
        </span>
      </div>

      <span className="text-[9px] font-medium leading-relaxed opacity-75">
        {cartRequiresDelivery
          ? 'Unavailable because this cart contains a Delivery-only product.'
          : 'Pick up your order at the Rayjin Hardware counter. No preferred schedule required.'}
      </span>
    </button>


    {/* SHOP & GO */}
    <button
      type="button"
      disabled={cartRequiresDelivery}
      aria-disabled={cartRequiresDelivery}
      onClick={() => !cartRequiresDelivery && setFulfillment('shop_go')}
      className={`flex min-h-[76px] flex-col gap-1.5 rounded-xl border p-2.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-1 ${
        cartRequiresDelivery
          ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 opacity-70'
          : fulfillment === 'shop_go'
          ? 'border-[#15803d] bg-emerald-50/50 text-[#15803d] ring-1 ring-[#15803d]/10 shadow-[0_8px_18px_-16px_rgba(21,128,61,0.55)]'
          : 'border-gray-200 text-gray-600 hover:border-emerald-200 hover:bg-emerald-50/30'
      }`}
    >
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 shrink-0" />
        <span className="text-[10px] font-bold">
          Shop &amp; Go
        </span>
      </div>
      <span className="text-[9px] font-medium leading-relaxed opacity-75">
        {cartRequiresDelivery
          ? 'Unavailable because this cart contains a Delivery-only product.'
          : 'Express pickup with your preferred date and time. A ₱50 fulfillment fee applies.'}
      </span>
    </button>

    {/* DELIVERY */}
    <button
      type="button"
      onClick={() => setFulfillment('delivery')}
      className={`flex min-h-[76px] flex-col gap-1.5 rounded-xl border p-2.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-1 ${
        fulfillment === 'delivery'
          ? 'border-[#15803d] bg-emerald-50/50 text-[#15803d] ring-1 ring-[#15803d]/10 shadow-[0_8px_18px_-16px_rgba(21,128,61,0.55)]'
          : 'border-gray-200 text-gray-600 hover:border-emerald-200 hover:bg-emerald-50/30'
      }`}
    >
      <div className="flex items-center gap-2">
        <Truck className="w-4 h-4 shrink-0" />

        <span className="text-[10px] font-bold">
          Delivery
        </span>
      </div>

      <span className="text-[9px] font-medium leading-relaxed opacity-75">
        Have your order delivered to your address.
        Delivery details will be confirmed by the store.
      </span>
    </button>


  </div>

</div>

                  {/* Payment Selection */}
                  <div className="border-b border-[#edf2ee] pb-3">
                    <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#52635b]">Payment Method</label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {/* GCash */}
                      <label className={`flex min-h-[90px] items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer select-none transition-all duration-200 focus-within:ring-2 focus-within:ring-emerald-200 ${
                        paymentMethod === 'gcash'
                          ? 'border-[#15803d] bg-emerald-50/60 ring-1 ring-[#15803d]/20 shadow-[0_10px_24px_-20px_rgba(21,128,61,0.65)]'
                          : 'border-gray-200 hover:-translate-y-px hover:border-emerald-200 hover:bg-white hover:shadow-sm'
                      }`}>
                        <input 
                          type="radio" 
                          name="payment"
                          checked={paymentMethod === 'gcash'}
                          onChange={() => setPaymentMethod('gcash')}
                          className="text-[#15803d] focus:ring-[#15803d]" 
                        />
                        <div className="flex min-h-[64px] flex-grow flex-col">
                          <span className="flex min-h-[30px] flex-wrap content-start items-start gap-1.5 text-xs font-bold leading-tight text-gray-800">
                            <span className="text-blue-500">G</span>Cash
                            <span className="text-[9px] font-extrabold text-[#15803d] bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider border border-emerald-100">PayMongo</span>
                          </span>
                          <span className="mt-auto block min-h-[28px] pt-1 text-[9px] font-medium leading-relaxed text-gray-400">GCash e-wallet · redirects to PayMongo checkout</span>
                        </div>
                        {paymentMethod === 'gcash' && (
                          <span className="text-[8px] font-bold text-[#15803d] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">Selected</span>
                        )}
                      </label>

                      {/* Card */}
                      <label className={`flex min-h-[90px] items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer select-none transition-all duration-200 focus-within:ring-2 focus-within:ring-emerald-200 ${
                        paymentMethod === 'card'
                          ? 'border-[#15803d] bg-emerald-50/60 ring-1 ring-[#15803d]/20 shadow-[0_10px_24px_-20px_rgba(21,128,61,0.65)]'
                          : 'border-gray-200 hover:-translate-y-px hover:border-emerald-200 hover:bg-white hover:shadow-sm'
                      }`}>
                        <input 
                          type="radio" 
                          name="payment"
                          checked={paymentMethod === 'card'}
                          onChange={() => setPaymentMethod('card')}
                          className="text-[#15803d] focus:ring-[#15803d]" 
                        />
                        <div className="flex min-h-[64px] flex-grow flex-col">
                          <span className="flex min-h-[30px] flex-wrap content-start items-start gap-1.5 text-xs font-bold leading-tight text-gray-800">
                            <CreditCard className="h-3.5 w-3.5 shrink-0 text-gray-500" /> Credit / Debit Card
                            <span className="text-[9px] font-extrabold text-[#15803d] bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider border border-emerald-100">PayMongo</span>
                          </span>
                          <span className="mt-auto block min-h-[28px] pt-1 text-[9px] font-medium leading-relaxed text-gray-400">Visa, Mastercard, JCB · redirects to PayMongo checkout</span>
                        </div>
                        {paymentMethod === 'card' && (
                          <span className="text-[8px] font-bold text-[#15803d] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">Selected</span>
                        )}
                      </label>

                      {/* Cash */}
                      <label className={`flex min-h-[90px] items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer select-none transition-all duration-200 focus-within:ring-2 focus-within:ring-emerald-200 ${
                        paymentMethod === 'cash'
                          ? 'border-gray-400 bg-gray-50 ring-1 ring-gray-200 shadow-[0_10px_24px_-20px_rgba(75,85,99,0.45)]'
                          : 'border-gray-200 hover:-translate-y-px hover:border-emerald-200 hover:bg-white hover:shadow-sm'
                      }`}>
                        <input 
                          type="radio" 
                          name="payment"
                          checked={paymentMethod === 'cash'}
                          onChange={() => setPaymentMethod('cash')}
                          className="text-[#15803d] focus:ring-[#15803d]" 
                        />
                        <div className="flex min-h-[64px] flex-grow flex-col">
                          <span className="block min-h-[30px] text-xs font-bold leading-tight text-gray-800">Cash on Hand</span>
                          <span className="mt-auto block min-h-[28px] pt-1 text-[9px] font-medium leading-relaxed text-gray-400">Pay in store or upon doorstep delivery</span>
                        </div>
                        {paymentMethod === 'cash' && (
                          <span className="text-[8px] font-bold text-gray-600 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">Selected</span>
                        )}
                      </label>
                    </div>

                    {/* PayMongo redirect notice */}
                    {(paymentMethod === 'gcash' || paymentMethod === 'card') && (
                      <div className="mt-2 flex items-start gap-2 p-2.5 bg-blue-50/60 border border-blue-100 rounded-lg animate-fade-in">
                        <span className="text-blue-400 text-xs mt-0.5 shrink-0">🔒</span>
                        <p className="text-[9px] text-blue-600 font-medium leading-relaxed">
                          You'll be redirected to PayMongo's secure hosted checkout page to complete your {paymentMethod === 'gcash' ? 'GCash' : 'card'} payment. Your cart will be saved.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Shop & Go Schedule */}
                  {fulfillment === 'shop_go' && (
                    <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3 animate-fade-in space-y-2.5">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Shop &amp; Go preferred pickup</span>
                        <p className="text-[9px] text-emerald-700 mt-1">Choose your preferred pickup date and time. The Admin can confirm or adjust the final schedule.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Preferred date</label>
                          <input
                            type="date"
                            value={shopGoPickup.date}
                            min={new Date().toISOString().slice(0, 10)}
                            onChange={(event) => setShopGoPickup({ ...shopGoPickup, date: event.target.value })}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none transition focus:border-[#15803d] focus:ring-2 focus:ring-emerald-100"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Preferred time</label>
                          <input
                            type="time"
                            value={shopGoPickup.time}
                            onChange={(event) => setShopGoPickup({ ...shopGoPickup, time: event.target.value })}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none transition focus:border-[#15803d] focus:ring-2 focus:ring-emerald-100"
                            required
                          />
                        </div>
                      </div>
                      <div className="rounded-lg bg-white border border-emerald-100 px-3 py-2 text-[10px] text-emerald-800">
                        Shop &amp; Go fulfillment fee: <strong>₱50.00</strong>
                      </div>
                    </div>
                  )}

                  {/* Delivery Info */}
                  {fulfillment === 'delivery' && (
                    <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3 animate-fade-in space-y-2.5">
                      <div className="border-b border-emerald-100/80 pb-2">
                        <span className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-800">Delivery details</span>
                        <p className="text-[9px] text-emerald-700 mt-1">Delivery is available in configured areas of Initao, Libertad, Naawan, and Gitagum, Misamis Oriental. Minimum product subtotal: ₱400.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          aria-label="Delivery contact person"
                          value={deliveryDetails.contactPerson}
                          onChange={(event) => setDeliveryDetails({ ...deliveryDetails, contactPerson: event.target.value })}
                          placeholder="Contact person *"
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none transition focus:border-[#15803d] focus:ring-2 focus:ring-emerald-100"
                        />
                        <input
                          type="tel"
                          aria-label="Delivery contact number"
                          value={deliveryDetails.contactNumber}
                          onChange={(event) => setDeliveryDetails({ ...deliveryDetails, contactNumber: event.target.value })}
                          placeholder="Contact number *"
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none transition focus:border-[#15803d] focus:ring-2 focus:ring-emerald-100"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select
                          aria-label="Delivery municipality"
                          value={deliveryDetails.municipality}
                          onChange={(event) => {
                            const nextMunicipality = event.target.value;

                            setDeliveryDetails((current) => ({
                              ...current,
                              municipality: nextMunicipality,
                              barangay: '',
                              address:
                                nextMunicipality === 'Initao'
                                  ? profileData.address || ''
                                  : '',
                              landmark: '',
                              instructions: '',
                              latitude: null,
                              longitude: null,
                            }));
                          }}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none transition focus:border-[#15803d] focus:ring-2 focus:ring-emerald-100"
                        >
                          <option value="">Select municipality *</option>
                          {deliveryAreas.municipalities.map((municipality) => (
                            <option key={municipality} value={municipality}>{municipality}</option>
                          ))}
                        </select>
                        <select
                          aria-label="Delivery barangay"
                          value={deliveryDetails.barangay}
                          disabled={!deliveryDetails.municipality}
                          onChange={(event) =>
                            setDeliveryDetails((current) => ({
                              ...current,
                              barangay: event.target.value,
                              address:
                                current.municipality === 'Initao'
                                  ? profileData.address || ''
                                  : '',
                              landmark: '',
                              instructions: '',
                              latitude: null,
                              longitude: null,
                            }))
                          }
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none transition focus:border-[#15803d] focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-50 disabled:text-gray-400"
                        >
                          <option value="">Select active barangay *</option>
                          {availableDeliveryBarangays.map((rate) => (
                            <option key={`${rate.municipality}-${rate.barangay}`} value={rate.barangay}>
                              {rate.barangay}
                            </option>
                          ))}
                        </select>
                      </div>
                      {deliveryDetails.municipality && availableDeliveryBarangays.length === 0 && (
                        <p className="text-[10px] font-semibold text-amber-700">
                          No active barangay delivery rates are configured yet for {deliveryDetails.municipality}.
                        </p>
                      )}
                      <textarea
                        aria-label="Complete delivery address"
                        value={deliveryDetails.address}
                        onChange={(event) => setDeliveryDetails({ ...deliveryDetails, address: event.target.value })}
                        placeholder="Complete delivery address *"
                        rows={2}
                        className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none transition focus:border-[#15803d] focus:ring-2 focus:ring-emerald-100"
                      />
                      <input
                        type="text"
                        aria-label="Nearby area or landmark"
                        value={deliveryDetails.landmark}
                        onChange={(event) => setDeliveryDetails({ ...deliveryDetails, landmark: event.target.value })}
                        placeholder="Nearby area / landmark (optional)"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none transition focus:border-[#15803d] focus:ring-2 focus:ring-emerald-100"
                      />
                      <textarea
                        aria-label="Delivery instructions"
                        value={deliveryDetails.instructions}
                        onChange={(event) => setDeliveryDetails({ ...deliveryDetails, instructions: event.target.value })}
                        placeholder="Delivery instructions (optional)"
                        rows={2}
                        className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none transition focus:border-[#15803d] focus:ring-2 focus:ring-emerald-100"
                      />
                      <DeliveryLocationMap
                        value={
                          deliveryDetails.latitude !== null && deliveryDetails.longitude !== null
                            ? { latitude: deliveryDetails.latitude, longitude: deliveryDetails.longitude }
                            : null
                        }
                        onConfirm={({ latitude, longitude }) =>
                          setDeliveryDetails((current) => ({
                            ...current,
                            latitude,
                            longitude,
                          }))
                        }
                        onClear={() =>
                          setDeliveryDetails((current) => ({
                            ...current,
                            latitude: null,
                            longitude: null,
                          }))
                        }
                      />
                      <div className="rounded-lg bg-white border border-emerald-100 px-3 py-2 text-[10px] text-emerald-800">
                        Estimated {cartDeliveryLoadClass} delivery fee
                        {deliveryChargeMultiplier > 1 ? ` × ${deliveryChargeMultiplier} Delivery-only units` : ''}:
                        {' '}<strong>₱{estimatedDeliveryFee.toFixed(2)}</strong>
                      </div>
                    </div>
                  )}

                  </div>

                  <div className="space-y-2.5 border-t border-gray-100 bg-white pt-3 lg:shrink-0">
                  {/* Price Calculations */}
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#52635b]">Order summary</p>
                  <div className="space-y-1.5 text-[11px] text-gray-600">
                    <div className="flex justify-between">
                      <span>Product subtotal</span>
                      <span className="font-bold text-gray-800">₱{cartTotal.toFixed(2)}</span>
                    </div>
                    {firstOrderDiscountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span className="font-semibold">First-order discount ({firstOrderDiscount.discountPercent}%)</span>
                        <span className="font-extrabold">-₱{firstOrderDiscountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {firstOrderDiscount.loaded && firstOrderDiscount.eligible && firstOrderDiscountAmount === 0 && (
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-[10px] font-semibold leading-relaxed text-emerald-800">
                        Add ₱{amountUntilFirstOrderDiscount.toFixed(2)} more in products to unlock your 20% first-order discount.
                      </div>
                    )}
                    {fulfillment === 'shop_go' && (
                      <div className="flex justify-between">
                        <span>Shop &amp; Go fee</span>
                        <span className="font-bold text-gray-800">₱{shopGoServiceFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Delivery fee</span>
                      <span className="font-bold text-gray-800">
                        {fulfillment === 'delivery'
                          ? selectedDeliveryRate
                            ? `₱${estimatedDeliveryFee.toFixed(2)}`
                            : 'Select barangay'
                          : 'FREE'}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-100 pt-2 text-sm">
                      <span className="font-bold text-gray-900">Order total</span>
                      <span className="font-extrabold text-[#15803d]">₱{estimatedGrandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#15803d] py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-800/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#166534] hover:shadow-emerald-800/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2"
                  >
                    {paymentMethod === 'cash' ? (
                      'Confirm Order'
                    ) : (
                      <>
                        🔒 Pay with {paymentMethod === 'gcash' ? 'GCash' : 'Card'} via PayMongo
                      </>
                    )}
                  </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 4: ORDER HISTORY
          ======================================================== */}
      {activeTab === 'orders' && (
        <div className="space-y-6 animate-fade-up">
          <section className="rounded-[28px] border border-[#dfe9e2] bg-white px-5 py-6 shadow-[0_18px_45px_-34px_rgba(11,59,35,0.45)] sm:px-6">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#15803d]">
              Purchase activity
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#17372d]">
              My Orders
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#61766d]">
              Track active purchases and keep completed or closed transaction records available when you need them.
            </p>
          </section>

          {orders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500">You have no order records.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-[#dfe9e2] bg-white p-4 shadow-[0_14px_34px_-30px_rgba(11,59,35,0.5)] sm:p-5">
                <div className="mr-auto">
                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#2F7D5A]">
                    Order Records
                  </span>
                  <p className="mt-0.5 text-[10px] text-gray-500">
                    Active orders stay visible. Completed and closed records are available when needed.
                  </p>
                </div>

                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-800">
                  Active {activeOrderCount}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCompletedOrdersExpanded(
                      (current) => !current
                    )
                  }
                  disabled={completedOrderCount === 0}
                  className="rounded-full border border-[#DDE6E0] bg-[#F7FAF8] px-3 py-1.5 text-[10px] font-bold text-[#52635B] transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Completed {completedOrderCount} ·{' '}
                  {completedOrdersExpanded
                    ? 'Hide'
                    : 'View'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setClosedOrdersExpanded(
                      (current) => !current
                    )
                  }
                  disabled={closedOrderCount === 0}
                  className="rounded-full border border-[#DDE6E0] bg-[#F7FAF8] px-3 py-1.5 text-[10px] font-bold text-[#52635B] transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Closed {closedOrderCount} ·{' '}
                  {closedOrdersExpanded
                    ? 'Hide'
                    : 'View'}
                </button>
              </div>

              {visibleCustomerOrders.length === 0 ? (
                <div className="rounded-2xl border border-[#DDE6E0] bg-white p-8 text-center shadow-sm">
                  <Package className="mx-auto h-8 w-8 text-gray-300" />
                  <p className="mt-2 text-xs font-semibold text-gray-500">
                    No active orders are currently shown.
                  </p>
                  <p className="mt-1 text-[10px] text-gray-400">
                    Use the section controls above to view completed or closed order records.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {visibleCustomerOrders.map((order, index) => {
                    const group =
                      getCustomerOrderGroup(order);

                    const previousGroup =
                      index > 0
                        ? getCustomerOrderGroup(
                            visibleCustomerOrders[
                              index - 1
                            ]
                          )
                        : null;

                    const showGroupHeader =
                      group !== previousGroup;

                    const groupCount =
                      group === 'active'
                        ? activeOrderCount
                        : group === 'completed'
                          ? completedOrderCount
                          : closedOrderCount;

                    return (
                      <React.Fragment key={order.id}>
                        {showGroupHeader && (
                          <div className="flex items-center justify-between gap-3 px-1 pt-2">
                            <div>
                              <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#52635B]">
                                {getCustomerOrderGroupLabel(
                                  group
                                )}
                              </span>
                              <p className="mt-0.5 text-[10px] text-gray-400">
                                {group === 'active'
                                  ? 'Orders that still need payment, review, preparation, pickup, or delivery.'
                                  : group === 'completed'
                                    ? 'Finished orders kept for your transaction history.'
                                    : 'Cancelled or rejected order records.'}
                              </p>
                            </div>

                            <span className="rounded-full border border-[#DDE6E0] bg-white px-2.5 py-1 text-[9px] font-bold text-[#52635B]">
                              {groupCount}
                            </span>
                          </div>
                        )}

                        <div className="space-y-4 rounded-[26px] border border-[#deebe2] bg-white p-5 shadow-[0_16px_38px_-30px_rgba(11,59,35,0.52)]">
                  
                  {/* Order Card Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Order ID</span>
                        <span className="text-sm font-extrabold text-gray-800 font-mono">{order.id}</span>
                      </div>
                      <div className="h-6 w-px bg-gray-100"></div>
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Fulfillment</span>
                        <span className="text-xs font-bold text-gray-600 capitalize">
                          {order.fulfillment === 'shop_go'
  ? 'Shop & Go'
  : order.fulfillment === 'delivery'
    ? 'Delivery'
    : 'Pickup'}
                        </span>
                      </div>
                      <div className="h-6 w-px bg-gray-100"></div>
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Payment</span>
                        <span className="text-xs font-bold text-gray-600">
                          {(() => {
                            const m = order.payment_method || order.paymentMethod || 'cash';
                            if (m === 'gcash') return 'GCash';
                            if (m === 'card') return 'Card (PayMongo)';
                            if (m === 'paymongo') return 'PayMongo';
                            return 'Cash';
                          })()}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => openOrderMessages(order.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[10px] font-extrabold text-[#15803d] transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Message about this order
                      </button>

                      <span className="text-base font-extrabold text-gray-950 font-display">
                        ₱{(
                          Number(order.total) +
                          Number(order.service_fee || 0) +
                          Number(order.delivery_fee || 0)
                        ).toFixed(2)}
                      </span>
                      
                      {/* Status Badges styled in Forest theme */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                        order.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : ['ready', 'out_for_delivery'].includes(order.status)
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : ['failed_delivery', 'deactivated', 'cancelled', 'rejected'].includes(order.status)
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {getOrderStatusLabel(order)}
                      </span>
                    </div>
                  </div>

                  {/* Items Display */}
                  <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-2 items-center flex-wrap">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl p-1.5 pr-3">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-xl border border-gray-100 shrink-0 select-none">
                            {getProductImage(item.product)}
                          </div>
                          <div className="leading-tight">
                            <span className="text-xs font-bold text-gray-800 truncate block max-w-[120px]">
                              {item.product.name}
                            </span>
                            <span className="text-[10px] text-gray-400 font-semibold">Qty: {item.quantity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <span className="text-[11px] font-bold text-gray-400">Ordered on: {formatOrderDateTime(order.created_at || order.date)}</span>
                  </div>

                  {canContinueOnlinePayment(order) &&
  (() => {
    const deadline =
      paymentDeadline(order);

    const deadlineReached =
      Boolean(
        deadline &&
        pickupDeadlineNow >=
          deadline.getTime()
      );

    const isShopGo =
      order.fulfillment ===
      'shop_go';

    const requestedPickupAt =
      isShopGo
        ? shopGoScheduleDateTime(
            order.requested_pickup_date,
            order.requested_pickup_time
          )
        : null;

    const hasConfirmedSchedule =
      Boolean(
        isShopGo &&
        order.status !==
          'awaiting_payment' &&
        order.scheduled_pickup_date &&
        order.scheduled_pickup_time
      );

    const requestedPickupPassed =
      Boolean(
        isShopGo &&
        requestedPickupAt &&
        !hasConfirmedSchedule &&
        pickupDeadlineNow >=
          requestedPickupAt.getTime()
      );

    const paymentFailed =
      order.payment_status ===
      'Failed';

    let title =
      paymentFailed
        ? 'Payment Not Completed'
        : 'Payment Pending';

    let message =
      paymentFailed
        ? 'Your previous payment attempt was not completed successfully. Use Continue Payment to resume or retry the existing PayMongo payment process.'
        : 'Your online payment has not yet been confirmed. Use Continue Payment to complete the existing PayMongo payment process.';

    let policyMessage =
      'Please complete your online payment within 48 hours from the original order placement time.';

    if (
      requestedPickupPassed &&
      !deadlineReached
    ) {
      title =
        paymentFailed
          ? 'Payment Not Completed — Requested Pickup Time Has Passed'
          : 'Payment Pending — Requested Pickup Time Has Passed';

      message =
        paymentFailed
          ? 'Your previous PayMongo payment attempt was not completed successfully, and the Shop & Go pickup time you originally requested has already passed. Use Continue Payment to resume or retry your payment. After successful payment, Rayjin Hardware will review your order and arrange a new confirmed pickup schedule if necessary.'
          : 'Your online payment has not yet been confirmed, and the Shop & Go pickup time you originally requested has already passed. The original requested time is no longer considered a confirmed pickup schedule. Please complete your PayMongo payment first. After successful payment, Rayjin Hardware will review your order and arrange a new confirmed pickup schedule if necessary.';

policyMessage =
  'Your 48-hour payment period is still based on the original order placement time.';
    }

if (deadlineReached) {
  title =
    '48-Hour Payment Period Passed — Store Review Required';

  message =
    'The 48-hour online payment period has ended, but your order has not been cancelled. You may still use Continue Payment while the order remains active. Rayjin Hardware may review and cancel the unpaid order after this period. If you need assistance, please contact the store before completing payment.';

  policyMessage =
    isShopGo
      ? 'The original Shop & Go requested pickup time does not extend or reset the 48-hour payment period.'
      : 'The store-review point is exactly 48 hours from the original order placement time.';
}

    return (
      <div
        className={`rounded-xl border px-4 py-4 text-xs ${
          deadlineReached
            ? 'border-red-200 bg-red-50 text-red-950'
            : 'border-amber-200 bg-amber-50 text-amber-950'
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <span
              className={`block text-[10px] font-extrabold uppercase tracking-wider ${
                deadlineReached
                  ? 'text-red-700'
                  : 'text-amber-700'
              }`}
            >
              {title}
            </span>

            <p className="font-semibold">
              {message}
            </p>

            <p
              className={`text-[11px] ${
                deadlineReached
                  ? 'text-red-800'
                  : 'text-amber-800'
              }`}
            >
              {policyMessage}
            </p>

            {deadline && (
              <div
                className={`mt-2 rounded-lg border bg-white px-3 py-2.5 ${
                  deadlineReached
                    ? 'border-red-200'
                    : 'border-amber-200'
                }`}
              >
                <span
                  className={`block text-[9px] font-extrabold uppercase tracking-wider ${
                    deadlineReached
                      ? 'text-red-700'
                      : 'text-amber-700'
                  }`}
                >
                  48-Hour Payment Review Point
                </span>

                <strong
                  className={`mt-1 block text-xs ${
                    deadlineReached
                      ? 'text-red-800'
                      : 'text-amber-900'
                  }`}
                >
                  {formatPickupDeadline(
                    deadline
                  )}
                </strong>

                <p
                  className={`mt-1 text-[9px] ${
                    deadlineReached
                      ? 'text-red-700'
                      : 'text-amber-700'
                  }`}
                >
                  This review point is exactly 48 hours from the original order placement time.
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              handleContinuePayment(
                order
              )
            }
            disabled={
              continuingPaymentOrderId ===
              order.id
            }
            className="shrink-0 rounded-xl bg-[#15803d] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {continuingPaymentOrderId ===
            order.id
              ? 'Checking Payment…'
              : 'Continue Payment'}
          </button>
        </div>
      </div>
    );
  })()}

{(() => {
  const guidance =
    getCustomerOrderGuidance(order);

  if (!guidance) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border px-4 py-4 text-xs ${guidance.containerClass}`}
    >
      <span
        className={`block text-[10px] font-extrabold uppercase tracking-wider ${guidance.titleClass}`}
      >
        {guidance.title}
      </span>

      <p className="mt-1 font-semibold leading-relaxed">
        {guidance.message}
      </p>

      {'contactText' in guidance &&
        guidance.contactText && (
          <p className="mt-2 text-[10px] font-medium leading-relaxed opacity-80">
            {guidance.contactText}
          </p>
        )}

      {'deadlineText' in guidance &&
        guidance.deadlineText && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-white/70 px-3 py-2.5">
            <span className="block text-[9px] font-extrabold uppercase tracking-wider text-amber-700">
              {'deadlineLabel' in guidance &&
              guidance.deadlineLabel
                ? guidance.deadlineLabel
                : 'Pickup Deadline'}
            </span>

            <strong className="mt-1 block text-sm text-amber-950">
              {guidance.deadlineText}
            </strong>

            <span className="mt-1 block text-[10px] leading-relaxed text-amber-700">
              {'deadlineNote' in guidance &&
              guidance.deadlineNote
                ? guidance.deadlineNote
                : 'This deadline is exactly 48 hours from the original order placement time.'}
            </span>
          </div>
        )}
    </div>
  );
})()}

                  {(Number(order.discount_amount || 0) > 0 || Number(order.service_fee || 0) > 0 || Number(order.delivery_fee || 0) > 0) && (
                    <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-[10px] text-gray-600">
                      {Number(order.discount_amount || 0) > 0 ? (
                        <>
                          <span>Original subtotal: <strong>₱{Number(order.original_subtotal || (Number(order.total) + Number(order.discount_amount || 0))).toFixed(2)}</strong></span>
                          <span className="text-emerald-700">First-order discount: <strong>-₱{Number(order.discount_amount).toFixed(2)}</strong></span>
                          <span>Discounted product subtotal: <strong>₱{Number(order.total).toFixed(2)}</strong></span>
                        </>
                      ) : (
                        <span>Product subtotal: <strong>₱{Number(order.total).toFixed(2)}</strong></span>
                      )}
                      {Number(order.service_fee || 0) > 0 && <span>Shop & Go fee: <strong>₱{Number(order.service_fee).toFixed(2)}</strong></span>}
                      {Number(order.delivery_fee || 0) > 0 && <span>Delivery fee: <strong>₱{Number(order.delivery_fee).toFixed(2)}</strong></span>}
                    </div>
                  )}

                  {order.fulfillment === 'shop_go' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-emerald-50/50 border border-emerald-100 p-4 text-xs">
                      <div>
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Requested pickup schedule</span>
                        <strong className="text-gray-800">
                          {formatPickupDate(order.requested_pickup_date)}
                          {order.requested_pickup_time ? ` · ${formatPickupTime(order.requested_pickup_time)}` : ''}
                        </strong>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-700">Confirmed schedule</span>
                        <strong className="text-emerald-900">
                          {order.status === 'awaiting_payment'
                            ? 'Awaiting payment and Admin confirmation'
                            : order.scheduled_pickup_date
                              ? `${formatPickupDate(order.scheduled_pickup_date)}${order.scheduled_pickup_time ? ` · ${formatPickupTime(order.scheduled_pickup_time)}` : ''}`
                              : 'Awaiting Admin confirmation'}
                        </strong>
                      </div>
                    </div>
                  )}

                  {order.fulfillment === 'delivery' && (
                    <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-4 text-xs text-gray-700 space-y-1">
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-700">Delivery information</span>
                      <p><strong>{order.delivery_contact_person || 'Contact not available'}</strong> · {order.delivery_contact_number || 'No contact number'}</p>
                      <p>{[order.delivery_municipality, order.delivery_barangay, order.delivery_address].filter(Boolean).join(' — ') || 'Address not available'}</p>
                      {order.delivery_landmark && <p>Landmark: {order.delivery_landmark}</p>}
                      {order.delivery_instructions && <p>Instructions: {order.delivery_instructions}</p>}

                      {(() => {
                        const latitude = Number(order.delivery_latitude);
                        const longitude = Number(order.delivery_longitude);
                        const hasSavedLocation =
                          Number.isFinite(latitude) &&
                          Number.isFinite(longitude) &&
                          latitude >= -90 &&
                          latitude <= 90 &&
                          longitude >= -180 &&
                          longitude <= 180;

                        return (
                          <div className="mt-3 border-t border-emerald-100 pt-3">
                            <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                              Delivery location
                            </span>

                            {hasSavedLocation ? (
                              <a
                                href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[10px] font-bold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                              >
                                <MapPin className="h-3.5 w-3.5" />
                                View Selected Location
                              </a>
                            ) : (
                              <p className="mt-1 text-[10px] leading-relaxed text-gray-500">
                                Location pin not available for this order. Please refer to the written delivery address.
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* RAYJIN HARDWARE MESSAGE HISTORY */}
{(() => {
  const history =
    order.message_history || [];

  const isAlertStatus = [
    'failed_delivery',
    'deactivated',
    'cancelled',
    'rejected'
  ].includes(order.status);

const isCompletedOrder =
  order.status === 'completed';

const displayedUpdateCount =
  history.length +
  (isCompletedOrder ? 1 : 0);

const previousUpdatesExpanded =
  Boolean(
expandedCompletedOrderUpdates[
  order.id
]
  );

const showHistoryEntries =
  !isCompletedOrder ||
  previousUpdatesExpanded;

  // New message-history behavior.
  if (
  history.length > 0 ||
  isCompletedOrder
) {
    return (
      <div className="rounded-xl border border-[#DDE6E0] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#2F7D5A]">
              Updates from Rayjin Hardware
            </span>

            <p className="mt-1 text-[10px] text-gray-500">
              Follow the latest store messages and previous updates for this order.
            </p>
          </div>

          <span className="rounded-full border border-[#DDE6E0] bg-[#F7FAF8] px-2.5 py-1 text-[9px] font-bold text-[#52635B]">
{displayedUpdateCount}{' '}
{displayedUpdateCount === 1
  ? 'update'
  : 'updates'}
          </span>


        </div>

        <div className="mt-3 space-y-2">

          {isCompletedOrder &&
  history.length > 0 && (
    <button
      type="button"
      aria-expanded={
        previousUpdatesExpanded
      }
      onClick={() =>
setExpandedCompletedOrderUpdates(
          (current) => ({
            ...current,
            [order.id]:
              !current[order.id],
          })
        )
      }
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-left transition hover:border-emerald-200 hover:bg-emerald-50/50"
    >
      <span>
        <span className="block text-[9px] font-extrabold uppercase tracking-wider text-gray-500">
          Previous Updates
        </span>

        <span className="mt-0.5 block text-[10px] text-gray-500">
          {history.length}{' '}
          {history.length === 1
            ? 'previous store update'
            : 'previous store updates'}
        </span>
      </span>

      <span className="shrink-0 rounded-full border border-[#DDE6E0] bg-white px-2.5 py-1 text-[9px] font-extrabold text-[#2F7D5A]">
        {previousUpdatesExpanded
          ? 'Hide'
          : 'View'}
      </span>
    </button>
  )}

{showHistoryEntries &&
  history.map(
    (entry, index) => {
const isLatest =
  !isCompletedOrder &&
  index === history.length - 1;

              return (
                <div
                  key={entry.id}
                  className={
                    isLatest
                      ? isAlertStatus
                        ? 'rounded-xl border border-red-200 bg-red-50 px-4 py-3'
                        : 'rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3'
                      : 'rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5'
                  }
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={
                        isLatest
                          ? isAlertStatus
                            ? 'text-[9px] font-extrabold uppercase tracking-wider text-red-700'
                            : 'text-[9px] font-extrabold uppercase tracking-wider text-emerald-700'
                          : 'text-[9px] font-bold uppercase tracking-wider text-gray-400'
                      }
                    >
                      {isLatest
                        ? 'Latest Update'
                        : 'Previous Update'}
                    </span>

                    <span className="text-[9px] font-medium text-gray-400">
                      {formatOrderDateTime(
                        entry.created_at
                      )}
                    </span>
                  </div>

                  <p
                    className={
                      isLatest
                        ? isAlertStatus
                          ? 'mt-1.5 whitespace-pre-wrap text-xs font-semibold leading-relaxed text-red-900'
                          : 'mt-1.5 whitespace-pre-wrap text-xs font-semibold leading-relaxed text-[#17372D]'
                        : 'mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-gray-600'
                    }
                  >
                    {entry.message}
                  </p>


                </div>
              );
            }
          )}

          {isCompletedOrder && (
  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-4">
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-700">
            Order Completed
          </span>

          <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[9px] font-bold text-emerald-700">
            Final Update
          </span>
        </div>

        <h6 className="mt-2 text-base font-extrabold tracking-wide text-[#17372D]">
          THANK YOU!
        </h6>

        <p className="mt-1 text-xs font-semibold leading-relaxed text-[#52635B]">
          Your order is complete. Thank you for choosing Rayjin Hardware—we appreciate your business.
        </p>
      </div>
    </div>
  </div>
)}

        </div>
      </div>
    );
  }

  // Compatibility fallback for any legacy order that
  // has a current Admin message but no message-history rows.
  if (order.admin_message) {
    return (
      <div
        className={`rounded-xl border px-4 py-3 text-xs ${
          isAlertStatus
            ? 'border-red-100 bg-red-50 text-red-800'
            : 'border-blue-100 bg-blue-50 text-blue-800'
        }`}
      >
        <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider">
          Message from Rayjin Hardware
        </span>

        <p className="whitespace-pre-wrap">
          {order.admin_message}
        </p>
      </div>
    );
  }

  return null;
})()}

                  {/* Fulfillment-specific order status tracker */}
                  <div className="border-t border-gray-100 pt-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                      <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fulfillment Status Tracker</h5>
                      {['failed_delivery', 'deactivated'].includes(order.status) && (
                        <span className="text-[10px] font-bold text-red-700">Progress paused: {getOrderStatusLabel(order)}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-center relative max-w-3xl">
                      <div className="absolute top-[16px] left-[9%] right-[9%] h-0.5 bg-gray-100 -z-10"></div>
                      {getOrderSteps(order).map((step, index, steps) => {
                        const activeIndex = steps.findIndex((candidate) => candidate.key === getOrderProgressStatus(order));
                        const reached = activeIndex >= index && !['cancelled', 'rejected'].includes(order.status);
                        return (
                          <div key={step.key} className="text-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto text-xs font-extrabold border-2 transition-all ${
                              reached
                                ? 'bg-[#15803d] border-[#166534] text-white shadow-sm'
                                : 'bg-white border-gray-200 text-gray-400'
                            }`}>
                              {index + 1}
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-bold block mt-1.5 text-gray-600">{step.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 5: MESSAGES
          ======================================================== */}
      {activeTab === 'messages' && (
        <CustomerMessages
          orders={orders}
          requestedOrderId={searchParams.get('order')}
          onRequestedOrderHandled={() =>
            setSearchParams({ tab: 'messages' })
          }
        />
      )}

      {/* ========================================================
          TAB 6: MY PROFILE
          ======================================================== */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6 animate-fade-up">
          <section className="overflow-hidden rounded-[28px] border border-[#dfe9e2] bg-white shadow-[0_18px_45px_-34px_rgba(11,59,35,0.45)]">
            <div className="flex flex-col gap-5 border-b border-[#edf2ee] bg-[linear-gradient(120deg,#f8fcf9_0%,#eef8f1_100%)] px-5 py-6 sm:px-6 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#15803d] font-display text-sm font-extrabold text-white shadow-lg shadow-emerald-900/10">
                  {(profileData.first_name || user.first_name || user.username || 'C').slice(0, 1).toUpperCase()}
                  {(profileData.last_name || '').slice(0, 1).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#15803d]">
                    Customer Account
                  </p>
                  <h2 className="mt-1 truncate font-display text-2xl font-extrabold tracking-tight text-[#17372d] sm:text-3xl">
                    {[profileData.first_name, profileData.last_name].filter(Boolean).join(' ') || customerDisplayName}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-[#61766d]">
                    Review your contact details and default address used during checkout.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!isProfileEditing) {
                    setProfileStatus('idle');
                    setIsProfileEditing(true);
                    return;
                  }

                  void saveProfile();
                }}
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#15803d] px-5 py-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#166534] active:scale-[0.98]"
              >
                {isProfileEditing ? 'Save Profile' : 'Edit Profile'}
              </button>
            </div>

            {profileStatus === 'saved' && (
              <div className="mx-5 mt-5 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 animate-fade-in sm:mx-6">
                <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
                Profile saved successfully.
              </div>
            )}

            <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-[#e4ece7] bg-[#fbfdfc] p-5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#15803d]">
                  Personal Information
                </p>
                <p className="mt-1 text-[11px] leading-5 text-[#71827a]">
                  Basic account details used to identify your customer record.
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#819087]">
                      First Name
                    </label>
                    {isProfileEditing ? (
                      <input
                        type="text"
                        value={profileData.first_name}
                        onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                        className="h-11 w-full rounded-xl border border-emerald-300 bg-white px-4 text-xs font-semibold outline-none transition focus:border-[#15803d] focus:ring-4 focus:ring-emerald-100"
                      />
                    ) : (
                      <div className="flex min-h-11 items-center rounded-xl border border-[#e1e8e3] bg-white px-4 text-sm font-semibold text-[#314d42]">
                        {profileData.first_name || 'Not provided'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#819087]">
                      Last Name
                    </label>
                    {isProfileEditing ? (
                      <input
                        type="text"
                        value={profileData.last_name}
                        onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                        className="h-11 w-full rounded-xl border border-emerald-300 bg-white px-4 text-xs font-semibold outline-none transition focus:border-[#15803d] focus:ring-4 focus:ring-emerald-100"
                      />
                    ) : (
                      <div className="flex min-h-11 items-center rounded-xl border border-[#e1e8e3] bg-white px-4 text-sm font-semibold text-[#314d42]">
                        {profileData.last_name || 'Not provided'}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[#e4ece7] bg-[#fbfdfc] p-5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#15803d]">
                  Contact Information
                </p>
                <p className="mt-1 text-[11px] leading-5 text-[#71827a]">
                  Contact details used for order updates and fulfillment coordination.
                </p>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#819087]">
                      Email Address
                    </label>
                    <div className="flex min-h-11 items-center gap-3 rounded-xl border border-[#e1e8e3] bg-white px-4 text-sm font-medium text-[#52635b]">
                      <Mail className="h-4 w-4 shrink-0 text-[#8a9992]" />
                      <span className="truncate">{profileData.email}</span>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#819087]">
                      Phone Number
                    </label>

                    {isProfileEditing ? (
                      <div>
                        <div className="relative flex">
                          <Phone className="absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#8a9992]" />
                          <span
                            className={`flex h-11 items-center rounded-l-xl border border-r-0 pl-10 pr-2.5 text-xs font-bold ${
                              profileData.phone_number && !profilePhoneIsValid
                                ? 'border-red-300 bg-white text-[#314d42]'
                                : 'border-emerald-300 bg-white text-[#314d42]'
                            }`}
                          >
                            +63
                          </span>
                          <input
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel-national"
                            maxLength={10}
                            pattern="9[0-9]{9}"
                            value={profileData.phone_number}
                            onChange={(e) =>
                              setProfileData({
                                ...profileData,
                                phone_number: normalizeProfileMobileInput(e.target.value),
                              })
                            }
                            aria-describedby="profile-phone-help"
                            className={`h-11 min-w-0 flex-1 rounded-r-xl border px-3 text-xs font-semibold outline-none transition ${
                              profileData.phone_number && !profilePhoneIsValid
                                ? 'border-red-300 bg-white focus:border-red-500 focus:ring-4 focus:ring-red-100'
                                : 'border-emerald-300 bg-white focus:border-[#15803d] focus:ring-4 focus:ring-emerald-100'
                            }`}
                            placeholder="9123456789"
                          />
                        </div>
                        <p
                          id="profile-phone-help"
                          className={`mt-1.5 text-[10px] font-medium ${
                            profilePhoneIsValid ? 'text-emerald-600' : 'text-red-500'
                          }`}
                        >
                          {profilePhoneIsValid
                            ? 'Valid Philippine mobile number.'
                            : 'Enter 10 digits starting with 9 after +63.'}
                        </p>
                      </div>
                    ) : (
                      <div className="flex min-h-11 items-center gap-3 rounded-xl border border-[#e1e8e3] bg-white px-4 text-sm font-semibold text-[#314d42]">
                        <Phone className="h-4 w-4 text-[#8a9992]" />
                        <span>+63 {profileData.phone_number}</span>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[#e4ece7] bg-white p-5 lg:col-span-2">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#15803d]">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#15803d]">
                      Default Address
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[#71827a]">
                      Your saved address used as the starting information for delivery.
                    </p>
                  </div>
                </div>

                {isProfileEditing ? (
                  <textarea
                    value={profileData.address}
                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                    rows={3}
                    className="mt-5 w-full resize-none rounded-2xl border border-emerald-300 bg-white px-4 py-3 text-sm font-medium leading-6 outline-none transition focus:border-[#15803d] focus:ring-4 focus:ring-emerald-100"
                  />
                ) : (
                  <div className="mt-5 min-h-[86px] rounded-2xl border border-[#e1e8e3] bg-[#fbfdfc] px-4 py-3 text-sm font-medium leading-6 text-[#314d42]">
                    {profileData.address || 'No default address provided.'}
                  </div>
                )}
              </section>
            </div>
          </section>
        </form>
      )}



      {/* ========================================================
          CUSTOMER DASHBOARD FOOTER
          Same Rayjin Hardware design language as the Storefront.
          ======================================================== */}
      <footer className="relative left-1/2 -mb-16 mt-4 w-[100cqw] -translate-x-1/2 overflow-hidden bg-[#0b3b23] text-emerald-50">
        <div
          aria-hidden
          className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:18px_18px]"
        />

        <div className="relative mx-auto max-w-7xl px-5 py-12 md:px-8 lg:py-14">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <a
                href="/project"
                className="group inline-flex items-center gap-2.5"
                aria-label="Open Rayjin Hardware system presentation"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#22c55e] text-[#052e16] shadow-lg shadow-emerald-950/20 transition-transform group-hover:scale-105">
                  <Wrench className="h-5 w-5" strokeWidth={2.5} />
                </span>
                <span className="flex flex-col leading-none">
                  <span className="font-display text-base font-extrabold tracking-wide text-white">RAYJIN</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Hardware</span>
                </span>
              </a>

              <p className="mt-4 max-w-sm text-sm leading-6 text-emerald-100/80">
                Browse current hardware products, check live availability, and manage your orders for pickup, local delivery, or Shop &amp; Go.
              </p>

              <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                <Store className="h-3.5 w-3.5 text-emerald-300" />
                Online ordering with live inventory visibility
              </div>
            </div>

            <div className="lg:col-span-3">
              <h4 className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-300">
                Store Information
              </h4>
              <div className="mt-4 space-y-3 text-sm text-emerald-100/85">
                <p className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>{RAYJIN_CONTACT.address}</span>
                </p>
                <p className="flex items-start gap-2.5">
                  <Store className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>Local hardware ordering, pickup and delivery services.</span>
                </p>
              </div>
            </div>

            <div className="lg:col-span-2">
              <h4 className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-300">
                Order Services
              </h4>
              <div className="mt-4 flex flex-col gap-2.5 text-sm text-emerald-100/85">
                <span>Standard Pickup</span>
                <span>Local Delivery</span>
                <span>Shop &amp; Go</span>
              </div>
            </div>

            <div className="lg:col-span-3">
              <h4 className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-300">
                Contact
              </h4>
              <div className="mt-4 space-y-3 text-sm text-emerald-100/85">
                <p className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span className="break-all">{RAYJIN_CONTACT.email}</span>
                </p>
                <p className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>{RAYJIN_CONTACT.phone}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
            <p className="text-xs text-emerald-100/65">
              © {new Date().getFullYear()} Rayjin Hardware. All rights reserved.
            </p>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              Back to top
              <ArrowRight className="h-3.5 w-3.5 -rotate-90" />
            </button>
          </div>
        </div>
      </footer>

      {/* ========================================================
          UNIFIED PREMIUM PRODUCT DETAILS
          ======================================================== */}
      <ProductDetailsModal
        product={selectedProductDetails}
        quantity={detailsQuantity}
        onQuantityChange={setDetailsQuantity}
        onClose={() => setSelectedProductDetails(null)}
        onAddToCart={(quantity) => {
          if (!selectedProductDetails) return;

          const existing = cart.find(
            (item) => item.product.id === selectedProductDetails.id,
          );
          const newQty = existing ? existing.quantity + quantity : quantity;
          const finalQty = Math.min(selectedProductDetails.stock, newQty);

          if (existing) {
            saveCart(
              cart.map((item) =>
                item.product.id === selectedProductDetails.id
                  ? { ...item, quantity: finalQty }
                  : item,
              ),
            );
          } else {
            saveCart([
              ...cart,
              { product: selectedProductDetails, quantity: finalQty },
            ]);
          }

          setAddedProductToast({
            name: selectedProductDetails.name,
            qty: quantity,
          });
          setSelectedProductDetails(null);
        }}
      />

      {/* ========================================================
          HUD TOAST: ADDED TO CART (SHOPEE STYLE CENTER)
          ======================================================== */}
      {addedProductToast && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="bg-black/80 backdrop-blur-sm text-white rounded-3xl p-6 flex flex-col items-center justify-center gap-4 shadow-2xl animate-hud w-44 h-44 text-center">
            
            {/* Draw checkmark circle */}
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center shrink-0">
              <svg className="w-9 h-9 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M5 13l4 4L19 7" 
                  style={{
                    strokeDasharray: 30,
                    strokeDashoffset: 30,
                    animation: 'checkmark-draw 0.4s ease-out 0.1s forwards'
                  }}
                />
              </svg>
            </div>
            
            <div>
              <p className="text-sm font-extrabold tracking-wide">Added to Cart</p>
              <p className="text-[10px] text-gray-300 mt-1 font-medium truncate max-w-[140px]">
                {addedProductToast.qty}x {addedProductToast.name}
              </p>
            </div>

          </div>
        </div>
            )}

    </div>
    </div>
  );

}