import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, '..');
const projectRoot = path.resolve(backendRoot, '..', 'project');
const read = (relative, root = backendRoot) => fs.readFileSync(path.join(root, relative), 'utf8');

const schema = read('schema.sql', projectRoot);
const management = read('lib/managementOverview.js');
const analytics = read('lib/analyticsService.js');
const analyticsRoute = read('routes/analytics.js');
const dashboardAnalytics = read('src/components/AdminOperationsAnalytics.tsx', projectRoot);
const dashboard = read('src/pages/AdminDashboard.tsx', projectRoot);

test('Phase 9 is integration-only and keeps the approved 22-table schema', () => {
  assert.equal((schema.match(/CREATE TABLE `/g) || []).length, 22);
  assert.doesNotMatch(management, /\b(?:INSERT|UPDATE|DELETE|ALTER|CREATE TABLE|DROP TABLE)\b/i);
});

test('management overview reuses Phase 5 to Phase 8 records instead of duplicating summary tables', () => {
  assert.match(management, /getEstimatedNetProfitSummary/);
  assert.match(management, /getReorderSuggestions/);
  assert.match(management, /getOpenShiftForAdmin/);
  assert.match(management, /purchase_orders/);
  assert.match(management, /purchase_order_items/);
  assert.match(management, /inventory_movements/);
  assert.match(management, /sale_adjustments/);
  assert.doesNotMatch(management, /management_summary|dashboard_summary|report_summary/i);
});

test('management profitability uses Phase 8 Estimated Net Profit rather than treating revenue as profit', () => {
  assert.match(management, /estimatedNetProfit/);
  assert.match(management, /operatingExpenses/);
  assert.match(dashboardAnalytics, /Estimated Net Profit — This Month/);
  assert.match(dashboard, /Estimated Net Profit — This Month/);
});

test('purchasing summary measures only Ordered and Partially Received open purchase orders', () => {
  assert.match(management, /'Ordered', 'Partially Received'/);
  assert.match(management, /outstanding_units/);
  assert.match(management, /expected_unit_cost/);
});

test('Admin analytics passes the authenticated Admin into cash-control management integration', () => {
  assert.match(analyticsRoute, /adminId: Number\(req\.user\.id\)/);
  assert.match(analytics, /getManagementOverview/);
  assert.match(analytics, /managementOverview/);
});

test('Admin Dashboard exposes an integrated Management Control Center with links to existing modules', () => {
  assert.match(dashboardAnalytics, /Management Control Center/);
  assert.match(dashboardAnalytics, /purchaseOrders/);
  assert.match(dashboardAnalytics, /reorderSuggestions/);
  assert.match(dashboardAnalytics, /saleAdjustments/);
  assert.match(dashboardAnalytics, /cashierShift/);
  assert.match(dashboardAnalytics, /expenses/);
  assert.match(dashboard, /onNavigate=\{\(tab\) => setActiveTab/);
});

test('Reports Center includes printable/exportable Management Summary without replacing existing reports', () => {
  assert.match(dashboard, /'management'/);
  assert.match(dashboard, /Management Summary/);
  assert.match(dashboard, /Gross Profit — This Month/);
  assert.match(dashboard, /Outstanding Expected Purchase Cost/);
  assert.match(dashboard, /Refunds Recorded Today/);
  assert.match(dashboard, /Sales Report/);
  assert.match(dashboard, /Inventory Report/);
  assert.match(dashboard, /Low Stock Report/);
  assert.match(dashboard, /Stock Movement Report/);
  assert.match(dashboard, /handlePrintReport/);
  assert.match(dashboard, /handleExportReportCsv/);
});
