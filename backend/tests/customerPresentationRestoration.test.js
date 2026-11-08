/** Source-level regression checks for panel-reviewed customer GUI restoration.
 * Browser/device checks are still required before deployment. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const app = read('project/src/App.tsx');
const footer = read('project/src/components/Footer.tsx');
const projectFooter = read('project/src/components/ProjectFooter.tsx');
const project = read('project/src/pages/ProjectOverview.tsx');
const projectNavigation = read('project/src/components/ProjectNavbar.tsx');
const home = read('project/src/pages/Home.tsx');
const hero = read('project/src/components/Hero.tsx');
const customer = read('project/src/pages/CustomerDashboard.tsx');
const payment = read('project/src/pages/PaymentReturn.tsx');

test('Storefront, customer dashboard, auth, and payment routes share one retail footer component', () => {
  assert.match(app, /<ConditionalFooter\s*\/>/);
  assert.match(app, /return <Footer showNavigationSections=\{false\}\s*\/>/);
  assert.match(customer, /<Footer\s*\/>/);
  assert.match(payment, /<Footer showNavigationSections=\{false\}\s*\/>/);
  assert.equal((customer.match(/<Footer\s*\/>/g) || []).length, 1);
  assert.match(footer, /Rayjin Hardware store footer/);
});

test('footer LOGO alone links to interactive Capstone Presentation, without visible presentation promotion', () => {
  assert.match(footer, /<Link\s+to="\/project"[\s\S]*?<Wrench/);
  assert.equal((footer.match(/to="\/project"/g) || []).length, 1);
  assert.doesNotMatch(footer, /Open Interactive Presentation|<Presentation\b|Footer shopping navigation|<nav\b|>Explore</);
  assert.match(app, /path="\/project" element=\{<ProjectOverview\s*\/>\}/);
  assert.match(project, /<ProjectNavbar\s*\/>/);
  assert.match(project, /<BusinessInsights\s*\/>/);
  assert.match(project, /<InterfaceExperience\s*\/>/);
  assert.match(projectFooter, /Return to Storefront/);
});

test('presentation retains original interactive section navigation and responsive menu', () => {
  assert.match(projectNavigation, /scrollIntoView\(\{/);
  assert.match(projectNavigation, /handleSectionNavigation/);
  assert.match(projectNavigation, /setOpen\(false\)/);
  for (const anchor of ['#overview','#interfaces','#customers','#admin','#insights','#controls','#process','#tech','#future']) {
    assert.ok(projectNavigation.includes(anchor), `missing ${anchor}`);
  }
});

test('Storefront restores the original light-green truck hero while retaining catalog enhancements', () => {
  assert.match(hero, /Project-ready hardware\./);
  assert.match(hero, /Easier ordering\./);
  assert.match(hero, /bg-\[#eef7f0\]/);
  assert.match(hero, /rayjin-storefront-hero\.png/);
  assert.match(hero, /onShopProductsClick/);
  assert.match(hero, /Browse Categories/);
  assert.match(home, /<Hero/);
  assert.match(home, /New customer welcome offer/);
  assert.match(home, /<PremiumCategoryShowcase/);
  assert.match(home, /addProductToCustomerCart/);
  assert.match(home, /Sort products/);
});

test('Customer Dashboard restores original truck hero and retains all transactional tabs', () => {
  assert.match(customer, /Rayjin Hardware Customer Hub/);
  assert.match(customer, /Your project starts/);
  assert.match(customer, /with the right supplies/);
  assert.match(customer, /rayjin-storefront-hero\.png/);
  assert.match(customer, /Welcome back, \{customerDisplayName\}/);
  assert.match(customer, /Track My Orders/);
  assert.match(customer, /Message Rayjin/);
  assert.doesNotMatch(customer, /Your account at a glance/);
  for (const tab of ['catalog','orders','cart','messages','profile']) {
    assert.ok(customer.includes(`activeTab === '${tab}'`), `missing customer tab ${tab}`);
  }
});

test('all retail footers show the exact approved 3 sections and usable contact actions', () => {
  for (const title of ['Built for every project!', 'Shopping with Rayjin', 'Visit &amp; Contact', 'Pickup at the store', 'Local delivery where available', 'Online product availability']) {
    assert.ok(footer.includes(title), `missing ${title}`);
  }
  assert.match(footer, /Your local destination for hardware and construction supplies/);
  assert.match(footer, /RAYJIN_CONTACT\.address/);
  assert.match(footer, /href=\{RAYJIN_CONTACT\.phoneHref\}/);
  assert.match(footer, /href=\{RAYJIN_CONTACT\.emailHref\}/);
  assert.doesNotMatch(footer, /MySQL\/MariaDB|Release candidate|live acceptance pending|Browse Products|Track My Orders|My Account/i);
});
