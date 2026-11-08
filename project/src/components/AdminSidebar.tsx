import { useEffect, useMemo, useState } from 'react';
import { getStoredSession } from '../utils/authSession';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileBarChart,
  LayoutDashboard,
  PackagePlus,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  ScanBarcode,
  Shield,
  Store,
  Tags,
  Truck,
  UsersRound,
  Wrench,
} from 'lucide-react';

export type AdminSidebarTab =
  | 'overview'
  | 'customers'
  | 'orders'
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

type GroupKey = 'daily' | 'inventory' | 'setup' | 'finance' | 'security';

type NavItem = {
  tab: AdminSidebarTab;
  label: string;
  title: string;
  icon: typeof LayoutDashboard;
};

type NavGroup = {
  key: GroupKey;
  label: string;
  items: NavItem[];
};

const groups: NavGroup[] = [
  {
    key: 'daily',
    label: 'Daily Operations',
    items: [
      { tab: 'orders', label: 'Manage Orders', title: 'Manage Orders', icon: ClipboardList },
      { tab: 'pos', label: 'POS / New Sale', title: 'POS / New Sale', icon: ScanBarcode },
      { tab: 'cashierShift', label: 'Cashier Shift', title: 'Cashier Shift & Cash Reconciliation', icon: Clock },
      { tab: 'saleAdjustments', label: 'Returns & Voids', title: 'Returns, Refunds & Sales Voids', icon: RotateCcw },
    ],
  },
  {
    key: 'inventory',
    label: 'Inventory & Purchasing',
    items: [
      { tab: 'products', label: 'Product Inventory', title: 'Product Inventory', icon: Boxes },
      { tab: 'purchaseOrders', label: 'Purchase Orders', title: 'Purchase Orders', icon: ClipboardCheck },
      { tab: 'reorderSuggestions', label: 'Reorder Suggestions', title: 'Reorder Suggestions', icon: AlertTriangle },
      { tab: 'receiveStock', label: 'Receive Stock', title: 'Receive Stock', icon: PackagePlus },
      { tab: 'inventoryAdjustment', label: 'Stock Adjustment', title: 'Stock Adjustment / Physical Count', icon: ArrowLeftRight },
    ],
  },
  {
    key: 'setup',
    label: 'Business Setup',
    items: [
      { tab: 'customers', label: 'Customer Management', title: 'Customer Management', icon: UsersRound },
      { tab: 'deliveryRates', label: 'Delivery Rates', title: 'Delivery Rates', icon: Truck },
      { tab: 'categories', label: 'Categories', title: 'Category Management', icon: Tags },
      { tab: 'suppliers', label: 'Suppliers', title: 'Supplier Management', icon: Store },
    ],
  },
  {
    key: 'finance',
    label: 'Finance & Reports',
    items: [
      { tab: 'expenses', label: 'Operating Expenses', title: 'Store Operating Expenses', icon: CircleDollarSign },
      { tab: 'sales', label: 'Sales History', title: 'Sales History', icon: FileBarChart },
      { tab: 'movementHistory', label: 'Inventory Movements', title: 'Inventory Movements', icon: ArrowLeftRight },
      { tab: 'reports', label: 'Reports Center', title: 'Reports Center', icon: FileBarChart },
    ],
  },
  {
    key: 'security',
    label: 'Security',
    items: [
      { tab: 'auditLogs', label: 'Audit Logs', title: 'Audit Logs', icon: Shield },
    ],
  },
];

const activeGroupForTab = (tab: AdminSidebarTab): GroupKey | null =>
  groups.find((group) => group.items.some((item) => item.tab === tab))?.key ?? null;

interface AdminSidebarProps {
  activeTab: string;
  isOpen: boolean;
  isCollapsed: boolean;
  activeOrderCount: number;
  onNavigate: (tab: AdminSidebarTab) => void;
  onClose: () => void;
  onToggleCollapsed: () => void;
}

const buildExpandedState = (key: GroupKey | null): Record<GroupKey, boolean> => ({
  daily: key === 'daily' || key === null,
  inventory: key === 'inventory',
  setup: key === 'setup',
  finance: key === 'finance',
  security: key === 'security',
});

