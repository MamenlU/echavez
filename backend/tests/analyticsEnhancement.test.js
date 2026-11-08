import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const analyticsSource = await readFile(new URL('../lib/analyticsService.js', import.meta.url), 'utf8');
const analyticsRouteSource = await readFile(new URL('../routes/analytics.js', import.meta.url), 'utf8');
const salesSource = await readFile(new URL('../routes/sales.js', import.meta.url), 'utf8');
const financialMetricsSource = await readFile(new URL('../lib/financialMetrics.js', import.meta.url), 'utf8');

test('analytics remains read-only and reuses the Sales Report valid-sale definition', () => {
  assert.match(analyticsSource, /s\.payment_status = 'Paid'/);
  assert.match(financialMetricsSource, /WHERE s\.payment_status = 'Paid'/);
  assert.doesNotMatch(analyticsSource, /\b(?:INSERT|UPDATE|DELETE|REPLACE)\s+/i);
  assert.doesNotMatch(financialMetricsSource, /\b(?:INSERT|UPDATE|DELETE|REPLACE)\s+/i);
});

test('daily operations uses the existing movement-ledger cost basis for COGS and inventory value', () => {
  assert.match(financialMetricsSource, /movement_type = 'Stock-Out'[\s\S]*sale_id IS NOT NULL/);
  assert.match(analyticsSource, /WHEN movement_type = 'Stock-In' THEN quantity \* supplier_price/);
  assert.match(analyticsSource, /WHEN movement_type = 'Stock-Out' THEN -\(quantity \* supplier_price\)/);
  assert.match(financialMetricsSource, /gross_profit/);
});

test('inventory activity uses the frozen low-stock rule and derives period beginning stock without a summary table', () => {
  assert.match(analyticsSource, /currentStock - stockIn \+ stockOut/);
  assert.match(analyticsSource, /currentStock === 0 \|\| currentStock < reorderLevel/);
  assert.doesNotMatch(analyticsSource, /daily_inventory_summary|top_selling_products|stock_in_history|stock_out_history/i);
});

test('popular products are public read-only analytics and filter to customer-visible active in-stock products', () => {
  assert.match(analyticsSource, /p\.status = 'active' AND p\.stock > 0/);
  assert.match(analyticsSource, /c\.status = 'Active'/);
  assert.match(analyticsRouteSource, /router\.get\('\/popular'/);
  assert.match(analyticsRouteSource, /router\.get\('\/admin', authenticateToken, requireAdmin/);
});
