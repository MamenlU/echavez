import {
  ShoppingCart, Package, BarChart3, Smartphone,
  HeartPulse, Receipt, Boxes, ShieldCheck,
  User, Search, ShoppingBag, Eye, CreditCard, Truck, Store,
  LayoutDashboard, FolderTree, Truck as Supplier, Users, ClipboardList,
  ScanBarcode, Tag, Warehouse, PackageCheck, AlertTriangle,
  FileText, TrendingUp, ArrowLeftRight, LogIn, UserPlus, KeyRound,
  MapPin, Clock, Wallet, Activity, Layers, Database, MessageCircle,
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
  { icon: ShoppingCart, value: '5', label: 'Specific Objectives', sub: 'Aligned with the manuscript' },
  { icon: Database, value: '22', label: 'Database Tables', sub: '15 core + 7 professional expansion' },
  { icon: BarChart3, value: '9', label: 'Professional Enhancements', sub: 'Integrated business-control capabilities' },
];

export const objectives = [
  {
    icon: FolderTree,
    title: 'Centralized Record Management',
    text: 'Manage product, customer, supplier, inventory, purchasing, and operational records through one centralized web-based system.',
  },
  {
    icon: ShoppingCart,
    title: 'Online Ordering',
    text: 'Allow customers to browse products, place orders, choose Pickup, Delivery, or Shop & Go, select supported payment options, and monitor order status.',
  },
  {
    icon: Receipt,
    title: 'Order & Sales Management',
    text: 'Support customer-order processing, onsite POS transactions, post-sale adjustments, cashier-shift controls, and sales-history monitoring.',
  },
  {
    icon: Boxes,
    title: 'Inventory & Purchasing',
    text: 'Control Stock-In/Stock-Out, physical-count adjustments, Purchase Orders, partial receiving, low-stock monitoring, and formula-based reorder suggestions.',
  },
  {
    icon: BarChart3,
    title: 'Business Reporting & Controls',
    text: 'Present sales, inventory, COGS, gross profit, estimated net profit, audit history, and management reports for operational decision-making.',
  },
];

export const pillars = [
  { icon: ShoppingCart, title: 'Online Ordering', text: 'Customer browsing, cart, checkout, first-order merchandise discount where eligible, Pickup, Delivery, Shop & Go, payment status, tracking, and messaging.' },
  { icon: Receipt, title: 'Point of Sale & Cash Control', text: 'Barcode/manual POS entry, receipts, cashier shifts, cash reconciliation, cash refunds, and controlled sales voids.' },
  { icon: Boxes, title: 'Inventory & Purchasing', text: 'Central stock ledger, receiving, physical counts, Purchase Orders, partial receiving, low-stock monitoring, and reorder suggestions.' },
  { icon: BarChart3, title: 'Financial Insights', text: 'Net merchandise sales, service/delivery revenue, COGS, gross profit, gross margin, operating expenses, and estimated net profit.' },
  { icon: ShieldCheck, title: 'Accountability & Audit', text: 'Role-aware access, transaction safeguards, duplicate protection, and centralized audit logs for meaningful sensitive Admin actions.' },
  { icon: MessageCircle, title: 'Customer Communication', text: 'General inquiries and order-linked conversations connect customer and Admin communication in the same system.' },
];

export const businessBenefits = [
  { icon: ShoppingCart, title: 'Faster Customer Service', text: 'Online ordering, order tracking, messaging, and onsite POS reduce the need to rely on disconnected manual steps for daily transactions.' },
  { icon: Boxes, title: 'More Trustworthy Stock Records', text: 'Controlled receiving, completion-based Stock-Out, physical-count adjustments, returns, and the centralized movement ledger improve stock traceability.' },
  { icon: ClipboardList, title: 'Better Purchasing Decisions', text: 'Purchase Orders, partial receiving, supplier lead time, low-stock monitoring, and reorder suggestions help the Admin plan replenishment with visible supporting data.' },
  { icon: BarChart3, title: 'Clearer Business Monitoring', text: 'Financial definitions, expenses, cash reconciliation, audit logs, and management reports help separate revenue, cost, profit, and operational exceptions.' },
];

