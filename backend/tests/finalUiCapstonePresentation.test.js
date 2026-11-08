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
const sidebar = read('src/components/AdminSidebar.tsx');
const navbar = read('src/components/Navbar.tsx');
const app = read('src/App.tsx');
const projectOverview = read('src/pages/ProjectOverview.tsx');
const projectNavbar = read('src/components/ProjectNavbar.tsx');
const projectHero = read('src/components/ProjectHero.tsx');
const insights = read('src/components/BusinessInsights.tsx');
const capabilities = read('src/components/Capabilities.tsx');
const tech = read('src/components/TechStack.tsx');
const content = read('src/data/content.ts');

const countTables = (sql) => (sql.match(/CREATE TABLE `/g) || []).length;

test('final UI scope remains frontend-only and preserves the approved 22-table schema', () => {
  assert.equal(countTables(schema), 22);
  assert.doesNotMatch([sidebar, navbar, projectOverview, projectHero, insights, capabilities, tech, content].join('\n'), /ALTER TABLE|DROP TABLE|CREATE TABLE IF NOT EXISTS/i);
});

test('Daily Operations sidebar restores POS / New Sale while preserving accordion group behavior', () => {
  assert.match(sidebar, /key: 'daily'[\s\S]*tab: 'orders'[\s\S]*tab: 'pos', label: 'POS \/ New Sale'[\s\S]*tab: 'cashierShift'[\s\S]*tab: 'saleAdjustments'/);
  assert.match(sidebar, /text-\[13px\] font-semibold/);
  assert.match(sidebar, /setExpanded\(\(current\) => \(\{[\s\S]*daily:[\s\S]*inventory:[\s\S]*setup:[\s\S]*finance:[\s\S]*security:/);
});

test('Admin header keeps New POS Sale, Messages, profile and responsive mobile access without Orders duplication', () => {
  assert.match(navbar, /New POS Sale/);
  assert.match(navbar, /Messages/);
  assert.match(navbar, /System Admin/);
  assert.match(navbar, /lg:hidden/);
  assert.match(navbar, /hidden items-center gap-2 lg:flex/);
  assert.doesNotMatch(navbar, /adminOrderAttentionCount/);
});

test('Capstone Presentation route is preserved and refreshed with the current release-candidate flow', () => {
  assert.match(app, /path="\/project" element=\{<ProjectOverview \/>\}/);
  assert.match(projectOverview, /<BusinessInsights \/>/);
  for (const link of ['Overview', 'Customers', 'Admin', 'Insights', 'Controls', 'Process', 'Architecture', 'Future']) {
    assert.match(projectNavbar, new RegExp(`label: '${link}'`));
  }
  assert.match(projectHero, /Release Candidate/);
  assert.match(projectHero, /Full live acceptance pending/);
});

test('presentation content reflects verified customer and professional Admin capabilities', () => {
  for (const text of [
    'First-Order Discount', 'Shop & Go', 'Local Delivery', 'Customer Messaging',
    'Cashier Shift & Reconciliation', 'Returns, Refunds & POS Voids', 'Purchase Orders',
    'Reorder Suggestions', 'Expense Management', 'Centralized Audit Logs', 'Estimated Net Profit',
  ]) {
    assert.match(content, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('financial presentation uses established definitions rather than treating sales as profit', () => {
  assert.match(content, /Net Merchandise Sales/);
  assert.match(content, /Gross Merchandise Sales − Discounts − Merchandise Refunds/);
  assert.match(content, /Gross Profit = Net Merchandise Sales − COGS/);
  assert.match(content, /Gross Profit \+ Service\/Delivery Revenue − Operating Expenses/);
  assert.match(insights, /management estimate, not a full accounting, tax, payroll, or general-ledger statement/i);
});

test('presentation architecture reports the verified 22-table structure and central inventory-ledger principle', () => {
  assert.doesNotMatch(content, /15-table relational database/);
  assert.match(content, /approved 22-table relational architecture/);
  for (const table of [
    'categories', 'delivery_rates', 'inventory_movements', 'orders', 'order_items',
    'order_status_history', 'password_reset_tokens', 'payments', 'products', 'sales',
    'sale_items', 'suppliers', 'users', 'conversations', 'conversation_messages',
    'audit_logs', 'sale_adjustments', 'sale_adjustment_items', 'purchase_orders',
    'purchase_order_items', 'cashier_shifts', 'expenses',
  ]) {
    assert.match(content, new RegExp(`'${table}'`));
  }
  assert.match(tech, /15 core tables/);
  assert.match(tech, /7 professional expansion tables/);
  assert.match(tech, /inventory_movements remains the source ledger/);
});

test('security presentation stays within implemented role-aware access and audit scope', () => {
  assert.match(content, /Role-Aware Access & Auditability/);
  assert.match(content, /does not claim a fine-grained enterprise permission matrix/);
  assert.match(content, /automatic PayMongo refunds are not claimed/);
  assert.match(capabilities, /without claiming unsupported enterprise security features/);
});
