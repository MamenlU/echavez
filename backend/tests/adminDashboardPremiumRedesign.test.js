import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, '..');
const projectRoot = path.resolve(backendRoot, '..', 'project');
const read = (relative) => fs.readFileSync(path.join(projectRoot, relative), 'utf8');

const schema = read('schema.sql');
const dashboard = read('src/pages/AdminDashboard.tsx');
const overview = read('src/components/AdminDashboardOverview.tsx');
const sidebar = read('src/components/AdminSidebar.tsx');
const navbar = read('src/components/Navbar.tsx');
const pkg = JSON.parse(read('package.json'));

test('premium Admin refinement remains frontend-only and preserves the approved 22-table schema', () => {
  assert.equal((schema.match(/CREATE TABLE `/g) || []).length, 22);
  assert.doesNotMatch([dashboard, overview, sidebar, navbar].join('\n'), /CREATE TABLE|ALTER TABLE|DROP TABLE/i);
});

test('grouped Admin sidebar preserves module destinations and restores POS as an intentional dual-access action', () => {
  for (const group of ['Dashboard', 'Daily Operations', 'Inventory & Purchasing', 'Business Setup', 'Finance & Reports', 'Security']) {
    assert.match(sidebar, new RegExp(group.replace('&', '\\&')));
  }
  for (const tab of ['overview', 'orders', 'pos', 'cashierShift', 'saleAdjustments', 'products', 'purchaseOrders', 'reorderSuggestions', 'receiveStock', 'inventoryAdjustment', 'customers', 'deliveryRates', 'categories', 'suppliers', 'expenses', 'sales', 'movementHistory', 'reports', 'auditLogs']) {
    assert.match(sidebar, new RegExp(`tab: '${tab}'`));
  }
  assert.match(sidebar, /tab: 'pos', label: 'POS \/ New Sale'/);
  assert.match(navbar, /New POS Sale/);
});

test('Admin header retains New POS Sale plus Messages and no duplicate Orders shortcut', () => {
  assert.match(navbar, /New POS Sale/);
  assert.match(navbar, /Messages/);
  assert.match(navbar, /System Admin/);
  assert.doesNotMatch(navbar, /adminOrderAttentionCount/);
  assert.doesNotMatch(navbar, /<ClipboardList/);
});

test('overview uses four real-data KPI selectors and one shared Insight Panel without duplicate quick navigation', () => {
  for (const token of ["key: 'sales'", "key: 'orders'", "key: 'inventory'", "key: 'fulfillment'"]) {
    assert.match(overview, new RegExp(token.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')));
  }
  assert.match(overview, /\/api\/analytics\/admin/);
  assert.match(overview, /Sales Insight/);
  assert.match(overview, /Order Insight/);
  assert.match(overview, /Inventory Insight/);
  assert.match(overview, /Fulfillment Insight/);
  assert.doesNotMatch(overview, /aria-label="Quick actions"/);
  assert.doesNotMatch(overview, /\+12%|\+28%|3,425|Active Customers|Expiring Items/);
});

test('Daily Operations and Business Controls retain approved financial and operational concepts', () => {
  for (const text of ['Net Merchandise Sales', 'COGS', 'Gross Profit', 'Gross Margin', 'Transactions', 'Items Sold', 'Stock Received', 'Stock Out']) {
    assert.match(overview, new RegExp(text));
  }
  for (const text of ['Estimated Net Profit', 'Open Purchase Orders', 'Reorder Attention', 'Returns / Voids Today', 'Cashier Shift']) {
    assert.match(overview, new RegExp(text.replace('/', '\\/')));
  }
});

test('Sales History and Inventory Movements default to compact views while retaining full columns and details', () => {
  assert.match(dashboard, /salesTableView[\s\S]*'compact'/);
  assert.match(dashboard, /movementTableView[\s\S]*'compact'/);
  assert.match(dashboard, /Full Columns/);
  assert.match(dashboard, /selectedSaleHistory/);
  assert.match(dashboard, /selectedMovementHistory/);
});

test('Reports Center compacts only screen presentation and retains complete Print and CSV sources', () => {
  assert.match(dashboard, /reportTableView/);
  assert.match(dashboard, /reportScreenHeaders/);
  assert.match(dashboard, /reportScreenRows/);
  assert.match(dashboard, /handlePrintReport/);
  assert.match(dashboard, /handleExportReportCsv/);
  assert.match(dashboard, /reportTableHeaders/);
  assert.match(dashboard, /reportTableRows/);
});

test('refinement adds no chart library and reuses the existing lightweight frontend stack', () => {
  const allDependencies = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  for (const chartPackage of ['recharts', 'chart.js', 'react-chartjs-2', 'apexcharts', 'echarts']) {
    assert.equal(allDependencies[chartPackage], undefined);
  }
});