export const customerFeatures: FeatureGroup[] = [
  {
    group: 'Account & Access',
    icon: User,
    features: [
      { icon: UserPlus, title: 'Customer Registration', desc: 'Customers can create an account through standard registration, with Google Sign-In available where configured.' },
      { icon: LogIn, title: 'Authenticated Login', desc: 'Role-aware access protects customer account features such as cart, orders, tracking, messages, and profile information.' },
      { icon: KeyRound, title: 'Forgot / Reset Password', desc: 'Email-based password recovery supports customers who need to regain access to their account.' },
      { icon: User, title: 'Profile Management', desc: 'Customers can maintain contact and delivery information used by supported ordering workflows.' },
    ],
  },
  {
    group: 'Catalog & Shopping',
    icon: Search,
    features: [
      { icon: Store, title: 'Product Browsing', desc: 'Browse the hardware catalog using the current product and category records.' },
      { icon: Search, title: 'Search & Filter', desc: 'Find products by supported searchable product information and category filters.' },
      { icon: Eye, title: 'Product Details & Images', desc: 'Review product information, stock/fulfillment availability, quantity controls, and product imagery before ordering.' },
      { icon: ShoppingBag, title: 'Shopping Cart', desc: 'Add products, update quantities, remove lines, and carry the cart into checkout.' },
    ],
  },
  {
    group: 'Checkout, Payment & Fulfillment',
    icon: ShoppingCart,
    features: [
      { icon: Wallet, title: 'Guided Checkout', desc: 'Review merchandise, fulfillment details, applicable fees, payment option, and final order summary before submission.' },
      { icon: Tag, title: 'First-Order Discount', desc: 'Eligible customers receive the implemented first-order merchandise discount while fulfillment fees remain separately accounted for.' },
      { icon: Package, title: 'Store Pickup', desc: 'Place Pickup orders and monitor their approval and Ready for Pickup progression.' },
      { icon: Store, title: 'Shop & Go', desc: 'Choose the implemented express-pickup workflow with requested and Admin-confirmed pickup scheduling.' },
      { icon: Truck, title: 'Local Delivery', desc: 'Use supported municipality/barangay delivery coverage and configured barangay-based delivery rates.' },
      { icon: CreditCard, title: 'Cash / PayMongo-Supported Payment', desc: 'Use the payment options supported by the current checkout flow, with PayMongo Card/GCash payment status handled through the existing integration where configured.' },
    ],
  },
  {
    group: 'Tracking & Communication',
    icon: Activity,
    features: [
      { icon: MapPin, title: 'Order Tracking', desc: 'Follow fulfillment-specific order milestones from placement through completion, cancellation, or rejection where applicable.' },
      { icon: Clock, title: 'Payment & Status Monitoring', desc: 'Review payment, approval, readiness, delivery, and completion state using the current order data.' },
      { icon: MessageCircle, title: 'Customer Messaging', desc: 'Use General Inquiries and Order Conversations so order-related discussions stay connected to the correct transaction.' },
      { icon: HeartPulse, title: 'Rayjin Assistant', desc: 'When the configured AI service is enabled, customers can ask informational questions about products, prices, availability, fulfillment, and their own orders; the assistant cannot approve orders, verify payments, or change stock.' },
    ],
  },
];

