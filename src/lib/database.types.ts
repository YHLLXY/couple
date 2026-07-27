// Supabase Database type definitions
// Currently a minimal placeholder — can be regenerated with `supabase gen types typescript` later

export type Database = {
  public: {
    Tables: {
      couples: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      users: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      wishes: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      diary_entries: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      checkins: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      stickers: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      points: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      rewards: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      notifications: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
    };
  };
};