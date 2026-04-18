export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type NotificationType = "film_added" | "film_tagged" | "film_seen";

export interface Database {
  public: {
    Tables: {
      groups: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          invite_code?: string;
          created_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          name: string;
          avatar_url: string | null;
          email: string;
          group_id: string | null;
        };
        Insert: {
          id: string;
          name: string;
          avatar_url?: string | null;
          email: string;
          group_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          avatar_url?: string | null;
          email?: string;
          group_id?: string | null;
        };
      };
      group_films: {
        Row: {
          id: string;
          group_id: string;
          tmdb_id: number;
          added_by_user_id: string;
          added_at: string;
          visible: boolean;
        };
        Insert: {
          id?: string;
          group_id: string;
          tmdb_id: number;
          added_by_user_id: string;
          added_at?: string;
          visible?: boolean;
        };
        Update: {
          id?: string;
          group_id?: string;
          tmdb_id?: number;
          added_by_user_id?: string;
          added_at?: string;
          visible?: boolean;
        };
      };
      user_film_tags: {
        Row: {
          user_id: string;
          group_film_id: string;
          is_seen: boolean;
          is_tagged: boolean;
          seen_at: string | null;
        };
        Insert: {
          user_id: string;
          group_film_id: string;
          is_seen?: boolean;
          is_tagged?: boolean;
          seen_at?: string | null;
        };
        Update: {
          user_id?: string;
          group_film_id?: string;
          is_seen?: boolean;
          is_tagged?: boolean;
          seen_at?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          group_film_id: string | null;
          triggered_by_user_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          group_film_id?: string | null;
          triggered_by_user_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: NotificationType;
          group_film_id?: string | null;
          triggered_by_user_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_and_join_group: {
        Args: { group_name: string };
        Returns: string;
      };
      join_group_by_code: {
        Args: { code: string };
        Returns: string;
      };
    };
    Enums: {
      notification_type: NotificationType;
    };
  };
}