export const adminFeatures: FeatureGroup[] = [
  {
    group: 'Operations Dashboard & Management',
    icon: LayoutDashboard,
    features: [
      { icon: LayoutDashboard, title: 'Interactive Admin Dashboard', desc: 'Action-oriented Sales, Orders, Inventory, and Fulfillment KPIs use real system data with a shared context-sensitive Insight Panel.' },
      { icon: BarChart3, title: 'Daily Operations & Business Controls', desc: 'Review daily financial/stock activity together with Estimated Net Profit, open POs, reorder attention, returns/voids, and Cashier Shift status.' },
      { icon: FileText, title: 'Management Summary', desc: 'Review the integrated management report while retaining the existing Sales, Inventory, Low-Stock, and Stock Movement reporting views.' },
      { icon: HeartPulse, title: 'Admin AI Assistance', desc: 'When enabled/configured, the Admin AI tools provide informational assistance without bypassing the system’s existing transaction, stock, payment, or authorization rules.' },
    ],
  },
  {
    group: 'Orders, Customers & Communication',
    icon: Users,
    features: [
      { icon: ClipboardList, title: 'Online Order Management', desc: 'Review, approve, reject, fulfill, cancel where eligible, and complete Pickup, Delivery, and Shop & Go orders using the established workflow rules.' },
      { icon: Users, title: 'Customer Management', desc: 'View customer accounts, contact information, and related order history.' },
      { icon: CreditCard, title: 'Payment Monitoring', desc: 'Monitor cash and PayMongo-supported payment states while preserving protected paid-order rules and external-refund verification.' },
      { icon: MessageCircle, title: 'Customer Messaging', desc: 'Reply to General Inquiries and Order Conversations from the Admin workspace.' },
      { icon: MapPin, title: 'Delivery Rate Management', desc: 'Maintain the configured municipality/barangay delivery rates used by the checkout workflow.' },
    ],
  },
  {
    group: 'POS, Returns & Cash Control',
    icon: ScanBarcode,
    features: [
      { icon: ScanBarcode, title: 'Onsite POS', desc: 'Use barcode-assisted lookup or manual selection, record applicable payment information, deduct sold stock, and produce the receipt workflow.' },
      { icon: Clock, title: 'Cashier Shift & Reconciliation', desc: 'Record opening cash, link new POS transactions to the active shift, calculate expected cash, and record actual cash with shortage/overage.' },
      { icon: ArrowLeftRight, title: 'Returns, Refunds & POS Voids', desc: 'Record partial returns, restockable/non-restockable outcomes, cash refunds, externally verified non-cash refunds, and full POS voids without deleting the original sale.' },
    ],
  },
  {
    group: 'Inventory & Purchasing',
    icon: Boxes,
    features: [
      { icon: Warehouse, title: 'Inventory Monitoring', desc: 'View current stock while keeping inventory_movements as the central Stock-In/Stock-Out ledger.' },
      { icon: PackageCheck, title: 'Goods Receiving', desc: 'Record supplier receiving with actual quantity/cost, references, and duplicate-submit protection.' },
      { icon: ArrowLeftRight, title: 'Physical Count / Stock Adjustment', desc: 'Correct verified stock discrepancies through controlled Stock-In/Stock-Out adjustments instead of direct product-stock editing.' },
      { icon: ClipboardList, title: 'Purchase Orders', desc: 'Create Draft POs, mark them Ordered, receive partial supplier deliveries, track remaining quantities, and preserve expected versus actual costs.' },
      { icon: AlertTriangle, title: 'Reorder Suggestions', desc: 'Use 30-day net demand, supplier lead time, reorder level, current stock, and outstanding PO quantities to recommend replenishment for Admin review.' },
    ],
  },
  {
    group: 'Financial Management & Reports',
    icon: TrendingUp,
    features: [
      { icon: TrendingUp, title: 'Sales & Profitability Reporting', desc: 'Separate Gross Merchandise Sales, discounts/refunds, Net Merchandise Sales, Service/Delivery Revenue, COGS, Gross Profit, and Gross Margin.' },
      { icon: Wallet, title: 'Expense Management', desc: 'Record controlled operating expenses separately from inventory purchasing and retain voided expense history for accountability.' },
      { icon: BarChart3, title: 'Estimated Net Profit', desc: 'Calculate the management estimate from Gross Profit plus Service/Delivery Revenue minus recorded Operating Expenses.' },
      { icon: FileText, title: 'Reports Center', desc: 'Review compact/full report views with printing and CSV export while preserving complete underlying report records.' },
    ],
  },
  {
    group: 'Security, Traceability & Setup',
    icon: ShieldCheck,
    features: [
      { icon: ShieldCheck, title: 'Centralized Audit Logs', desc: 'Record meaningful sensitive Admin actions such as price/status changes, receiving, stock adjustments, returns/voids, purchasing, shifts, and expenses.' },
      { icon: Package, title: 'Product / Category Management', desc: 'Maintain product details, categories, pricing, barcode data, fulfillment settings, and product imagery while stock changes stay controlled.' },
      { icon: Supplier, title: 'Supplier Management', desc: 'Maintain supplier information and typical lead time used by purchasing and reorder calculations.' },
    ],
  },
];

