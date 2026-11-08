type BrowserStorage = 'local' | 'session';

function getStorage(kind: BrowserStorage): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function getLocalItem(key: string): string | null {
  try {
    return getStorage('local')?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function setLocalItem(key: string, value: string): boolean {
  try {
    const storage = getStorage('local');
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeLocalItem(key: string): void {
  try {
    getStorage('local')?.removeItem(key);
  } catch {
    // Storage can be disabled by browser privacy settings.
  }
}

export function getSessionItem(key: string): string | null {
  try {
    return getStorage('session')?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function setSessionItem(key: string, value: string): void {
  try {
    getStorage('session')?.setItem(key, value);
  } catch {
    // Optional redirect state should never prevent page rendering.
  }
}

export function removeSessionItem(key: string): void {
  try {
    getStorage('session')?.removeItem(key);
  } catch {
    // Optional redirect state should never prevent page rendering.
  }
}
