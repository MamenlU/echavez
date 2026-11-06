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
const navbar = read('src/components/Navbar.tsx');
const home = read('src/pages/Home.tsx');
const customer = read('src/pages/CustomerDashboard.tsx');
const categories = read('src/components/PremiumCategoryShowcase.tsx');
const confidence = read('src/components/CustomerConfidenceCards.tsx');
const journey = read('src/components/StorefrontOrderingJourney.tsx');
const conversion = read('src/components/StorefrontConversionHub.tsx');
const projectOverview = read('src/pages/ProjectOverview.tsx');
const projectHero = read('src/components/ProjectHero.tsx');
const interfaceExperience = read('src/components/InterfaceExperience.tsx');

const tableCount = (schema.match(/CREATE TABLE `/g) || []).length;

test('final customer-facing redesign is frontend-only and preserves the approved 22-table schema', () => {
  assert.equal(tableCount, 22);
  assert.doesNotMatch(
    [navbar, home, customer, categories, confidence, journey, conversion, interfaceExperience].join('\n'),
    /ALTER TABLE|DROP TABLE|CREATE TABLE IF NOT EXISTS/i,
  );
});

test('Storefront and Customer Dashboard reuse one premium category component backed by live category/product data', () => {
  assert.match(home, /<PremiumCategoryShowcase/);
  assert.match(customer, /<PremiumCategoryShowcase/);
  assert.match(home, /categoryNames/);
  assert.match(customer, /activeCategoriesOnly/);
  assert.match(categories, /products\.filter\(\(product\) => product\.category === category\)\.length/);
  assert.match(categories, /Category names and product counts come from the current Rayjin Hardware catalog/);
  assert.doesNotMatch(categories, /fake|placeholder product count/i);
});

test('Customer confidence cards are keyboard-accessible toggles and preserve real payment/approval rules', () => {
  assert.match(confidence, /aria-expanded=\{expanded\}/);
  assert.match(confidence, /aria-controls=\{contentId\}/);
  assert.match(confidence, /Standard Pickup, Shop & Go express pickup, and Local Delivery/);
  assert.match(confidence, /PayMongo Card\/GCash orders must satisfy the existing payment-verification rules before approval/);
  assert.match(confidence, /My Orders/);
  assert.match(confidence, /Customer Messages/);
});

test('public ordering journey explains browse, account, fulfillment, payment verification, and tracking consistently', () => {
  for (const text of [
    'Browse live products',
    'Sign in & build your cart',
    'Choose fulfillment',
    'Complete payment & review',
    'Track through completion',
    'Standard Pickup, Shop & Go, or supported Local Delivery',
    'PayMongo verification rules',
  ]) {
    assert.match(journey, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(journey, /placing an online order does not bypass Rayjin Hardware review/);
});

test('Storefront conversion and support panel preserves customer registration, login, dashboard, and message destinations', () => {
  assert.match(conversion, /to="\/register\/customer"/);
  assert.match(conversion, /to="\/login"/);
  assert.match(conversion, /\/customer\/dashboard\?tab=catalog/);
  assert.match(conversion, /\/customer\/dashboard\?tab=messages/);
  assert.match(conversion, /rememberCustomerMessagesRedirect/);
  assert.match(conversion, /Pickup, Shop & Go, or Local Delivery/);
});

test('shared header keeps existing navigation behavior while improving desktop/mobile presentation safety', () => {
  assert.match(navbar, /publicNavClass/);
  assert.match(navbar, /dashboardTabClass/);
  assert.match(navbar, /max-h-\[calc\(100vh-4rem\)\] overflow-y-auto/);
  assert.match(navbar, /New POS Sale/);
  assert.match(navbar, /Messages/);
  assert.match(navbar, /Cart/);
  assert.match(navbar, /My Orders/);
});

test('Capstone Presentation now includes the final three-interface experience without overstating live acceptance', () => {
  assert.match(projectOverview, /<InterfaceExperience \/>/);
  assert.match(interfaceExperience, /Public Storefront/);
  assert.match(interfaceExperience, /Customer Dashboard/);
  assert.match(interfaceExperience, /Admin Console/);
  assert.match(interfaceExperience, /final browser\/MariaDB\/payment live acceptance remains a separate final step/);
  assert.match(projectHero, /final Admin, Storefront, Customer Dashboard, and presentation refinements/);
  assert.match(projectHero, /live acceptance remains intentionally pending/);
});

test('redesign does not introduce decorative business metrics, automatic approval claims, or automatic refund claims', () => {
  const customerFacing = [home, customer, categories, confidence, journey, conversion].join('\n');
  assert.doesNotMatch(customerFacing, /\+12%|\+28%|forecast growth|guaranteed approval|automatically approved/i);
  assert.doesNotMatch(customerFacing, /automatic PayMongo refund|PayMongo refund API/i);
});
