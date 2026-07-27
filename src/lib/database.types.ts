// Supabase Database type definitions
// Can be regenerated with `supabase gen types typescript` later

export type Database = {
  public: {
    Tables: {
      couples: {
        Row: {
          id: string;
          invite_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          invite_code: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          invite_code?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar: string;
          couple_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          avatar: string;
          couple_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          avatar?: string;
          couple_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      wishes: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      diary_entries: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      checkins: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      stickers: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      points: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      rewards: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      notifications: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
    };
    Views: Record<string, { Row: Record<string, unknown>; Relationships: [] }>;
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;
    Enums: Record<string, string>;
  };
};