export const systemCapabilities = [
  {
    icon: ShieldCheck,
    title: 'Role-Aware Access & Auditability',
    text: 'Customer and Admin areas use authenticated role-aware access, while the centralized Audit Log records selected sensitive Admin actions. The system does not claim a fine-grained enterprise permission matrix.',
  },
  {
    icon: ArrowLeftRight,
    title: 'Central Inventory Ledger',
    text: 'Receiving, completed sales, restockable returns, and verified stock adjustments write through inventory_movements so stock-changing events remain traceable.',
  },
  {
    icon: PackageCheck,
    title: 'Controlled Purchasing & Receiving',
    text: 'Purchase Orders never change stock by themselves. Inventory increases only when goods are physically received, including partial supplier deliveries.',
  },
  {
    icon: CreditCard,
    title: 'Protected Payment & Refund Handling',
    text: 'Existing PayMongo verification remains separate from post-sale adjustment records. Non-cash refunds are recorded only after external confirmation; automatic PayMongo refunds are not claimed.',
  },
  {
    icon: Clock,
    title: 'Cash & Transaction Accountability',
    text: 'Cashier Shifts reconcile opening cash, Cash POS sales, cash refunds, Cash Drawer expenses, expected cash, actual cash, and shortage/overage.',
  },
  {
    icon: FileText,
    title: 'Integrated Business Reporting',
    text: 'Sales, inventory, movement, management, purchasing, expense, return, and audit records support operational monitoring without storing duplicate profit/reorder summary tables.',
  },
];

export const financialInsights = [
  {
    icon: TrendingUp,
    title: 'Net Merchandise Sales',
    formula: 'Gross Merchandise Sales − Discounts − Merchandise Refunds',
    text: 'Represents merchandise revenue after the implemented discounts and recorded merchandise returns/refunds.',
  },
  {
    icon: Boxes,
    title: 'COGS',
    formula: 'Original weighted-average sale cost − eligible restock reversals',
    text: 'Uses recorded inventory cost rather than treating selling price or total sales as product cost.',
  },
  {
    icon: BarChart3,
    title: 'Gross Profit & Margin',
    formula: 'Gross Profit = Net Merchandise Sales − COGS',
    text: 'Gross Margin is Gross Profit divided by Net Merchandise Sales, keeping service/delivery fees separate from merchandise gross profit.',
  },
  {
    icon: Wallet,
    title: 'Estimated Net Profit',
    formula: 'Gross Profit + Service/Delivery Revenue − Operating Expenses',
    text: 'A management estimate for Rayjin Hardware operations; it is not presented as a full accounting, tax, payroll, or general-ledger statement.',
  },
];

export const managementControls = [
  { icon: Wallet, title: 'Estimated Net Profit', text: 'Monthly management estimate from verified sales, cost, fees, and operating expenses.' },
  { icon: ClipboardList, title: 'Open Purchase Orders', text: 'Tracks purchasing commitments without increasing stock before goods are received.' },
  { icon: AlertTriangle, title: 'Reorder Attention', text: 'Uses current stock, net demand, supplier lead time, reorder level, and open-PO coverage.' },
  { icon: ArrowLeftRight, title: 'Returns / Voids', text: 'Preserves original sales while recording controlled post-sale adjustments.' },
  { icon: Clock, title: 'Cashier Shift', text: 'Provides cash-drawer accountability for new onsite POS transactions and cash refunds.' },
];

export const processSteps = [
  { step: '01', title: 'Customer Order or POS Sale Starts', text: 'A customer checks out online or an authorized Admin begins an onsite POS transaction.', icon: ShoppingCart },
  { step: '02', title: 'Payment / Business Rules Validate', text: 'The system applies the supported discount, fulfillment, payment, Cashier Shift, stock, and authorization rules for the selected workflow.', icon: CreditCard },
  { step: '03', title: 'Order or Sale Is Completed', text: 'The sale record is finalized at the correct point in the workflow; online inventory is not deducted prematurely.', icon: Receipt },
  { step: '04', title: 'Inventory Movement Is Recorded', text: 'The applicable Stock-In or Stock-Out is written to the centralized movement ledger with its transaction source and cost basis.', icon: ArrowLeftRight },
  { step: '05', title: 'Controls Handle Exceptions & Replenishment', text: 'Returns/voids, stock adjustments, Purchase Orders, partial receiving, reorder suggestions, shifts, and expenses use their dedicated controlled workflows.', icon: ShieldCheck },
  { step: '06', title: 'Reports & Management Insights Update', text: 'Sales, COGS, gross profit, inventory values, expenses, estimated net profit, purchasing, and audit information become available for monitoring.', icon: BarChart3 },
];

