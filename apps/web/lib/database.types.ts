import type { BookStatus, ProgressStructure, UnitType } from './types';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      books: {
        Row: {
          id: string;
          title: string;
          type: string;
          unit_type: UnitType | null;
          progress_structure: ProgressStructure | null;
          parent_progress: number | null;
          parent_total: number | null;
          latest_units: number | null;
          is_ongoing: boolean | null;
          author: string | null;
          status: BookStatus;
          rating: number | null;
          progress: number | null;
          total_units: number | null;
          genre_tags: string | null;
          source_link: string | null;
          cover_url: string | null;
          reading_pace: number | null;
          date_started: string | null;
          date_finished: string | null;
          notes: string | null;
          is_favorite: boolean | null;
          series_name: string | null;
          series_order: number | null;
          shelf_names: string | null;
          reread_count: number | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          type?: string;
          unit_type?: UnitType | null;
          progress_structure?: ProgressStructure | null;
          parent_progress?: number | null;
          parent_total?: number | null;
          latest_units?: number | null;
          is_ongoing?: boolean | null;
          author?: string | null;
          status?: BookStatus;
          rating?: number | null;
          progress?: number | null;
          total_units?: number | null;
          genre_tags?: string | null;
          source_link?: string | null;
          cover_url?: string | null;
          reading_pace?: number | null;
          date_started?: string | null;
          date_finished?: string | null;
          notes?: string | null;
          is_favorite?: boolean | null;
          series_name?: string | null;
          series_order?: number | null;
          shelf_names?: string | null;
          reread_count?: number | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          type?: string;
          unit_type?: UnitType | null;
          progress_structure?: ProgressStructure | null;
          parent_progress?: number | null;
          parent_total?: number | null;
          latest_units?: number | null;
          is_ongoing?: boolean | null;
          author?: string | null;
          status?: BookStatus;
          rating?: number | null;
          progress?: number | null;
          total_units?: number | null;
          genre_tags?: string | null;
          source_link?: string | null;
          cover_url?: string | null;
          reading_pace?: number | null;
          date_started?: string | null;
          date_finished?: string | null;
          notes?: string | null;
          is_favorite?: boolean | null;
          series_name?: string | null;
          series_order?: number | null;
          shelf_names?: string | null;
          reread_count?: number | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reading_journeys: {
        Row: {
          id: string;
          user_id: string | null;
          book_id: string;
          journey_index: number;
          status: string;
          date_started: string;
          date_finished: string | null;
          rating: number | null;
          review: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          book_id: string;
          journey_index?: number;
          status?: string;
          date_started?: string;
          date_finished?: string | null;
          rating?: number | null;
          review?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          book_id?: string;
          journey_index?: number;
          status?: string;
          date_started?: string;
          date_finished?: string | null;
          rating?: number | null;
          review?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reading_log: {
        Row: {
          id: string;
          book_id: string;
          journey_id: string | null;
          from_progress: number | null;
          to_progress: number;
          parent_progress: number | null;
          duration_seconds: number | null;
          note: string | null;
          logged_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          journey_id?: string | null;
          from_progress?: number | null;
          to_progress: number;
          parent_progress?: number | null;
          duration_seconds?: number | null;
          note?: string | null;
          logged_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          journey_id?: string | null;
          from_progress?: number | null;
          to_progress?: number;
          parent_progress?: number | null;
          duration_seconds?: number | null;
          note?: string | null;
          logged_at?: string;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          id: string;
          key: string;
          value: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      record_progress: {
        Args: {
          p_book_id: string;
          p_to_progress: number;
          p_note?: string | null;
          p_create_log?: boolean;
          p_journey_id?: string | null;
          p_from_progress?: number | null;
          p_logged_at?: string | null;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
