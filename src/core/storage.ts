const STORAGE_PREFIX = 'sweetbean_';

function key(raw: string): string {
  return STORAGE_PREFIX + raw;
}

export const storage = {
  get<T = unknown>(rawKey: string, fallback?: T): T | null {
    try {
      const raw = localStorage.getItem(key(rawKey));
      if (raw === null) return fallback ?? null;
      return JSON.parse(raw) as T;
    } catch {
      console.warn(`[Storage] Failed to read "${rawKey}", returning fallback.`);
      return fallback ?? null;
    }
  },

  set<T = unknown>(rawKey: string, value: T): void {
    try {
      localStorage.setItem(key(rawKey), JSON.stringify(value));
    } catch {
      console.warn(`[Storage] Failed to write "${rawKey}".`);
    }
  },

  remove(rawKey: string): void {
    try {
      localStorage.removeItem(key(rawKey));
    } catch {
      console.warn(`[Storage] Failed to remove "${rawKey}".`);
    }
  },

  has(rawKey: string): boolean {
    return localStorage.getItem(key(rawKey)) !== null;
  },

  clearAll(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      console.warn('[Storage] Failed to clear all items.');
    }
  },
};