export const colorPalette = [
  { name: 'Forest Green', hex: '#0B3B23', role: 'Primary brand surfaces, Admin and customer emphasis', meaning: 'Trust, stability, local business identity', text: 'light', category: 'Primary' },
  { name: 'Rayjin Green', hex: '#15803D', role: 'Primary actions, active states, navigation emphasis', meaning: 'Growth, confirmation, dependable action', text: 'light', category: 'Primary' },
  { name: 'Emerald', hex: '#22C55E', role: 'Highlights and positive-status accents', meaning: 'Availability, progress, positive action', text: 'dark', category: 'Accent' },
  { name: 'Soft Mint', hex: '#EAF6EF', role: 'Selected states, cards, subtle support surfaces', meaning: 'Calm, approachable visual hierarchy', text: 'dark', category: 'Secondary' },
  { name: 'Surface White', hex: '#FFFFFF', role: 'Cards, forms, product panels, content surfaces', meaning: 'Clarity and readable business interfaces', text: 'dark', category: 'Secondary' },
  { name: 'Deep Text', hex: '#17372D', role: 'Primary headings and readable interface text', meaning: 'Strong contrast without harsh black', text: 'light', category: 'Secondary' },
  { name: 'Warning Yellow', hex: '#EAB308', role: 'Low-stock and attention states', meaning: 'Caution and replenishment awareness', text: 'dark', category: 'Status' },
  { name: 'Danger Red', hex: '#EF4444', role: 'Destructive and critical states', meaning: 'Cancellation, errors, destructive actions', text: 'light', category: 'Status' },
];

export const technologyStack = [
  { icon: Smartphone, name: 'Frontend', tech: 'React + TypeScript + Vite', desc: 'Responsive storefront, customer dashboard, Admin console, and capstone-presentation interfaces built with React and TypeScript through Vite.' },
  { icon: Tag, name: 'Backend', tech: 'Node.js + Express', desc: 'Express routes/services handle authentication, ordering, PayMongo status workflows, POS, inventory, purchasing, returns, shifts, expenses, messaging, analytics, and reports.' },
  { icon: Database, name: 'Database', tech: 'MySQL/MariaDB + phpMyAdmin', desc: 'The approved 22-table relational architecture is accessed by the Node.js backend and managed locally through phpMyAdmin/XAMPP.' },
  { icon: ShieldCheck, name: 'Authentication', tech: 'JWT + Google Sign-In', desc: 'Authenticated Customer/Admin sessions use role-aware protected routes, password recovery, and Google Sign-In support where configured.' },
  { icon: CreditCard, name: 'Payments', tech: 'PayMongo Integration', desc: 'The current online-payment flow records/verifies supported PayMongo Card/GCash payment states; automatic gateway refunds are not part of the implemented return workflow.' },
  { icon: ScanBarcode, name: 'POS Input', tech: 'Barcode + Manual Selection', desc: 'The onsite POS supports barcode-assisted product lookup and manual product selection with Cashier Shift integration for new transactions.' },
];

export const databaseTables = [
  'categories',
  'delivery_rates',
  'inventory_movements',
  'orders',
  'order_items',
  'order_status_history',
  'password_reset_tokens',
  'payments',
  'products',
  'sales',
  'sale_items',
  'suppliers',
  'users',
  'conversations',
  'conversation_messages',
  'audit_logs',
  'sale_adjustments',
  'sale_adjustment_items',
  'purchase_orders',
  'purchase_order_items',
  'cashier_shifts',
  'expenses',
];

export const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Categories', href: '/#categories' },
  { label: 'Products', href: '/#products' },
  { label: 'How It Works', href: '/#how-it-works' },
];

export const sectionMeta = {
  overview: { eyebrow: 'System Overview', title: 'A complete operational platform for Rayjin Hardware' },
  objectives: { eyebrow: 'Project Objectives', title: 'The approved system goals and how the implementation addresses them' },
  pillars: { eyebrow: 'Core Functions', title: 'Ordering, POS, inventory, controls, and business insights in one system' },
  customers: { eyebrow: 'Customer Experience', title: 'From product discovery to fulfillment and communication' },
  admin: { eyebrow: 'Administration & Operations', title: 'Professional business controls built around real store workflows' },
  insights: { eyebrow: 'Financial & Management Insights', title: 'Business metrics with clear, defensible definitions' },
  capabilities: { eyebrow: 'Security & Operational Integrity', title: 'Controls that protect stock, transactions, and accountability' },
  process: { eyebrow: 'End-to-End Process', title: 'How transactions flow from order or sale to controlled business records' },
  tech: { eyebrow: 'Architecture & Database', title: 'A 22-table system built on the existing full-stack architecture' },
  colors: { eyebrow: 'Design System', title: 'A cohesive Rayjin Hardware visual identity' },
  future: { eyebrow: 'Future Development', title: 'Ideas kept clearly separate from implemented functionality' },
};
