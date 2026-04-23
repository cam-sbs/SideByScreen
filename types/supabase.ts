export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type NotificationType =
  | "film_added"
  | "film_tagged"
  | "film_untagged"
  | "film_seen"
  | "screening_invited"
  | "screening_cancelled";

export type ScreeningParticipantStatus =
  | "pending"
  | "accepted"
  | "cancelled";

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
      film_screenings: {
        Row: {
          id: string;
          group_film_id: string;
          scheduled_by_user_id: string;
          scheduled_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_film_id: string;
          scheduled_by_user_id: string;
          scheduled_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_film_id?: string;
          scheduled_by_user_id?: string;
          scheduled_at?: string;
          created_at?: string;
        };
      };
      screening_participants: {
        Row: {
          screening_id: string;
          user_id: string;
          status: ScreeningParticipantStatus;
          responded_at: string | null;
        };
        Insert: {
          screening_id: string;
          user_id: string;
          status?: ScreeningParticipantStatus;
          responded_at?: string | null;
        };
        Update: {
          screening_id?: string;
          user_id?: string;
          status?: ScreeningParticipantStatus;
          responded_at?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          group_film_id: string | null;
          screening_id: string | null;
          triggered_by_user_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          group_film_id?: string | null;
          screening_id?: string | null;
          triggered_by_user_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: NotificationType;
          group_film_id?: string | null;
          screening_id?: string | null;
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
      lookup_group_by_invite_code: {
        Args: { code: string };
        Returns: { id: string; name: string }[];
      };
      create_film_screening: {
        Args: {
          p_group_film_id: string;
          p_scheduled_at: string;
          p_participant_ids: string[];
        };
        Returns: string;
      };
      respond_to_screening: {
        Args: { p_screening_id: string; p_accept: boolean };
        Returns: void;
      };
    };
    Enums: {
      notification_type: NotificationType;
      screening_participant_status: ScreeningParticipantStatus;
    };
  };
}
