import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCategoryImage } from '../data/storefront';
import { 
  ShoppingCart, Clock, 
  Search, Plus, Minus, Trash2, CreditCard, CheckCircle, 
  MapPin, Phone, Mail, ArrowRight, Package, Truck, Store, Wrench, X,
  ShieldCheck, ClipboardCheck
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
  delivery_barangay?: string | null;
  delivery_address?: string | null;
  delivery_landmark?: string | null;
  delivery_instructions?: string | null;
  requested_pickup_date?: string | null;
  requested_pickup_time?: string | null;
  scheduled_pickup_date?: string | null;
  scheduled_pickup_time?: string | null;
  admin_message?: string | null;
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
  barangay: string;
  zone: string;
  surcharge: number | string;
}

export function CustomerDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
const activeTab = searchParams.get('tab') || 'overview';

const navbarProductSearch =
  searchParams.get('search');

const setActiveTab = (tab: string) => {
  setSearchParams({ tab });
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
  const [deliveryRates, setDeliveryRates] = useState<DeliveryRate[]>([]);
  const [deliveryDetails, setDeliveryDetails] = useState({
    contactPerson: '',
    contactNumber: '',
    barangay: '',
    address: '',
    landmark: '',
    instructions: '',
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
    phone_number: parsedUser.phone_number || '',
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
          phone_number: profileUser.phone_number || '',
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
  const deliveryClassRank = { light: 1, standard: 2, bulky: 3 } as const;
  const cartDeliveryLoadClass = cart.reduce<'light' | 'standard' | 'bulky'>((highest, item) => {
    let itemClass = item.product.delivery_class || 'standard';
    const threshold = Number(item.product.bulk_quantity_threshold);
    if (Number.isInteger(threshold) && threshold > 0 && item.quantity >= threshold) {
      itemClass = 'bulky';
    }
    return deliveryClassRank[itemClass] > deliveryClassRank[highest] ? itemClass : highest;
  }, 'light');
  const deliveryBaseFees = { light: 60, standard: 150, bulky: 300 } as const;
  const selectedDeliveryRate = deliveryRates.find(
    (rate) => rate.barangay === deliveryDetails.barangay
  );
  const estimatedDeliveryFee = fulfillment === 'delivery' && selectedDeliveryRate
    ? deliveryBaseFees[cartDeliveryLoadClass] + Number(selectedDeliveryRate.surcharge)
    : 0;
  const shopGoServiceFee = fulfillment === 'shop_go' ? 50 : 0;
  const estimatedGrandTotal = cartTotal + estimatedDeliveryFee + shopGoServiceFee;

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
      !deliveryDetails.barangay ||
      !deliveryDetails.address.trim()
    ) {
      alert('Please complete the contact person, contact number, barangay, and delivery address.');
      return;
    }
    if (!selectedDeliveryRate) {
      alert('Please select an available Initao barangay.');
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
  deliveryBarangay: fulfillment === 'delivery' ? deliveryDetails.barangay : null,
  deliveryAddress: fulfillment === 'delivery' ? deliveryDetails.address : null,
  deliveryLandmark: fulfillment === 'delivery' ? deliveryDetails.landmark : null,
  deliveryInstructions: fulfillment === 'delivery' ? deliveryDetails.instructions : null,
}),
      }
    );

    const orderData =
      await res
        .json()
        .catch(() => ({}));

    if (
      res.status === 401 ||
      res.status === 403
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
      paymongoRes.status === 401 ||
      paymongoRes.status === 403
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
            profileData.phone_number.trim(),

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
      phone_number: savedPhoneNumber || '',
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
    ? sourceProducts.filter((product) => activeCategoryNames.includes(product.category?.trim()))
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
      product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const featuredProducts = availableProducts.slice(0, 12);

  const normalizeCategoryName = (value: string) =>
    value.trim().toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ');

  const featuredCategoryImages: Record<string, string> = {
  tools: '/images/tools_category.png',
  construction: '/images/construction_category.png',
  electrical: '/images/electrical_category.png',
  plumbing: '/images/plumbing_category.png',
};

const getFeaturedCategoryImage = (
  category: string
) => {
  const normalizedCategory =
    normalizeCategoryName(category);

  return (
    featuredCategoryImages[normalizedCategory] ||
    getCategoryImage(category)
  );
};

  const preferredFeaturedCategories = [
  'Tools',
  'Construction',
  'Electrical',
  'Plumbing'
];
  const activeCategoriesOnly = categories.slice(1);
  const preferredMatches = preferredFeaturedCategories
    .map((preferred) =>
      activeCategoriesOnly.find(
        (category) => normalizeCategoryName(category) === normalizeCategoryName(preferred)
      )
    )
    .filter((category): category is string => Boolean(category));

  const shopCategories = preferredMatches;
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

  const paymentDeadline = (order: Order) => {
    const value = order.created_at || order.date;
    const createdAt = new Date(value);
    if (Number.isNaN(createdAt.getTime())) return null;
    return new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
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

      if (response.status === 401 || response.status === 403) {
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

        alert('Payment is already confirmed. Your order is awaiting the existing store workflow.');
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

  const getOrderProgressStatus = (order: Order) => {
    if (order.status === 'awaiting_payment') {
  return 'pending';
}
    if (['failed_delivery', 'deactivated'].includes(order.status)) {
      return order.previous_status || 'pending';
    }
    return order.status;
  };

  const getProductImage = (product: Product) => {
    if (product.image && (product.image.startsWith('/') || product.image.startsWith('http') || product.image.startsWith('data:'))) {
      return (
  <img
    src={product.image}
    alt={product.name}
    className="h-full max-h-[190px] w-full max-w-[92%] object-contain mx-auto transition-transform duration-300 group-hover:scale-105"
  />
);
    }
    // Fallback emoji
    const emojiMap: Record<string, string> = {
      'Construction': '🧱',
      'Paint': '🎨',
      'Plumbing': '🚰',
      'Fasteners': '🔩',
      'Tools': '🔧',
      'Electrical': '💡'
    };
    return <span className="text-5xl">{emojiMap[product.category] || '📦'}</span>;
  };

  const displayPriceUnit = (product: Product) => {
    if (product.name.toLowerCase().includes('nails')) {
      return ' / kg';
    }
    return '';
  };

  return (
  <div className="min-h-screen w-full overflow-x-clip">
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-10 px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      
      {/* ========================================================
          TAB 1: OVERVIEW (HOME)
          ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-10 animate-fade-up">
          
          {/* Customer-first hero — seamless full-width Storefront treatment */}
<section
  id="customer-home-top"
  className="relative isolate left-1/2 -mt-6 w-screen -translate-x-1/2 overflow-hidden bg-[#eef7f0]"
>
  {/* Base Storefront background */}
  <div
    className="absolute inset-0 -z-20 bg-[linear-gradient(105deg,#f7fbf7_0%,#edf7ef_45%,#dcefdc_100%)]"
    aria-hidden
  />

  {/* Same finalized artwork used by the Storefront */}
  <img
    src="/images/rayjin-storefront-hero.png"
    alt="Rayjin Hardware construction and hardware products"
    className="absolute inset-0 -z-10 hidden h-full w-full object-cover object-center lg:block"
  />

  {/* Readability fade — blends text area into the product artwork */}
  <div
    className="absolute inset-0 -z-[5] hidden bg-[linear-gradient(90deg,rgba(247,251,247,0.99)_0%,rgba(247,251,247,0.97)_32%,rgba(247,251,247,0.78)_50%,rgba(247,251,247,0.24)_70%,rgba(247,251,247,0)_100%)] lg:block"
    aria-hidden
  />

  {/* Inner alignment container — content stays aligned with the rest of the site */}
  <div className="relative mx-auto min-h-[540px] max-w-7xl px-4 sm:px-6 lg:px-8">
    <div className="flex min-h-[540px] items-center py-12 lg:py-14">
      <div className="w-full max-w-2xl lg:max-w-[48%]">

        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#15803d] shadow-sm backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Rayjin Hardware Online Store
        </div>

        <p className="mt-5 text-sm font-semibold text-[#15803d]">
          Welcome back, {customerDisplayName}!
        </p>

        <h1 className="mt-2 max-w-xl font-display text-4xl font-extrabold leading-[1.04] tracking-tight text-[#123c2d] sm:text-5xl lg:text-[3.65rem]">
          Everything you need
          <span className="block text-[#16a34a]">
            to build better.
          </span>
        </h1>

        <p className="mt-5 max-w-xl text-sm leading-7 text-[#4f675d] sm:text-base">
          Browse reliable Rayjin Hardware supplies, place your order online,
          and choose convenient store pickup or local delivery.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#15803d] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-[#166534] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Browse Products
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white/85 px-5 py-3 text-sm font-extrabold text-[#166534] shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <Package className="h-4 w-4" />
            Track My Orders
          </button>
        </div>

        <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-bold text-[#4f675d]">
          <span className="inline-flex items-center gap-1.5">
            <Package className="h-4 w-4 text-[#16a34a]" />
            Live inventory
          </span>

          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[#16a34a]" />
            Secure checkout
          </span>

          <span className="inline-flex items-center gap-1.5">
            <Truck className="h-4 w-4 text-[#16a34a]" />
            Pickup or delivery
          </span>
        </div>

        {/* Mobile/tablet artwork — same responsive behavior as the Storefront */}
        <div className="mt-8 overflow-hidden rounded-3xl border border-[#dce9df] bg-white shadow-[0_24px_55px_-36px_rgba(11,59,35,0.62)] lg:hidden">
          <img
            src="/images/rayjin-storefront-hero.png"
            alt="Rayjin Hardware product assortment"
            className="h-72 w-full object-cover object-[72%_center] sm:h-80"
          />
        </div>

      </div>
    </div>
    

    {/* Customer reassurance callout */}
    <div className="pointer-events-none absolute bottom-6 right-4 hidden max-w-[250px] rounded-2xl border border-white/80 bg-white/90 p-4 shadow-xl shadow-emerald-950/10 backdrop-blur-md sm:right-6 lg:right-8 lg:block">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#15803d]">
          <ShieldCheck className="h-5 w-5" />
        </span>

        <div>
          <p className="text-xs font-extrabold text-[#17372d]">
            Local hardware, easier ordering
          </p>

          <p className="mt-1 text-[10px] leading-relaxed text-[#61766d]">
            Check stock, place orders, and monitor progress from one account.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>
          {/* Customer services */}
          <section aria-labelledby="customer-services-title">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">Simple from cart to completion</p>
                <h2 id="customer-services-title" className="mt-1 font-display text-xl font-extrabold text-[#17372d]">Shop with confidence</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { title: 'Shop Online', text: 'Browse available products and build your order from live inventory.', icon: <ShoppingCart className="h-5 w-5" /> },
                { title: 'Pickup or Delivery', text: 'Choose counter pickup or delivery within supported Initao areas.', icon: <Truck className="h-5 w-5" /> },
                { title: 'Order Approval', text: 'Rayjin Hardware reviews and confirms each customer order.', icon: <ClipboardCheck className="h-5 w-5" /> },
                { title: 'Track Your Order', text: 'Follow payment and fulfillment updates in My Orders.', icon: <Clock className="h-5 w-5" /> },
              ].map((service) => (
                <article key={service.title} className="group rounded-2xl border border-[#dfe9e2] bg-white p-5 shadow-[0_10px_30px_-24px_rgba(11,59,35,0.65)] transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_18px_35px_-24px_rgba(11,59,35,0.55)]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf6ef] text-[#15803d] transition group-hover:bg-[#15803d] group-hover:text-white">
                    {service.icon}
                  </span>
                  <h3 className="mt-4 text-sm font-extrabold text-[#17372d]">{service.title}</h3>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-[#61766d]">{service.text}</p>
                </article>
              ))}
            </div>
          </section>

          {/* Shop by Categories — four featured shortcuts into the existing catalog */}
          {!productsLoading &&
  !productsError &&
  shopCategories.length > 0 && (
            <section id="customer-categories" aria-labelledby="shop-categories-title" className="scroll-mt-24 rounded-3xl border border-[#e2ebe5] bg-white p-6 shadow-sm sm:p-7">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">Find what you need faster</p>
                <h2 id="shop-categories-title" className="mt-1 font-display text-2xl font-extrabold text-[#17372d]">Shop by Categories</h2>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-[#61766d]">
                  Start with a featured category, or browse the full product catalog and use the existing category filters.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {shopCategories.map((category) => {
                  const categoryCount = availableProducts.filter((product) => product.category === category).length;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => { setSelectedCategory(category); setActiveTab('catalog'); }}
                      className="group overflow-hidden rounded-3xl border border-[#e3ece6] bg-white text-left shadow-[0_14px_32px_-24px_rgba(11,59,35,0.62)] transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-300 hover:shadow-[0_24px_42px_-26px_rgba(11,59,35,0.52)]"
                    >
                     <span className="relative flex h-56 items-center justify-center overflow-hidden bg-[#f5f8f6] sm:h-60">
  <img
    src={getFeaturedCategoryImage(category)}
    alt={`${category} category`}
    className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-[1.025]"
  />

  <span className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/10 to-transparent" />
</span>
                      <span className="block border-t border-[#edf2ee] bg-white p-4">
  <span className="block text-sm font-extrabold uppercase tracking-wide text-[#17372d]">
    {category}
  </span>

  <span className="mt-1 block text-[11px] text-[#61766d]">
    {categoryCount} available product
    {categoryCount === 1 ? '' : 's'}
  </span>

  <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-extrabold text-[#15803d]">
    Explore category
    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
  </span>
</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => { setSelectedCategory('All'); setActiveTab('catalog'); }}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-extrabold text-[#15803d] transition hover:border-emerald-300 hover:bg-emerald-100"
                >
                  Browse Categories <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </section>
          )}

{/* Shop & Go — promotional section; checkout logic remains unchanged */}
<section
  aria-labelledby="customer-shop-go-title"
  className="overflow-hidden rounded-[2rem] border border-emerald-900/10 bg-[#073c25] shadow-[0_22px_50px_-30px_rgba(5,46,22,0.72)]"
>
  <div className="grid lg:grid-cols-[0.92fr_1.08fr]">
    
    {/* Shop & Go Information */}
    <div className="relative flex flex-col justify-center overflow-hidden px-7 py-9 text-white sm:px-9 lg:px-10 lg:py-10">
      <div
        className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-white/10 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-emerald-200">
          <Store className="h-3.5 w-3.5" />
          Shop &amp; Go · Express Pickup
        </div>

        <h2
          id="customer-shop-go-title"
          className="mt-4 max-w-lg font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-[2rem]"
        >
          Order ahead. Pick up faster.
        </h2>

        <p className="mt-3 max-w-xl text-xs leading-6 text-emerald-50/80">
          Add your products to cart and choose Shop &amp; Go
          during checkout. Select your preferred pickup schedule,
          then track your order until it is ready for collection.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-[9px] font-bold text-emerald-100">
          {[
            'Order Online',
            'Choose Shop & Go',
            'Confirm Pickup',
            'Pick Up',
          ].map((step, index) => (
            <React.Fragment key={step}>
              {index > 0 && (
                <ArrowRight className="h-3 w-3 text-emerald-300" />
              )}

              <span className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5">
                {step}
              </span>
            </React.Fragment>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedCategory('All');
            setActiveTab('catalog');
          }}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-xs font-extrabold text-emerald-950 shadow-lg shadow-black/15 transition-all hover:-translate-y-0.5 hover:bg-emerald-300 active:scale-[0.98]"
        >
          Browse Products
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    {/* Shop & Go Promotional Image */}
    <div className="relative min-h-[300px] overflow-hidden sm:min-h-[350px] lg:min-h-[380px]">
      <img
        src="/images/shop_go_promo.png"
        alt="Rayjin Hardware Shop and Go express pickup service"
        className="absolute inset-0 h-full w-full object-cover object-right"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#073c25]/20 via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#073c25]/45 lg:via-transparent lg:to-transparent" />
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
                      className="relative flex h-56 cursor-pointer items-center justify-center overflow-hidden border-b border-[#edf2ee] bg-gradient-to-br from-[#f8faf8] to-[#eef7f1] p-3"
                    >
                      {getProductImage(product)}
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
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight font-display">Hardware Catalog</h2>
              <p className="text-xs text-gray-500 mt-0.5">Select tools and construction materials from live inventory.</p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Search products, categories, or brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#15803d] transition-all bg-white"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 pb-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all active:scale-95 ${
                  selectedCategory === cat 
                    ? 'bg-[#15803d] text-white shadow-md' 
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
                  <div 
                    onClick={() => { setSelectedProductDetails(product); setDetailsQuantity(1); }}
                    className="relative flex h-52 cursor-pointer items-center justify-center overflow-hidden border-b border-gray-100 bg-gradient-to-br from-gray-50 to-emerald-50/40 p-3"
                  >
                    {getProductImage(product)}
                    <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider bg-gray-200/80 px-2.5 py-0.5 rounded text-gray-700">
                      {product.brand}
                    </span>
                  </div>

                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <div 
                      onClick={() => { setSelectedProductDetails(product); setDetailsQuantity(1); }}
                      className="cursor-pointer"
                    >
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">{product.category}</span>
                      <h4 className="font-bold text-gray-800 text-sm mt-0.5">{product.name}</h4>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mt-2 inline-block">
                        {product.stock} {product.unit} available
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-5 pt-3 border-t border-gray-50">
                      <span className="text-base font-extrabold text-gray-950 font-display">₱{Number(product.price).toFixed(2)}{displayPriceUnit(product)}</span>
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="px-3.5 py-2 bg-[#15803d] hover:bg-[#166534] text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5"
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
        <div className="space-y-6 animate-fade-up">
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight font-display border-b border-gray-100 pb-3">
            Your Shopping Cart
          </h2>
          
          {cart.length === 0 ? (
            <div className="text-center py-20 bg-white border border-gray-100 rounded-3xl shadow-sm">
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Cart Items List */}
              <div className="lg:col-span-8 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                {cart.map(item => (
                  <div key={item.product.id} className="flex gap-4 items-center border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                    <div className="w-16 h-16 shrink-0 bg-gray-50 rounded-xl flex items-center justify-center text-3xl border border-gray-100">
                      {getProductImage(item.product)}
                    </div>

                    <div className="flex-grow min-w-0">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{item.product.brand}</span>
                      <h4 className="text-xs md:text-sm font-bold text-gray-800 truncate leading-snug">{item.product.name}</h4>
                      <span className="text-xs text-gray-500 font-medium block mt-0.5">₱{Number(item.product.price).toFixed(2)}{displayPriceUnit(item.product)} / unit</span>
                    </div>

                    {/* Quantity Operations */}
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-1">
                      <button 
                        onClick={() => handleUpdateQuantity(item.product.id, -1)}
                        className="w-6 h-6 flex items-center justify-center hover:bg-gray-50 text-gray-600 rounded transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-gray-800 w-6 text-center select-none">{item.quantity}</span>
                      <button 
                        onClick={() => handleUpdateQuantity(item.product.id, 1)}
                        className="w-6 h-6 flex items-center justify-center hover:bg-gray-50 text-gray-600 rounded transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Total and Remove */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-950 font-display">₱{(Number(item.product.price) * item.quantity).toFixed(2)}</p>
                      <button
                        onClick={() => handleRemoveFromCart(item.product.id)}
                        className="text-[10px] text-red-500 hover:text-red-600 font-semibold mt-1 inline-flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Checkout Panel */}
              <div className="lg:col-span-4">
                <form onSubmit={handleCheckout} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-5">
                  
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

                  <h3 className="text-sm font-extrabold text-gray-950 tracking-wide uppercase border-b border-gray-100 pb-2">
                    Checkout Summary
                  </h3>

                 {/* Fulfillment Selection */}
<div>

  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
    How would you like to receive your order?
  </label>

  <div className="grid grid-cols-1 gap-2">

    {/* STANDARD PICKUP */}
    <button
      type="button"
      onClick={() => setFulfillment('pickup')}
      className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition-all ${
        fulfillment === 'pickup'
          ? 'border-[#15803d] bg-emerald-50/50 text-[#15803d] ring-1 ring-[#15803d]/10'
          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2">
        <Store className="w-4 h-4 shrink-0" />

        <span className="text-[10px] font-bold">
          Standard Pickup
        </span>
      </div>

      <span className="text-[9px] font-medium leading-relaxed opacity-75">
        Pick up your order at the Rayjin Hardware counter.
        No preferred schedule required.
      </span>
    </button>


    {/* SHOP & GO */}
    <button
      type="button"
      onClick={() => setFulfillment('shop_go')}
      className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition-all ${
        fulfillment === 'shop_go'
          ? 'border-[#15803d] bg-emerald-50/50 text-[#15803d] ring-1 ring-[#15803d]/10'
          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 shrink-0" />
        <span className="text-[10px] font-bold">
          Shop &amp; Go
        </span>
      </div>
      <span className="text-[9px] font-medium leading-relaxed opacity-75">
        Express pickup with your preferred date and time. A ₱50 fulfillment fee applies.
      </span>
    </button>

    {/* DELIVERY */}
    <button
      type="button"
      onClick={() => setFulfillment('delivery')}
      className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition-all ${
        fulfillment === 'delivery'
          ? 'border-[#15803d] bg-emerald-50/50 text-[#15803d] ring-1 ring-[#15803d]/10'
          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
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
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Payment Method</label>
                    <div className="space-y-2">
                      {/* GCash */}
                      <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none ${
                        paymentMethod === 'gcash'
                          ? 'border-[#15803d] bg-emerald-50/60 ring-1 ring-[#15803d]/20'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}>
                        <input 
                          type="radio" 
                          name="payment"
                          checked={paymentMethod === 'gcash'}
                          onChange={() => setPaymentMethod('gcash')}
                          className="text-[#15803d] focus:ring-[#15803d]" 
                        />
                        <div className="flex-grow">
                          <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                            <span className="text-blue-500">G</span>Cash
                            <span className="text-[9px] font-extrabold text-[#15803d] bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider border border-emerald-100">PayMongo</span>
                          </span>
                          <span className="text-[9px] text-gray-400 block font-medium mt-0.5">GCash e-wallet · redirects to PayMongo checkout</span>
                        </div>
                        {paymentMethod === 'gcash' && (
                          <span className="text-[8px] font-bold text-[#15803d] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">Selected</span>
                        )}
                      </label>

                      {/* Card */}
                      <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none ${
                        paymentMethod === 'card'
                          ? 'border-[#15803d] bg-emerald-50/60 ring-1 ring-[#15803d]/20'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}>
                        <input 
                          type="radio" 
                          name="payment"
                          checked={paymentMethod === 'card'}
                          onChange={() => setPaymentMethod('card')}
                          className="text-[#15803d] focus:ring-[#15803d]" 
                        />
                        <div className="flex-grow">
                          <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-gray-500" /> Credit / Debit Card
                            <span className="text-[9px] font-extrabold text-[#15803d] bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider border border-emerald-100">PayMongo</span>
                          </span>
                          <span className="text-[9px] text-gray-400 block font-medium mt-0.5">Visa, Mastercard, JCB · redirects to PayMongo checkout</span>
                        </div>
                        {paymentMethod === 'card' && (
                          <span className="text-[8px] font-bold text-[#15803d] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">Selected</span>
                        )}
                      </label>

                      {/* Cash */}
                      <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none ${
                        paymentMethod === 'cash'
                          ? 'border-gray-400 bg-gray-50 ring-1 ring-gray-200'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}>
                        <input 
                          type="radio" 
                          name="payment"
                          checked={paymentMethod === 'cash'}
                          onChange={() => setPaymentMethod('cash')}
                          className="text-[#15803d] focus:ring-[#15803d]" 
                        />
                        <div className="flex-grow">
                          <span className="text-xs font-bold text-gray-800 block">Cash on Hand</span>
                          <span className="text-[9px] text-gray-400 block font-medium mt-0.5">Pay in store or upon doorstep delivery</span>
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
                    <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 animate-fade-in space-y-3">
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
                            className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white outline-none focus:border-[#15803d]"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Preferred time</label>
                          <input
                            type="time"
                            value={shopGoPickup.time}
                            onChange={(event) => setShopGoPickup({ ...shopGoPickup, time: event.target.value })}
                            className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white outline-none focus:border-[#15803d]"
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
                    <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 animate-fade-in space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Delivery details</span>
                        <p className="text-[9px] text-emerald-700 mt-1">Delivery is available within Initao, Misamis Oriental. Minimum product subtotal: ₱400.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={deliveryDetails.contactPerson}
                          onChange={(event) => setDeliveryDetails({ ...deliveryDetails, contactPerson: event.target.value })}
                          placeholder="Contact person *"
                          className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white outline-none focus:border-[#15803d]"
                        />
                        <input
                          type="tel"
                          value={deliveryDetails.contactNumber}
                          onChange={(event) => setDeliveryDetails({ ...deliveryDetails, contactNumber: event.target.value })}
                          placeholder="Contact number *"
                          className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white outline-none focus:border-[#15803d]"
                        />
                      </div>
                      <select
                        value={deliveryDetails.barangay}
                        onChange={(event) => setDeliveryDetails({ ...deliveryDetails, barangay: event.target.value })}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white outline-none focus:border-[#15803d]"
                      >
                        <option value="">Select Initao barangay *</option>
                        {deliveryRates.map((rate) => (
                          <option key={rate.barangay} value={rate.barangay}>{rate.barangay}</option>
                        ))}
                      </select>
                      <textarea
                        value={deliveryDetails.address}
                        onChange={(event) => setDeliveryDetails({ ...deliveryDetails, address: event.target.value })}
                        placeholder="Complete delivery address *"
                        rows={2}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white outline-none focus:border-[#15803d] resize-none"
                      />
                      <input
                        type="text"
                        value={deliveryDetails.landmark}
                        onChange={(event) => setDeliveryDetails({ ...deliveryDetails, landmark: event.target.value })}
                        placeholder="Nearby area / landmark (optional)"
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white outline-none focus:border-[#15803d]"
                      />
                      <textarea
                        value={deliveryDetails.instructions}
                        onChange={(event) => setDeliveryDetails({ ...deliveryDetails, instructions: event.target.value })}
                        placeholder="Delivery instructions (optional)"
                        rows={2}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white outline-none focus:border-[#15803d] resize-none"
                      />
                      <div className="rounded-lg bg-white border border-emerald-100 px-3 py-2 text-[10px] text-emerald-800">
                        Estimated {cartDeliveryLoadClass} load fee: <strong>₱{estimatedDeliveryFee.toFixed(2)}</strong>
                      </div>
                    </div>
                  )}

                  {/* Price Calculations */}
                  <div className="border-t border-gray-100 pt-4 space-y-2 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-bold text-gray-800">₱{cartTotal.toFixed(2)}</span>
                    </div>
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
                    className="w-full py-3 bg-[#15803d] hover:bg-[#166534] text-white font-bold rounded-xl shadow-lg shadow-emerald-800/10 hover:-translate-y-0.5 active:scale-95 duration-100 transform text-xs tracking-wider uppercase flex items-center justify-center gap-2"
                  >
                    {paymentMethod === 'cash' ? (
                      'Confirm Order'
                    ) : (
                      <>
                        🔒 Pay with {paymentMethod === 'gcash' ? 'GCash' : 'Card'} via PayMongo
                      </>
                    )}
                  </button>
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
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight font-display border-b border-gray-100 pb-3">Your Orders</h2>
            <p className="text-xs text-gray-500 mt-1">Track active orders or view transaction records.</p>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500">You have no order records.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
                  
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
                          {order.fulfillment.replace('_', ' ')}
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

                    <div className="flex items-center gap-3">
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

                  {canContinueOnlinePayment(order) && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-xs text-amber-950">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="space-y-1">
                          <span className="block text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
                            Payment Pending
                          </span>
                          <p className="font-semibold">
                            Your payment has not been completed yet. You can continue using the existing PayMongo payment session while it remains valid.
                          </p>
                          <p className="text-[11px] text-amber-800">
                            Please complete your online payment within 24 hours. Unpaid orders may be cancelled after 24 hours.
                          </p>
                          {paymentDeadline(order) && (
                            <p className="text-[10px] text-amber-700">
                              Payment policy deadline: {formatOrderDateTime(paymentDeadline(order)?.toISOString())}
                              {paymentDeadline(order)!.getTime() <= Date.now()
                                ? ' · The 24-hour period has passed; the Admin may cancel this unpaid order.'
                                : ''}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleContinuePayment(order)}
                          disabled={continuingPaymentOrderId === order.id}
                          className="shrink-0 rounded-xl bg-[#15803d] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {continuingPaymentOrderId === order.id ? 'Checking Payment…' : 'Continue Payment'}
                        </button>
                      </div>
                    </div>
                  )}

                  {(Number(order.service_fee || 0) > 0 || Number(order.delivery_fee || 0) > 0) && (
                    <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-[10px] text-gray-600">
                      <span>Product subtotal: <strong>₱{Number(order.total).toFixed(2)}</strong></span>
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
                          {order.scheduled_pickup_date
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
                      <p>{[order.delivery_barangay, order.delivery_address].filter(Boolean).join(' — ') || 'Address not available'}</p>
                      {order.delivery_landmark && <p>Landmark: {order.delivery_landmark}</p>}
                      {order.delivery_instructions && <p>Instructions: {order.delivery_instructions}</p>}
                    </div>
                  )}

                  {order.admin_message && (
                    <div className={`rounded-xl border px-4 py-3 text-xs ${
                      ['failed_delivery', 'deactivated', 'cancelled', 'rejected'].includes(order.status)
                        ? 'bg-red-50 border-red-100 text-red-800'
                        : 'bg-blue-50 border-blue-100 text-blue-800'
                    }`}>
                      <span className="block text-[9px] font-bold uppercase tracking-wider mb-1">Message from Rayjin Hardware</span>
                      {order.admin_message}
                    </div>
                  )}

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
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 5: MY PROFILE
          ======================================================== */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm animate-fade-up space-y-6">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight font-display border-b border-gray-100 pb-3">Account Profile</h2>
            <p className="text-xs text-gray-500 mt-1">Review and update your contact details and default address.</p>
          </div>

          {profileStatus === 'saved' && (
            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl flex items-center gap-3 border border-emerald-100 animate-fade-in text-xs font-semibold">
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
              Profile saved successfully.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">First Name</label>
              <input 
                type="text" 
                value={profileData.first_name}
                onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                readOnly={!isProfileEditing}
                aria-readonly={!isProfileEditing}
                className={`w-full px-4 py-3 rounded-xl border outline-none transition-all text-xs font-medium ${isProfileEditing ? 'border-emerald-300 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-[#15803d]' : 'border-gray-200 bg-gray-50 text-gray-700 cursor-default'}`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Last Name</label>
              <input 
                type="text" 
                value={profileData.last_name}
                onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                readOnly={!isProfileEditing}
                aria-readonly={!isProfileEditing}
                className={`w-full px-4 py-3 rounded-xl border outline-none transition-all text-xs font-medium ${isProfileEditing ? 'border-emerald-300 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-[#15803d]' : 'border-gray-200 bg-gray-50 text-gray-700 cursor-default'}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="email" 
                  value={profileData.email}
                  disabled
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-400 select-none outline-none cursor-not-allowed text-xs font-medium"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="tel" 
                  value={profileData.phone_number}
                  onChange={(e) => setProfileData({ ...profileData, phone_number: e.target.value })}
                  readOnly={!isProfileEditing}
                  aria-readonly={!isProfileEditing}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all text-xs font-medium ${isProfileEditing ? 'border-emerald-300 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-[#15803d]' : 'border-gray-200 bg-gray-50 text-gray-700 cursor-default'}`}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Address</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-gray-400" />
              <textarea 
                value={profileData.address}
                onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                rows={3}
                readOnly={!isProfileEditing}
                aria-readonly={!isProfileEditing}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all resize-none text-xs font-medium ${isProfileEditing ? 'border-emerald-300 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-[#15803d]' : 'border-gray-200 bg-gray-50 text-gray-700 cursor-default'}`}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-gray-50">
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
              className="px-6 py-3 bg-[#15803d] hover:bg-[#166534] text-white font-bold rounded-xl shadow-lg shadow-emerald-800/10 active:scale-95 transition-all text-xs uppercase tracking-wider"
            >
              {isProfileEditing ? 'Save Profile' : 'Edit Profile Settings'}
            </button>
          </div>
        </form>
      )}



      {/* ========================================================
          CUSTOMER DASHBOARD FOOTER
          Same design language as Storefront; authenticated links only.
          Header logo and footer logo intentionally have different behavior.
          ======================================================== */}
      <footer className="relative left-1/2 -mb-16 mt-4 w-screen -translate-x-1/2 overflow-hidden bg-navy-900 text-navy-200">
        <div className="dot-pattern absolute inset-0 opacity-40" aria-hidden />

        <div className="relative mx-auto max-w-7xl px-5 py-14 md:px-8">
          <div className="grid gap-10 md:grid-cols-12">
            {/* Brand — footer logo intentionally opens the Capstone/System Presentation */}
            <div className="md:col-span-4">
              <a
                href="/project"
                className="group inline-flex items-center gap-2.5 text-white"
                aria-label="Open Rayjin Hardware system presentation"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-construction-500 text-navy-950 transition-transform group-hover:scale-105">
                  <Wrench className="h-5 w-5" strokeWidth={2.5} />
                </span>
                <span className="flex flex-col leading-none">
                  <span className="font-display text-base font-extrabold tracking-wide">RAYJIN</span>
                  <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-navy-300">Hardware</span>
                </span>
              </a>

              <p className="mt-4 max-w-sm text-sm leading-relaxed text-navy-300">
                Browse current hardware products, check live availability, and manage your orders for store pickup, local delivery, or Shop &amp; Go.
              </p>

              <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-navy-100">
                <Store className="h-3.5 w-3.5" />
                Online ordering with live inventory visibility
              </div>
            </div>

            {/* Explore — Storefront-style information architecture */}
            <div className="md:col-span-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-construction-300">Explore</h4>
              <div className="mt-4 flex flex-col gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="w-fit text-left text-navy-200 transition-colors hover:text-white"
                >
                  Home
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('overview');
                    window.setTimeout(() => {
                      document.getElementById('customer-categories')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  }}
                  className="w-fit text-left text-navy-200 transition-colors hover:text-white"
                >
                  Categories
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('All');
                    setActiveTab('catalog');
                  }}
                  className="w-fit text-left text-navy-200 transition-colors hover:text-white"
                >
                  Products
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('overview');
                    window.setTimeout(() => {
                      document.getElementById('customer-how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  }}
                  className="w-fit text-left text-navy-200 transition-colors hover:text-white"
                >
                  How It Works
                </button>
              </div>
            </div>

            {/* Logged-in customer links — no guest-only Login/Register here */}
            <div className="md:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-construction-300">Customer Account</h4>
              <div className="mt-4 flex flex-col gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setActiveTab('cart')}
                  className="w-fit text-left text-navy-200 transition-colors hover:text-white"
                >
                  Cart
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="w-fit text-left text-navy-200 transition-colors hover:text-white"
                >
                  My Orders
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="w-fit text-left text-navy-200 transition-colors hover:text-white"
                >
                  Profile
                </button>
              </div>
            </div>

            {/* Same contact-information treatment as the Storefront */}
            <div className="md:col-span-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-construction-300">Contact Us At</h4>
              <div className="mt-4 space-y-3 text-sm text-navy-200">
                <a
                  href="mailto:rayjinhardwarechavez@gmail.com"
                  className="flex items-start gap-2 transition-colors hover:text-white"
                >
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-construction-300" />
                  <span className="break-all">rayjinhardwarechavez@gmail.com</span>
                </a>

                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-construction-300" />
                  <span>Initao, Misamis Oriental</span>
                </p>

                <a
                  href="tel:09353150849"
                  className="flex items-start gap-2 transition-colors hover:text-white"
                >
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-construction-300" />
                  <span>0935 315 0849</span>
                </a>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
            <p className="text-xs text-navy-300">© {new Date().getFullYear()} Rayjin Hardware. All rights reserved.</p>

            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
            >
              Back to top
              <ArrowRight className="h-3.5 w-3.5 -rotate-90" />
            </button>
          </div>
        </div>
      </footer>

      {/* ========================================================
          PRODUCT DETAILS MODAL
          ======================================================== */}
      {selectedProductDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-lg w-full border border-gray-100 animate-scale-up relative">
            
            {/* Close Button */}
            <button 
              onClick={() => setSelectedProductDetails(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6 md:p-8 space-y-6">
              {/* Product Header / Image Showcase */}
              <div className="bg-gray-50/50 rounded-2xl p-8 flex items-center justify-center border border-gray-100 h-56 relative">
                {getProductImage(selectedProductDetails)}
                <span className="absolute top-3 left-3 text-[10px] font-extrabold uppercase tracking-widest bg-[#15803d]/10 text-[#15803d] px-3 py-1 rounded-full">
                  {selectedProductDetails.brand}
                </span>
                <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-gray-200/80 px-2.5 py-1 rounded text-gray-700">
                  {selectedProductDetails.category}
                </span>
              </div>

              {/* Title & Info */}
<div className="space-y-2">
  <h3 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight font-display">
    {selectedProductDetails.name}
  </h3>

  <div className="flex items-center gap-3">
    <span className="text-2xl font-extrabold text-[#15803d] font-display">
      ₱{Number(selectedProductDetails.price).toFixed(2)}
    </span>

    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
      selectedProductDetails.stock > 10 
        ? 'bg-emerald-50 text-emerald-700' 
        : selectedProductDetails.stock > 0 
        ? 'bg-amber-50 text-amber-700' 
        : 'bg-red-50 text-red-700'
    }`}>
      {selectedProductDetails.stock > 10 
        ? `In Stock (${selectedProductDetails.stock} ${selectedProductDetails.unit} available)` 
        : selectedProductDetails.stock > 0 
        ? `Low Stock (${selectedProductDetails.stock} ${selectedProductDetails.unit} left!)` 
        : 'Out of Stock'}
    </span>
  </div>
</div>

{/* Product Description / Details */}
<div className="text-xs text-gray-500 leading-relaxed border-t border-b border-gray-100 py-4 space-y-3">
  <p>
    {selectedProductDetails.description?.trim() || 'No product description provided.'}
  </p>

  <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-gray-600">
    <div>• Category: {selectedProductDetails.category}</div>
    <div>• Brand: {selectedProductDetails.brand}</div>
    <div>
      • Unit of Measurement: {selectedProductDetails.unit?.trim() || 'Not specified'}
    </div>
    <div>• Status: Active Catalog Item</div>
  </div>
</div>

              {/* Quantity Selector & Add Button */}
              {selectedProductDetails.stock > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 bg-gray-100 border border-gray-200 rounded-xl p-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setDetailsQuantity(q => Math.max(1, q - 1))}
                      className="w-8 h-8 bg-white border border-gray-200 text-gray-800 rounded-lg flex items-center justify-center text-sm font-bold active:scale-90 hover:bg-gray-50 transition-all shadow-sm"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-extrabold text-gray-900 w-6 text-center select-none">
                      {detailsQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDetailsQuantity(q => Math.min(selectedProductDetails.stock, q + 1))}
                      className="w-8 h-8 bg-white border border-gray-200 text-gray-800 rounded-lg flex items-center justify-center text-sm font-bold active:scale-90 hover:bg-gray-50 transition-all shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      // Custom add function with selected quantity
                      const existing = cart.find(item => item.product.id === selectedProductDetails.id);
                      const newQty = existing ? existing.quantity + detailsQuantity : detailsQuantity;
                      const finalQty = Math.min(selectedProductDetails.stock, newQty);
                      
                      if (existing) {
                        saveCart(cart.map(item => 
                          item.product.id === selectedProductDetails.id 
                            ? { ...item, quantity: finalQty }
                            : item
                        ));
                      } else {
                        saveCart([...cart, { product: selectedProductDetails, quantity: finalQty }]);
                      }
                      
                      setAddedProductToast({ name: selectedProductDetails.name, qty: detailsQuantity });
                      setSelectedProductDetails(null);
                    }}
                    className="flex-grow py-3 bg-[#15803d] hover:bg-[#166534] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-wider"
                  >
                    <ShoppingCart className="w-4 h-4" /> Add to Cart — ₱{(Number(selectedProductDetails.price) * detailsQuantity).toFixed(2)}
                  </button>
                </div>
              ) : (
                <button
                  disabled
                  className="w-full py-3 bg-gray-100 border border-gray-200 text-gray-400 text-xs font-bold rounded-xl cursor-not-allowed uppercase tracking-wider text-center"
                >
                  Sold Out
                </button>
              )}

            </div>
          </div>
        </div>
      )}

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
