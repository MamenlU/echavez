import { getSessionItem, removeSessionItem, setSessionItem } from './browserStorage';
import { getDashboardPath, type AppRole } from './authSession';

const STORAGE_KEY = 'rayjin_post_auth_redirect';
const CUSTOMER_MESSAGES_PATH = '/customer/dashboard?tab=messages';
const MAX_AGE_MS = 30 * 60 * 1000;

type StoredRedirect = {
  path: string;
  createdAt: number;
};

export function rememberCustomerMessagesRedirect() {
  const payload: StoredRedirect = {
    path: CUSTOMER_MESSAGES_PATH,
    createdAt: Date.now(),
  };

  setSessionItem(STORAGE_KEY, JSON.stringify(payload));
}

export function consumePostAuthRedirect(role: string | undefined) {
  const supportedRoles: AppRole[] = ['customer', 'admin', 'cashier', 'super_admin'];
  const fallback = role && supportedRoles.includes(role as AppRole)
    ? getDashboardPath(role as AppRole)
    : '/customer/dashboard';

  const raw = getSessionItem(STORAGE_KEY);
  removeSessionItem(STORAGE_KEY);

  if (!raw || role !== 'customer') {
    return fallback;
  }

  try {
    const stored = JSON.parse(raw) as StoredRedirect;
    const isFresh =
      Number.isFinite(stored.createdAt) &&
      Date.now() - stored.createdAt <= MAX_AGE_MS;

    if (isFresh && stored.path === CUSTOMER_MESSAGES_PATH) {
      return CUSTOMER_MESSAGES_PATH;
    }
  } catch {
    // Ignore malformed/stale session data and use the normal dashboard.
  }

  return fallback;
}
