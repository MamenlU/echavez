const fs = require('fs');
const path = require('path');

const root = process.cwd();
const dashboardPath = path.join(root, 'src', 'pages', 'CustomerDashboard.tsx');
const mapPath = path.join(root, 'src', 'components', 'DeliveryLocationMap.tsx');

function fail(message) {
  console.error(`\n[STOPPED] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(dashboardPath)) {
  fail(`CustomerDashboard.tsx was not found at:\n${dashboardPath}\nRun this script from the project folder.`);
}
if (!fs.existsSync(mapPath)) {
  fail(`DeliveryLocationMap.tsx was not found at:\n${mapPath}\nRun this script from the project folder.`);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(dashboardPath, `${dashboardPath}.before-cart-ui-${timestamp}.bak`);
fs.copyFileSync(mapPath, `${mapPath}.before-cart-ui-${timestamp}.bak`);

function replaceOnce(text, oldText, newText, label) {
  const first = text.indexOf(oldText);
  if (first === -1) {
    fail(`Could not find the expected ${label} block. No source file was overwritten. Restore is not needed because the script stops before writing.`);
  }
  const second = text.indexOf(oldText, first + oldText.length);
  if (second !== -1) {
    fail(`Found more than one ${label} block. The patch stopped to avoid changing the wrong section.`);
  }
  return text.slice(0, first) + newText + text.slice(first + oldText.length);
}

let dashboard = fs.readFileSync(dashboardPath, 'utf8');
let map = fs.readFileSync(mapPath, 'utf8');

// 1) Reduce vertical whitespace in the cart workspace.
dashboard = replaceOnce(
  dashboard,
  `{activeTab === 'cart' && (\n        <div className="space-y-6 animate-fade-up">`,
  `{activeTab === 'cart' && (\n        <div className="space-y-4 animate-fade-up">`,
  'cart workspace spacing'
);

// 2) Compact, information-dense cart header with item count + subtotal.
dashboard = replaceOnce(
  dashboard,
  `<section className="rounded-[28px] border border-[#dfe9e2] bg-white px-5 py-6 shadow-[0_18px_45px_-34px_rgba(11,59,35,0.45)] sm:px-6">\n            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#15803d]">\n              Your order workspace\n            </p>\n            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#17372d]">\n              Your Shopping Cart\n            </h2>\n            <p className="mt-2 text-sm leading-6 text-[#61766d]">\n              Review your items, choose fulfillment, and complete checkout when you are ready.\n            </p>\n          </section>`,
  `<section className="rounded-[24px] border border-[#dfe9e2] bg-white px-5 py-4 shadow-[0_16px_38px_-32px_rgba(11,59,35,0.45)] sm:px-6">\n            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">\n              <div>\n                <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#15803d]">\n                  Your order workspace\n                </p>\n                <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-[#17372d]">\n                  Your Shopping Cart\n                </h2>\n                <p className="mt-1 text-xs leading-5 text-[#61766d]">\n                  Review items and finish checkout without losing your place.\n                </p>\n              </div>\n              <div className="flex items-center gap-2 text-[10px] font-bold text-[#61766d]">\n                <span className="rounded-full bg-[#f3f8f4] px-3 py-1.5">\n                  {cart.reduce((sum, item) => sum + item.quantity, 0)} item{cart.reduce((sum, item) => sum + item.quantity, 0) === 1 ? '' : 's'}\n                </span>\n                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">\n                  ₱{cartTotal.toFixed(2)}\n                </span>\n              </div>\n            </div>\n          </section>`,
  'cart header'
);

// 3) Balance desktop columns: 7/5 instead of 8/4.
dashboard = replaceOnce(
  dashboard,
  `<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">`,
  `<div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">`,
  'cart/checkout grid'
);

// 4) Give cart items their own compact scroll area on desktop.
dashboard = replaceOnce(
  dashboard,
  `{/* Cart Items List */}\n              <div className="lg:col-span-8 space-y-4 rounded-[28px] border border-[#deebe2] bg-white p-6 shadow-[0_16px_38px_-30px_rgba(11,59,35,0.55)]">\n                {cart.map(item => (`,
  `{/* Cart Items List */}\n              <div className="lg:col-span-7 rounded-[24px] border border-[#deebe2] bg-white p-4 shadow-[0_16px_38px_-30px_rgba(11,59,35,0.55)] sm:p-5">\n                <div className="mb-3 flex items-center justify-between border-b border-[#edf2ee] pb-3">\n                  <div>\n                    <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#15803d]">Cart items</p>\n                    <p className="mt-0.5 text-xs font-semibold text-[#61766d]">\n                      {cart.length} product{cart.length === 1 ? '' : 's'} in this order\n                    </p>\n                  </div>\n                  <span className="rounded-lg bg-[#f6faf7] px-3 py-2 text-xs font-extrabold text-[#17372d]">\n                    ₱{cartTotal.toFixed(2)}\n                  </span>\n                </div>\n                <div className="space-y-2 lg:max-h-[calc(100vh-15rem)] lg:overflow-y-auto lg:pr-1">\n                {cart.map(item => (`,
  'cart items panel'
);

dashboard = replaceOnce(
  dashboard,
  `                ))}\n              </div>\n\n              {/* Checkout Panel */}\n              <div className="lg:col-span-4">`,
  `                ))}\n                </div>\n              </div>\n\n              {/* Checkout Panel */}\n              <div className="lg:col-span-5">`,
  'cart items panel closing / checkout width'
);

// 5) Compact each item row without touching quantity logic or remove behavior.
dashboard = replaceOnce(
  dashboard,
  `<div key={item.product.id} className="flex gap-4 items-center border-b border-gray-50 pb-4 last:border-0 last:pb-0">`,
  `<div key={item.product.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#edf2ee] bg-[#fbfdfb] p-3 sm:flex-nowrap">`,
  'cart item row'
);

dashboard = replaceOnce(
  dashboard,
  `<div className="w-16 h-16 shrink-0 bg-gray-50 rounded-xl flex items-center justify-center text-3xl border border-gray-100">`,
  `<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-white text-2xl">`,
  'cart item image'
);

dashboard = replaceOnce(
  dashboard,
  `<span className="text-xs text-gray-500 font-medium block mt-0.5">₱{Number(item.product.price).toFixed(2)}{displayPriceUnit(item.product)} / unit</span>`,
  `<span className="mt-0.5 block text-[10px] font-medium text-gray-500">₱{Number(item.product.price).toFixed(2)}{displayPriceUnit(item.product)} / unit</span>`,
  'cart item unit price'
);

dashboard = replaceOnce(
  dashboard,
  `<div className="flex items-center gap-2 border border-gray-200 rounded-lg p-1">`,
  `<div className="ml-auto flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white p-1 sm:ml-0">`,
  'cart quantity control'
);

dashboard = replaceOnce(
  dashboard,
  `<div className="text-right shrink-0">`,
  `<div className="ml-auto shrink-0 text-right">`,
  'cart line total'
);

// 6) Sticky desktop checkout workspace with independent scrollable form body.
dashboard = replaceOnce(
  dashboard,
  `<form onSubmit={handleCheckout} className="relative space-y-5 overflow-hidden rounded-[28px] border border-[#deebe2] bg-white p-6 shadow-[0_22px_48px_-34px_rgba(11,59,35,0.65)]">`,
  `<form\n                  onSubmit={handleCheckout}\n                  className="relative space-y-4 overflow-hidden rounded-[24px] border border-[#deebe2] bg-white p-4 shadow-[0_22px_48px_-34px_rgba(11,59,35,0.65)] sm:p-5 lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100vh-7rem)] lg:flex-col lg:space-y-0"\n                >`,
  'checkout form shell'
);

dashboard = replaceOnce(
  dashboard,
  `<h3 className="text-sm font-extrabold text-gray-950 tracking-wide uppercase border-b border-gray-100 pb-2">\n                    Checkout Summary\n                  </h3>\n\n                 {/* Fulfillment Selection */}`,
  `<h3 className="border-b border-gray-100 pb-3 text-sm font-extrabold uppercase tracking-wide text-gray-950 lg:shrink-0">\n                    Checkout Summary\n                  </h3>\n\n                  <div className="space-y-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:py-4 lg:pr-2">\n                 {/* Fulfillment Selection */}`,
  'checkout scroll body opening'
);

// 7) Keep totals + submit CTA visible at bottom of the checkout card on desktop.
dashboard = replaceOnce(
  dashboard,
  `                  {/* Price Calculations */}\n                  <div className="border-t border-gray-100 pt-4 space-y-2 text-xs text-gray-600">`,
  `                  </div>\n\n                  <div className="space-y-3 border-t border-gray-100 pt-4 lg:shrink-0">\n                  {/* Price Calculations */}\n                  <div className="space-y-1.5 text-[11px] text-gray-600">`,
  'checkout fixed footer opening'
);

dashboard = replaceOnce(
  dashboard,
  `<button\n                    type="submit"\n                    className="w-full py-3 bg-[#15803d] hover:bg-[#166534] text-white font-bold rounded-xl shadow-lg shadow-emerald-800/10 hover:-translate-y-0.5 active:scale-95 duration-100 transform text-xs tracking-wider uppercase flex items-center justify-center gap-2"\n                  >`,
  `<button\n                    type="submit"\n                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#15803d] py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-800/10 transition hover:-translate-y-0.5 hover:bg-[#166534] active:scale-[0.98]"\n                  >`,
  'checkout submit button styling'
);

dashboard = replaceOnce(
  dashboard,
  `                  </button>\n                </form>`,
  `                  </button>\n                  </div>\n                </form>`,
  'checkout fixed footer closing'
);

// 8) Slightly shorter responsive map to keep Delivery checkout compact.
map = replaceOnce(
  map,
  `className="h-72 w-full"`,
  `className="h-56 w-full sm:h-64"`,
  'delivery map height'
);

fs.writeFileSync(dashboardPath, dashboard, 'utf8');
fs.writeFileSync(mapPath, map, 'utf8');

console.log('\nCart / Checkout UI patch applied successfully.');
console.log('Backups were created beside both edited files.');
console.log('No pricing, cart calculations, checkout handlers, payment logic, order creation, or database code was changed.');
console.log('\nNext run:');
console.log('  npm.cmd run typecheck');
console.log('  npm.cmd run build');
