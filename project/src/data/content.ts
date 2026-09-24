import {
  ShoppingCart, Package, BarChart3, Smartphone, Brain,
  HeartPulse, Receipt, Boxes, Bell, ShieldCheck,
  User, Search, ShoppingBag, Eye, CreditCard, Truck, Store,
  LayoutDashboard, FolderTree, Truck as Supplier, Users, ClipboardList,
  ScanBarcode, Tag, Warehouse, PackageCheck, PackageX, AlertTriangle,
  FileText, TrendingUp, ArrowLeftRight, LogIn, UserPlus, KeyRound,
  MapPin, Clock, Wallet, Activity, Layers, Database,
} from 'lucide-react';

export type Feature = {
  icon: typeof User;
  title: string;
  desc: string;
};

export type FeatureGroup = {
  group: string;
  icon: typeof User;
  features: Feature[];
};

export const overviewStats = [
  { icon: Layers, value: '2', label: 'User Roles', sub: 'Customer & Admin' },
  { icon: ShoppingCart, value: '40+', label: 'System Features', sub: 'End-to-end coverage' },
  { icon: Database, value: '15+', label: 'Database Tables', sub: 'Relational schema' },
  { icon: ShieldCheck, value: '100%', label: 'Automated Sync', sub: 'Inventory & sales' },
];

export const objectives = [
  {
    icon: ShoppingCart,
    title: 'Streamline Operations',
    text: 'Replace time-consuming manual ordering, sales, and inventory tracking with a single integrated platform for both customers and staff.',
  },
  {
    icon: Brain,
    title: 'Enable Informed Decisions',
    text: 'Generate real-time sales, inventory, and stock movement reports so owners can act on accurate business data instead of guesswork.',
  },
  {
    icon: CreditCard,
    title: 'Modernize Payments',
    text: 'Accept secure online payments through PayMongo and provide flexible fulfillment: pickup, delivery, and Shop & Go options.',
  },
  {
    icon: Boxes,
    title: 'Protect Inventory Integrity',
    text: 'Automatically deduct stock on every sale, record every movement, and surface low-stock warnings before shelves run empty.',
  },
];

export const pillars = [
  { icon: ShoppingCart, title: 'Online Ordering', text: 'Browse, search, and checkout with PayMongo for pickup, delivery, or Shop & Go.' },
  { icon: Receipt, title: 'Point of Sale', text: 'Barcode scanning and manual entry for fast, accurate walk-in transactions.' },
  { icon: Boxes, title: 'Inventory Control', text: 'Stock receiving, stock-out recording, low-stock monitoring, and full movement history.' },
  { icon: BarChart3, title: 'Reports & Analytics', text: 'Sales, inventory, and stock movement reports for confident decision-making.' },
];

export const customerFeatures: FeatureGroup[] = [
  {
    group: 'Account & Access',
    icon: User,
    features: [
      { icon: UserPlus, title: 'User Registration', desc: 'Customers create accounts with email and password to begin ordering online.' },
      { icon: LogIn, title: 'Secure Login', desc: 'Authenticated access to cart, orders, tracking, and profile features.' },
      { icon: KeyRound, title: 'Forgot Password', desc: 'Email-based password reset lets customers recover access securely.' },
      { icon: User, title: 'Profile Management', desc: 'Update contact details, delivery address, and account information.' },
    ],
  },
  {
    group: 'Catalog & Shopping',
    icon: Search,
    features: [
      { icon: Store, title: 'Product Browsing', desc: 'Browse the full hardware catalog organized by category for quick discovery.' },
      { icon: Search, title: 'Search & Filter', desc: 'Find products by name, brand, or category with instant filtering.' },
      { icon: Eye, title: 'Product Details', desc: 'View specs, price, availability, stock status, and product imagery.' },
      { icon: ShoppingBag, title: 'Shopping Cart', desc: 'Add, update quantities, and remove items with a persistent cart.' },
    ],
  },
  {
    group: 'Ordering & Fulfillment',
    icon: ShoppingCart,
    features: [
      { icon: ShoppingCart, title: 'Online Ordering', desc: 'Submit orders online with automatic order confirmation and reference number.' },
      { icon: Wallet, title: 'Checkout Process', desc: 'Review order summary, select fulfillment, choose payment, and confirm.' },
      { icon: Package, title: 'Pickup Option', desc: 'Collect orders at the store counter with ready-for-pickup notifications.' },
      { icon: Truck, title: 'Delivery Option', desc: 'Doorstep delivery with address capture and scheduling.' },
      { icon: Store, title: 'Shop & Go Option', desc: 'Reserve items online and pay/collect inside the store to skip the wait.' },
      { icon: CreditCard, title: 'Online Payment', desc: 'Pay securely via PayMongo with card and e-wallet support.' },
    ],
  },
  {
    group: 'Tracking & Status',
    icon: Activity,
    features: [
      { icon: MapPin, title: 'Order Tracking', desc: 'Follow each order through Pending, Processing, Ready, and Completed stages.' },
      { icon: Clock, title: 'Status Monitoring', desc: 'Real-time status updates with timestamps for every fulfillment milestone.' },
    ],
  },
];

