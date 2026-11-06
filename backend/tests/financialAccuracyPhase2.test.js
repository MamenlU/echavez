import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarizeFinancialRows } from '../lib/financialMetrics.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, '..');
const projectRoot = path.resolve(backendRoot, '..', 'project');

const financialSource = fs.readFileSync(path.join(backendRoot, 'lib', 'financialMetrics.js'), 'utf8');
const analyticsSource = fs.readFileSync(path.join(backendRoot, 'lib', 'analyticsService.js'), 'utf8');
const salesRoute = fs.readFileSync(path.join(backendRoot, 'routes', 'sales.js'), 'utf8');
const dashboardSource = fs.readFileSync(path.join(projectRoot, 'src', 'pages', 'AdminDashboard.tsx'), 'utf8');
const operationsSource = fs.readFileSync(path.join(projectRoot, 'src', 'components', 'AdminOperationsAnalytics.tsx'), 'utf8');
const schema = fs.readFileSync(path.join(projectRoot, 'schema.sql'), 'utf8');

test('Phase 2 financial calculation layer remains read-only as later phases extend the schema', () => {
  const tableCount = (schema.match(/CREATE TABLE `/g) || []).length;
  assert.ok(tableCount >= 15);
  assert.doesNotMatch(financialSource, /\b(?:INSERT|UPDATE|DELETE|REPLACE)\s+/i);
  assert.doesNotMatch(analyticsSource, /\b(?:INSERT|UPDATE|DELETE|REPLACE)\s+/i);
  assert.doesNotMatch(schema, /CREATE TABLE `(?:cogs|profit|gross_profit|financial_summary)`/i);
});

test('financial summary separates merchandise, discounts, fees, COGS, gross profit, and gross margin', () => {
  const summary = summarizeFinancialRows([
    {
      net_merchandise_sales: 800,
      gross_merchandise_sales: 1000,
      discount_amount: 200,
      service_revenue: 50,
      delivery_revenue: 0,
      total_revenue: 850,
      cogs: 500,
      total_quantity: 4,
    },
    {
      net_merchandise_sales: 500,
      gross_merchandise_sales: 500,
      discount_amount: 0,
      service_revenue: 0,
      delivery_revenue: 100,
      total_revenue: 600,
      cogs: 300,
      total_quantity: 2,
    },
  ]);

  assert.equal(summary.total_sales, 2);
  assert.equal(summary.total_gross_merchandise_sales, 1500);
  assert.equal(summary.total_discounts, 200);
  assert.equal(summary.total_net_merchandise_sales, 1300);
  assert.equal(summary.total_fee_revenue, 150);
  assert.equal(summary.total_revenue, 1450);
  assert.equal(summary.total_cogs, 800);
  assert.equal(summary.total_gross_profit, 500);
  assert.equal(summary.total_gross_profit_margin, 38.46);
  assert.equal(summary.total_items_sold, 6);
});

test('online-order discount does not reduce COGS or get mixed with delivery/service revenue', () => {
  assert.match(financialSource, /COALESCE\(o\.total, 0\).*AS net_merchandise_sales/s);
  assert.match(financialSource, /o\.discount_amount/);
  assert.match(financialSource, /o\.service_fee/);
  assert.match(financialSource, /o\.delivery_fee/);
  assert.match(financialSource, /quantity \* supplier_price/);
  assert.match(financialSource, /grossProfit = money\(netMerchandiseSales - cogs\)/);
  assert.match(financialSource, /grossProfit \/ netMerchandiseSales/);
});

test('top-selling monetary analytics proportionally allocate online-order discounts', () => {
  assert.match(analyticsSource, /netSaleItemRevenueSql/);
  assert.match(financialSource, /o\.total, 0\) \/ NULLIF\(o\.original_subtotal, 0\)/);
  assert.match(analyticsSource, /SUM\(GREATEST\(si\.quantity - COALESCE\(returned\.returned_quantity, 0\), 0\)\) AS quantity_sold/);
  assert.match(analyticsSource, /COALESCE\(returned\.refunded_amount, 0\)/);
});

test('Sales History reuses the centralized financial service instead of its old total_amount minus COGS formula', () => {
  assert.match(salesRoute, /getSalesFinancialHistory/);
  assert.doesNotMatch(salesRoute, /ROUND\(s\.total_amount - COALESCE\(costs\.cogs/);
});

test('Admin financial UI labels inventory cost and retail value separately', () => {
  assert.match(dashboardSource, /Inventory Cost Value/);
  assert.match(dashboardSource, /Potential Retail Value/);
  assert.match(dashboardSource, /Gross Profit Margin/);
  assert.match(dashboardSource, /Net Merchandise Sales/);
  assert.match(dashboardSource, /Service \/ Delivery Revenue/);
  assert.match(operationsSource, /Net Merchandise Sales/);
  assert.match(operationsSource, /merchandise only/);
});
