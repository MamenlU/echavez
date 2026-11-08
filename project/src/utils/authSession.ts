export type AppRole = 'customer' | 'admin' | 'cashier' | 'super_admin';

export interface StoredUser {
  role: AppRole;
  [key: string]: unknown;
}

export interface StoredSession {
  token: string;
  user: StoredUser;
}

export function clearStoredSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split('.');

    // If it is not a normal JWT, let the backend reject it later.
    if (parts.length !== 3) {
      return false;
    }

    let payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    while (payload.length % 4) {
      payload += '=';
    }

    const decoded = JSON.parse(atob(payload));

    if (typeof decoded.exp !== 'number') {
      return false;
    }

    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
}

export function getStoredSession(): StoredSession | null {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    return null;
  }

  try {
    const user = JSON.parse(userStr) as StoredUser;

    if (user.role !== 'customer' && user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'cashier') {
      clearStoredSession();
      return null;
    }

    if (isJwtExpired(token)) {
      clearStoredSession();
      return null;
    }

    return {
      token,
      user,
    };
  } catch {
    clearStoredSession();
    return null;
  }
}

export function getDashboardPath(role: AppRole) {
  return (role === 'admin' || role === 'super_admin') ? '/admin/dashboard' : role === 'cashier' ? '/cashier/dashboard' : '/customer/dashboard';
}