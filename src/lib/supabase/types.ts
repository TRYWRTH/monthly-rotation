export type Flow = "none" | "spotting" | "light" | "medium" | "heavy";

export type Profile = {
  id: string;
  display_name: string;
  pair_id: string | null;
  avg_cycle_length: number;
  avg_period_length: number;
  created_at: string;
};

export type Pair = {
  id: string;
  invite_code: string;
  created_at: string;
};

export type CycleStart = {
  id: string;
  user_id: string;
  start_date: string;
  created_at: string;
};

export type DailyLog = {
  id: string;
  user_id: string;
  log_date: string;
  mood: string | null;
  energy: number | null;
  symptoms: string[];
  flow: Flow | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/** Partner-visible subset of a DailyLog — no symptoms or free-text notes. */
export type PartnerLogSummary = {
  id: string;
  user_id: string;
  log_date: string;
  mood: string | null;
  energy: number | null;
  flow: Flow | null;
  created_at: string;
};

export type CycleKnowledgeRow = {
  id: string;
  content: unknown;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      pairs: {
        Row: Pair;
        Insert: Partial<Pair>;
        Update: Partial<Pair>;
        Relationships: [];
      };
      cycle_starts: {
        Row: CycleStart;
        Insert: Partial<CycleStart> & { user_id: string; start_date: string };
        Update: Partial<CycleStart>;
        Relationships: [];
      };
      daily_logs: {
        Row: DailyLog;
        Insert: Partial<DailyLog> & { user_id: string; log_date: string };
        Update: Partial<DailyLog>;
        Relationships: [];
      };
      cycle_knowledge: {
        Row: CycleKnowledgeRow;
        Insert: Partial<CycleKnowledgeRow> & { id: string; content: unknown };
        Update: Partial<CycleKnowledgeRow>;
        Relationships: [];
      };
    };
    Views: {
      partner_log_summary: {
        Row: PartnerLogSummary;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
