// Minimal Supabase type definitions generated from schema.sql for typed clients.
// Keep in sync with Supabase DB schema when tables or columns change.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          nickname: string;
          real_name: string;
          favorite_genres: string[] | null;
          recommended_book: string | null;
          profile_emoji: string | null;
          profile_bg_color: string | null;
          role: "pending" | "member" | "admin";
          expires_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          nickname: string;
          real_name: string;
          favorite_genres?: string[] | null;
          recommended_book?: string | null;
          profile_emoji?: string | null;
          profile_bg_color?: string | null;
          role?: "pending" | "member" | "admin";
          expires_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      schedules: {
        Row: {
          id: string;
          date: string;
          place: string;
          book_title: string;
          book_link: string | null;
          genre_tag: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          date: string;
          place: string;
          book_title: string;
          book_link?: string | null;
          genre_tag?: string | null;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["schedules"]["Insert"]>;
        Relationships: [];
      };
      schedule_attendees: {
        Row: {
          schedule_id: string;
          user_id: string;
          is_attending: boolean | null;
          fee_paid: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          schedule_id: string;
          user_id: string;
          is_attending?: boolean | null;
          fee_paid?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["schedule_attendees"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "schedule_attendees_schedule_id_fkey";
            columns: ["schedule_id"];
            referencedRelation: "schedules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_attendees_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      reviews: {
        Row: {
          id: string;
          schedule_id: string | null;
          author_id: string | null;
          title: string;
          content_rich: Json;
          content_markdown: string | null;
          view_count: number;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          schedule_id?: string | null;
          author_id?: string | null;
          title: string;
          content_rich: Json;
          content_markdown?: string | null;
          view_count?: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey";
            columns: ["author_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_schedule_id_fkey";
            columns: ["schedule_id"];
            referencedRelation: "schedules";
            referencedColumns: ["id"];
          }
        ];
      };
      review_comments: {
        Row: {
          id: string;
          review_id: string | null;
          author_id: string | null;
          body: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          review_id?: string | null;
          author_id?: string | null;
          body: string;
          created_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["review_comments"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "review_comments_author_id_fkey";
            columns: ["author_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_comments_review_id_fkey";
            columns: ["review_id"];
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          }
        ];
      };
      review_highlights: {
        Row: {
          id: string;
          review_id: string | null;
          author_id: string | null;
          highlight_text: string;
          start_pos: number | null;
          end_pos: number | null;
          reaction: string[] | null;
          comment: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          review_id?: string | null;
          author_id?: string | null;
          highlight_text: string;
          start_pos?: number | null;
          end_pos?: number | null;
          reaction?: string[] | null;
          comment?: string | null;
          created_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["review_highlights"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "review_highlights_author_id_fkey";
            columns: ["author_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_highlights_review_id_fkey";
            columns: ["review_id"];
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          }
        ];
      };
      quotes: {
        Row: {
          id: string;
          schedule_id: string | null;
          author_id: string | null;
          page_number: string | null;
          text: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          schedule_id?: string | null;
          author_id?: string | null;
          page_number?: string | null;
          text: string;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["quotes"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "quotes_author_id_fkey";
            columns: ["author_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_schedule_id_fkey";
            columns: ["schedule_id"];
            referencedRelation: "schedules";
            referencedColumns: ["id"];
          }
        ];
      };
      topics: {
        Row: {
          id: string;
          schedule_id: string | null;
          author_id: string | null;
          title: string;
          body_rich: Json;
          body_markdown: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          schedule_id?: string | null;
          author_id?: string | null;
          title: string;
          body_rich: Json;
          body_markdown?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["topics"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "topics_author_id_fkey";
            columns: ["author_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "topics_schedule_id_fkey";
            columns: ["schedule_id"];
            referencedRelation: "schedules";
            referencedColumns: ["id"];
          }
        ];
      };
      topic_comments: {
        Row: {
          id: string;
          topic_id: string | null;
          author_id: string | null;
          body: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          topic_id?: string | null;
          author_id?: string | null;
          body: string;
          created_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["topic_comments"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "topic_comments_author_id_fkey";
            columns: ["author_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "topic_comments_topic_id_fkey";
            columns: ["topic_id"];
            referencedRelation: "topics";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      user_role: "pending" | "member" | "admin";
    };
    CompositeTypes: {};
  };
}