export const adminFeatures: FeatureGroup[] = [
  {
    group: 'Dashboard & Insights',
    icon: LayoutDashboard,
    features: [
      { icon: LayoutDashboard, title: 'Dashboard Analytics', desc: 'KPI cards for daily sales, order count, low-stock alerts, and top products.' },
      { icon: BarChart3, title: 'Performance Overview', desc: 'Visual summaries of revenue, customer activity, and inventory health.' },
      { icon: Bell, title: 'Smart Notifications', desc: 'Proactive alerts for low stock, pending orders, and payments needing review.' },
    ],
  },
  {
    group: 'Catalog Management',
    icon: FolderTree,
    features: [
      { icon: Package, title: 'Product Management', desc: 'Add, edit, and organize products with price, stock, supplier, and barcode.' },
      { icon: FolderTree, title: 'Category Management', desc: 'Maintain product categories for structured browsing and filtering.' },
      { icon: Supplier, title: 'Supplier Management', desc: 'Track supplier contacts and link them to received stock.' },
    ],
  },
  {
    group: 'People & Orders',
    icon: Users,
    features: [
      { icon: Users, title: 'Customer Management', desc: 'View customer accounts, contact details, and order history.' },
      { icon: ClipboardList, title: 'Online Order Management', desc: 'Process, update status, and fulfill online customer orders end-to-end.' },
      { icon: CreditCard, title: 'Payment Monitoring', desc: 'Track PayMongo payment status and reconcile paid, pending, and failed charges.' },
    ],
  },
  {
    group: 'Point of Sale (POS)',
    icon: ScanBarcode,
    features: [
      { icon: ScanBarcode, title: 'Barcode Scanning', desc: 'Scan product barcodes for instant line-item entry at checkout.' },
      { icon: ShoppingBag, title: 'Manual Selection', desc: 'Search and add products manually when barcodes are unavailable.' },
      { icon: Receipt, title: 'Walk-in Checkout', desc: 'Complete cash and card transactions for in-store customers with receipts.' },
    ],
  },
  {
    group: 'Inventory Control',
    icon: Boxes,
    features: [
      { icon: Warehouse, title: 'Inventory Monitoring', desc: 'Live stock levels across every product with searchable, filterable views.' },
      { icon: PackageCheck, title: 'Stock Receiving', desc: 'Record incoming deliveries and update quantities with audit trails.' },
      { icon: PackageX, title: 'Stock-Out Recording', desc: 'Log damaged, lost, or returned items that leave inventory.' },
      { icon: AlertTriangle, title: 'Low-Stock Monitoring', desc: 'Threshold-based warnings that flag products before they run out.' },
    ],
  },
  {
    group: 'Reports',
    icon: FileText,
    features: [
      { icon: TrendingUp, title: 'Sales Reports', desc: 'Summarize revenue by day, product, and channel (online vs. POS).' },
      { icon: Boxes, title: 'Inventory Reports', desc: 'Current stock valuation and quantity snapshots for audit and planning.' },
      { icon: ArrowLeftRight, title: 'Stock Movement Reports', desc: 'Full history of stock in/out with reasons, dates, and responsible users.' },
    ],
  },
];

export const systemCapabilities = [
  {
    icon: HeartPulse,
    title: 'Automatic Inventory Sync',
    text: 'Every completed sale — online or in-store — instantly deducts stock and updates availability across the catalog.',
  },
  {
    icon: ArrowLeftRight,
    title: 'Stock Movement Tracking',
    text: 'Every receiving, sale, stock-out, and adjustment is recorded with timestamp, reason, and user for full traceability.',
  },
  {
    icon: Clock,
    title: 'Transaction History',
    text: 'A complete, searchable record of all sales and orders is retained for audit, customer service, and analytics.',
  },
  {
    icon: FileText,
    title: 'Business Reports',
    text: 'On-demand sales, inventory, and movement reports give owners the data they need to restock, price, and plan.',
  },
];

