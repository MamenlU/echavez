import { randomUUID } from 'node:crypto';

const STORAGE_REFERENCE_PREFIX = 'supabase-storage://';
const PRODUCT_BUCKET = 'product-images';
const RECEIPT_BUCKET = 'receipts';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function storageConfig() {
  const projectRef = String(process.env.SUPABASE_PROJECT_REF || '').trim();
  const url = String(
    process.env.SUPABASE_URL || (projectRef ? `https://${projectRef}.supabase.co` : '')
  ).replace(/\/$/, '');
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return { url, key };
}

function httpError(message, statusCode = 500) {
  return Object.assign(new Error(message), { statusCode });
}

function parseDataImage(value, { label, allowGif = false }) {
  const match = String(value || '').match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/);
  if (!match || (!allowGif && match[1] === 'image/gif')) {
    throw httpError(`${label} must be a JPG, PNG${allowGif ? ', WEBP, or GIF' : ', or WEBP'} image.`, 400);
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw httpError(`${label} must not exceed 5 MB.`, 400);
  }

  return { buffer, contentType: match[1], extension: MIME_EXTENSIONS[match[1]] };
}

function requireStorageConfig() {
  const config = storageConfig();
  if (!config.url || !config.key) {
    throw httpError('Image storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  return config;
}

async function storageRequest(path, options = {}) {
  const { url, key } = requireStorageConfig();
  const response = await fetch(`${url}/storage/v1${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('Supabase Storage request failed:', response.status, detail.slice(0, 500));
    throw httpError('Unable to save the image. Please try again.');
  }
  return response;
}

function privateReference(bucket, objectPath) {
  return `${STORAGE_REFERENCE_PREFIX}${bucket}/${objectPath}`;
}

export function parseStorageReference(value) {
  if (!String(value || '').startsWith(STORAGE_REFERENCE_PREFIX)) return null;
  const remainder = String(value).slice(STORAGE_REFERENCE_PREFIX.length);
  const separator = remainder.indexOf('/');
  if (separator < 1 || separator === remainder.length - 1) return null;
  return { bucket: remainder.slice(0, separator), objectPath: remainder.slice(separator + 1) };
}

function parsePublicStorageUrl(value) {
  const { url } = storageConfig();
  const prefix = `${url}/storage/v1/object/public/`;
  if (!url || !String(value || '').startsWith(prefix)) return null;
  const remainder = String(value).slice(prefix.length);
  const separator = remainder.indexOf('/');
  if (separator < 1 || separator === remainder.length - 1) return null;
  return { bucket: remainder.slice(0, separator), objectPath: remainder.slice(separator + 1) };
}

async function uploadImage(dataUrl, { bucket, folder, label, isPublic, allowGif = false }) {
  const { buffer, contentType, extension } = parseDataImage(dataUrl, { label, allowGif });
  const objectPath = `${folder}/${Date.now()}-${randomUUID()}.${extension}`;
  await storageRequest(`/object/${bucket}/${objectPath}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType, 'x-upsert': 'false' },
    body: buffer,
  });

  if (!isPublic) return privateReference(bucket, objectPath);
  const { url } = requireStorageConfig();
  return `${url}/storage/v1/object/public/${bucket}/${objectPath}`;
}

export async function storeProductImage(value) {
  if (!String(value || '').startsWith('data:image/')) return value;
  return uploadImage(value, {
    bucket: PRODUCT_BUCKET,
    folder: 'products',
    label: 'Product image',
    isPublic: true,
    allowGif: true,
  });
}

export async function storeReceiptImage(value, label = 'Receipt image') {
  if (!value) return null;
  return uploadImage(value, {
    bucket: RECEIPT_BUCKET,
    folder: 'inventory',
    label,
    isPublic: false,
  });
}

export async function createSignedImageUrl(value, expiresIn = 900) {
  const reference = parseStorageReference(value);
  if (!reference) return value;
  const response = await storageRequest(
    `/object/sign/${reference.bucket}/${reference.objectPath}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn }),
    }
  );
  const payload = await response.json();
  const { url } = requireStorageConfig();
  const signedPath = payload.signedURL || payload.signedUrl;
  if (!signedPath) throw httpError('Unable to open the stored image.');
  return signedPath.startsWith('http') ? signedPath : `${url}/storage/v1${signedPath}`;
}

export async function deleteStoredImage(value) {
  const reference = parseStorageReference(value) || parsePublicStorageUrl(value);
  if (!reference) return false;
  await storageRequest(`/object/${reference.bucket}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: [reference.objectPath] }),
  });
  return true;
}

export async function safelyDeleteStoredImage(value) {
  try {
    return await deleteStoredImage(value);
  } catch (error) {
    console.error('Unable to clean up stored image:', error.message);
    return false;
  }
}

export const imageStorageBuckets = {
  products: PRODUCT_BUCKET,
  receipts: RECEIPT_BUCKET,
};
