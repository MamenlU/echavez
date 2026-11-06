import fs from 'node:fs/promises';
import path from 'node:path';
import {
  safelyDeleteStoredImage,
  storeProductImage,
  storeReceiptImage,
} from '../lib/imageStorage.js';

const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const uploadsRoot = path.resolve(process.env.LEGACY_UPLOADS_DIR || 'backend/uploads');
const contentTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

if (!supabaseUrl || !serviceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

async function rest(pathname, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${pathname}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`Database request failed (${response.status}): ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

function localFileFor(legacyUrl) {
  const normalized = String(legacyUrl).replace(/^\/api\/uploads\//, '');
  const segments = normalized.split('/').filter(Boolean);
  const candidate = path.resolve(uploadsRoot, ...segments);
  if (!candidate.startsWith(`${uploadsRoot}${path.sep}`)) throw new Error('Unsafe legacy upload path.');
  return candidate;
}

async function asDataUrl(legacyUrl) {
  const filePath = localFileFor(legacyUrl);
  const contentType = contentTypes[path.extname(filePath).toLowerCase()];
  if (!contentType) throw new Error(`Unsupported legacy image type: ${path.extname(filePath)}`);
  const data = await fs.readFile(filePath);
  return `data:${contentType};base64,${data.toString('base64')}`;
}

async function migrateProducts() {
  const rows = await rest('products?select=id,image&image=like.%2Fapi%2Fuploads%2F*');
  let migrated = 0;
  for (const row of rows) {
    let storedUrl = null;
    try {
      storedUrl = await storeProductImage(await asDataUrl(row.image));
      await rest(`products?id=eq.${encodeURIComponent(row.id)}&image=eq.${encodeURIComponent(row.image)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ image: storedUrl }),
      });
      migrated += 1;
    } catch (error) {
      await safelyDeleteStoredImage(storedUrl);
      throw new Error(`Product ${row.id} migration failed: ${error.message}`);
    }
  }
  return migrated;
}

async function migrateReceipts() {
  const rows = await rest(
    'inventory_movements?select=movement_id,receipt_path&receipt_path=like.%2Fapi%2Fuploads%2F*'
  );
  let migrated = 0;
  for (const row of rows) {
    let storedReference = null;
    try {
      storedReference = await storeReceiptImage(await asDataUrl(row.receipt_path));
      await rest(
        `inventory_movements?movement_id=eq.${encodeURIComponent(row.movement_id)}&receipt_path=eq.${encodeURIComponent(row.receipt_path)}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ receipt_path: storedReference }),
        }
      );
      migrated += 1;
    } catch (error) {
      await safelyDeleteStoredImage(storedReference);
      throw new Error(`Inventory movement ${row.movement_id} migration failed: ${error.message}`);
    }
  }
  return migrated;
}

const [products, receipts] = await Promise.all([migrateProducts(), migrateReceipts()]);
console.log(JSON.stringify({ migratedProductImages: products, migratedReceiptImages: receipts }));
