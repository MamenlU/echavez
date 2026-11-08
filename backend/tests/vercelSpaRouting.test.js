import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));

test('Vercel sends API routes to Express before the SPA fallback', () => {
  const apiIndex = config.rewrites.findIndex((rule) => rule.source === '/api/:path*');
  const spaIndex = config.rewrites.findIndex(
    (rule) => rule.source === '/(.*)' && rule.destination === '/index.html'
  );
  assert.ok(apiIndex >= 0);
  assert.ok(spaIndex > apiIndex);
});

test('Vercel deep links load React payment return routes', () => {
  const app = fs.readFileSync(new URL('../../project/src/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /path="\/payment\/success"\s+element=\{<PaymentReturn\s*\/>\}/);
  assert.match(app, /path="\/payment\/failed"\s+element=\{<PaymentReturn\s*\/>\}/);
});