export function AdminSidebar({
  activeTab,
  isOpen,
  isCollapsed,
  activeOrderCount,
  onNavigate,
  onClose,
  onToggleCollapsed,
}: AdminSidebarProps) {
  const normalizedActiveTab = activeTab as AdminSidebarTab;
  const currentGroup = useMemo(() => activeGroupForTab(normalizedActiveTab), [normalizedActiveTab]);
  const [expanded, setExpanded] = useState<Record<GroupKey, boolean>>(() => buildExpandedState(currentGroup));

  useEffect(() => {
    setExpanded(buildExpandedState(currentGroup));
  }, [currentGroup]);

  const navClass = (tab: AdminSidebarTab) =>
    `group flex min-h-10 w-full items-center rounded-xl border text-[13px] font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-200 active:scale-[0.985] ${
      isCollapsed ? 'lg:justify-center lg:px-0' : 'gap-3 px-3 py-[0.7rem]'
    } ${
      normalizedActiveTab === tab
        ? 'border-emerald-400/20 bg-white/[0.12] text-white shadow-[inset_3px_0_0_#4ADE80,0_12px_28px_-22px_rgba(0,0,0,0.7)]'
        : 'border-transparent text-emerald-50/75 hover:border-white/10 hover:bg-white/[0.07] hover:text-white'
    }`;

  const navigate = (tab: AdminSidebarTab) => {
    onNavigate(tab);
    onClose();
  };

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    return (
      <button
        key={item.tab}
        type="button"
        onClick={() => navigate(item.tab)}
        className={navClass(item.tab)}
        title={item.title}
        aria-current={normalizedActiveTab === item.tab ? 'page' : undefined}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className={isCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
        {item.tab === 'orders' && activeOrderCount > 0 && (
          <span className={`ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-[#4ADE80] px-1.5 py-0.5 text-[9px] font-extrabold text-[#07351F] ${isCollapsed ? 'lg:hidden' : ''}`}>
            {activeOrderCount > 99 ? '99+' : activeOrderCount}
          </span>
        )}
      </button>
    );
  };

  const toggleGroup = (key: GroupKey) => {
    setExpanded((current) => ({
      daily: key === 'daily' ? !current.daily : false,
      inventory: key === 'inventory' ? !current.inventory : false,
      setup: key === 'setup' ? !current.setup : false,
      finance: key === 'finance' ? !current.finance : false,
      security: key === 'security' ? !current.security : false,
    }));
  };

  return (
    <aside
      id="admin-sidebar-navigation"
      className={`fixed bottom-0 left-0 top-16 z-40 flex w-72 flex-col transform overflow-hidden border-r border-emerald-950/20 bg-[linear-gradient(180deg,#0B3B2B_0%,#0B4430_52%,#073523_100%)] text-white shadow-[12px_0_36px_-26px_rgba(4,37,25,0.8)] transition-[width,transform,padding] duration-300 ease-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } ${
        isCollapsed ? 'lg:w-[5.25rem] lg:translate-x-0 lg:px-2' : 'lg:w-72 lg:translate-x-0 lg:px-3'
      } px-3 py-3`}
    >
      <div className={`flex min-h-[48px] shrink-0 items-center justify-between rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_12px_30px_-24px_rgba(0,0,0,0.75)] backdrop-blur-sm ${isCollapsed ? 'lg:justify-center lg:gap-1 lg:px-1.5' : 'px-3'}`}>
        {isCollapsed && (
          <span className="hidden h-8 w-8 items-center justify-center rounded-lg bg-[#22C55E] text-[#06351F] shadow-sm lg:flex" title="Rayjin Hardware Administration">
            <Wrench className="h-4 w-4" />
          </span>
        )}
        <div className={isCollapsed ? 'lg:hidden' : ''}>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.17em] text-emerald-100/55">Administration</p>
          <p className="mt-0.5 text-[12px] font-bold text-white">Operations Console</p>
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-emerald-200 shadow-sm transition hover:border-emerald-300/30 hover:bg-white/15 hover:text-white lg:flex"
          aria-label={isCollapsed ? 'Expand administration sidebar' : 'Collapse administration sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav
        className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:#4B7D68_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#4B7D68]"
        aria-label="Administration sections"
      >
        <p className={`${isCollapsed ? 'lg:hidden' : ''} px-3 pb-1 pt-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-100/55`}>Dashboard</p>
        {renderItem({ tab: 'overview', label: 'Overview', title: 'Dashboard Overview', icon: LayoutDashboard })}

        {groups.map((group) => {
          const open = isCollapsed || expanded[group.key];
          const containsActive = group.key === currentGroup;
          return (
            <section key={group.key} className="pt-1">
              {!isCollapsed && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-[0.16em] transition ${
                    containsActive ? 'text-emerald-300' : 'text-emerald-100/55 hover:bg-white/[0.06] hover:text-emerald-100'
                  }`}
                  aria-expanded={open}
                >
                  <span>{group.label}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
              )}
              {open && (
                <div className={`${isCollapsed ? 'space-y-1' : 'space-y-0.5 pb-1'}`}>
                  {group.items.map(renderItem)}
                </div>
              )}
            </section>
          );
        })}
      </nav>

      {getStoredSession()?.user.role === 'super_admin' && <Link to="/admin/cashiers" title="Manage Staff accounts"
        className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-white/10">
        <UsersRound className="h-4 w-4 shrink-0" /><span className={isCollapsed ? 'lg:hidden' : ''}>Staff Accounts</span>
      </Link>}
      {!isCollapsed && (
        <div className="mt-2 shrink-0 rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035))] px-3 py-2.5 shadow-[0_12px_30px_-24px_rgba(0,0,0,0.7)]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#22C55E] text-[#06351F] shadow-sm">
              <Wrench className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-emerald-200/80">Rayjin Hardware</p>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-emerald-50/75">Operations Console · Admin access</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