export const processSteps = [
  { step: '01', title: 'Order Placed', text: 'Customer submits an online order or admin completes a POS sale.', icon: ShoppingCart },
  { step: '02', title: 'Payment Verified', text: 'PayMongo confirms online payment or cash is recorded in-store.', icon: CreditCard },
  { step: '03', title: 'Inventory Adjusted', text: 'Sold quantities are deducted automatically from stock levels.', icon: Boxes },
  { step: '04', title: 'Movement Logged', text: 'A stock movement record is written with reason, date, and user.', icon: ArrowLeftRight },
  { step: '05', title: 'Order Fulfilled', text: 'Order is processed for pickup, delivery, or Shop & Go collection.', icon: Truck },
  { step: '06', title: 'Reports Updated', text: 'Sales, inventory, and movement reports reflect the latest data.', icon: BarChart3 },
];

export const colorPalette = [
  { name: 'Navy Blue', hex: '#0F2D52', role: 'Headers, sidebar, navigation', meaning: 'Trust, professionalism, reliability', text: 'light', category: 'Primary' },
  { name: 'Construction Orange', hex: '#F97316', role: 'Call-to-action buttons, highlights', meaning: 'Hardware and construction identity', text: 'light', category: 'Primary' },
  { name: 'Steel Gray', hex: '#475569', role: 'Icons, labels, secondary text', meaning: 'Industrial feel', text: 'light', category: 'Secondary' },
  { name: 'Light Gray', hex: '#F8FAFC', role: 'Backgrounds and cards', meaning: 'Clean, spacious surfaces', text: 'dark', category: 'Secondary' },
  { name: 'Success Green', hex: '#22C55E', role: 'In-stock items, completed orders', meaning: 'Positive, confirmed states', text: 'light', category: 'Accent' },
  { name: 'Warning Yellow', hex: '#EAB308', role: 'Low stock notifications', meaning: 'Caution, attention needed', text: 'light', category: 'Accent' },
  { name: 'Danger Red', hex: '#EF4444', role: 'Delete buttons, out-of-stock alerts', meaning: 'Critical, destructive actions', text: 'light', category: 'Accent' },
];

export const technologyStack = [
  { icon: Smartphone, name: 'Frontend', tech: 'Web-Based (Responsive)', desc: 'Accessible from desktops, tablets, and phones through any modern browser.' },
  { icon: Database, name: 'Database', tech: 'MySQL / phpMyAdmin', desc: 'MySQL relational database managed through phpMyAdmin for tables, queries, and admin tasks.' },
  { icon: CreditCard, name: 'Payments', tech: 'PayMongo', desc: 'Secure online payment gateway supporting cards and e-wallets for checkout.' },
  { icon: ScanBarcode, name: 'Barcode', tech: 'Barcode Scanner', desc: 'Hardware integration for fast product lookup at the POS terminal.' },
  { icon: Tag, name: 'Architecture', tech: 'Client–Server', desc: 'A web frontend connected to a PHP/MySQL backend serving both customer and admin modules.' },
];

export const databaseTables = [
  'users', 'customers', 'categories', 'suppliers', 'products', 'stock_movements',
  'carts', 'cart_items', 'orders', 'order_items', 'payments', 'sales',
  'sale_items', 'delivery_addresses', 'audit_logs',
];

export const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Categories', href: '/#categories' },
  { label: 'Products', href: '/#products' },
  { label: 'How It Works', href: '/#how-it-works' },
];

export const sectionMeta = {
  overview: { eyebrow: 'System Overview', title: 'One platform, two roles, zero spreadsheets' },
  objectives: { eyebrow: 'Project Objectives', title: 'Why this system is being built' },
  pillars: { eyebrow: 'Core Modules', title: 'Four systems in one' },
  customers: { eyebrow: 'Customer Features', title: 'A complete online storefront' },
  admin: { eyebrow: 'Admin Features', title: 'Full control of the store' },
  capabilities: { eyebrow: 'Automated Capabilities', title: 'What the system does for you' },
  process: { eyebrow: 'End-to-End Process', title: 'From order to updated reports' },
  tech: { eyebrow: 'Technology Stack', title: 'Built on familiar, reliable tools' },
  colors: { eyebrow: 'Design System', title: 'A color palette with purpose' },
};
