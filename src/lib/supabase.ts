import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Please create a .env file in the project root. Run `cp .env.example .env` and fill in your Supabase keys.'
  );
}

export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

/** 检查网络是否可用 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/** 离线降级：包装 Supabase 调用，离线时静默返回 fallback */
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: Error | null }>,
  fallback: T | null = null,
): Promise<T | null> {
  if (!isOnline()) {
    console.warn('[Supabase] Offline — skipping query, returning fallback.');
    return fallback;
  }
  try {
    const { data, error } = await queryFn();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] Query failed:', (err as Error).message);
    return fallback;
  }
}