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
          is_deactivated: boolean;
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
          is_deactivated?: boolean;
          expires_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      user_profiles: {
        Row: {
          user_id: string;
          profile_image_url: string | null;
          profile_decoration: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          profile_image_url?: string | null;
          profile_decoration?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["user_profiles"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "user_profiles_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      schedules: {
        Row: {
          id: string;
          date: string;
          place: string;
          book_title: string;
          book_link: string | null;
          genre_tag: string | null;
          cohort: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          date: string;
          place: string;
          book_title: string;
          book_link?: string | null;
          genre_tag?: string | null;
          cohort?: number | null;
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
          requested_attending: boolean | null;
          actual_attended: boolean | null;
          fee_paid: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          schedule_id: string;
          user_id: string;
          is_attending?: boolean | null;
          requested_attending?: boolean | null;
          actual_attended?: boolean | null;
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
      content_rich: string;
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
      content_rich: string;
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
      highlight_comments: {
        Row: {
          id: string;
          highlight_id: string | null;
          author_id: string | null;
          body: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          highlight_id?: string | null;
          author_id?: string | null;
          body: string;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["highlight_comments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "highlight_comments_highlight_id_fkey";
            columns: ["highlight_id"];
            referencedRelation: "review_highlights";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "highlight_comments_author_id_fkey";
            columns: ["author_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      highlight_comment_replies: {
        Row: {
          id: string;
          comment_id: string | null;
          author_id: string | null;
          body: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          comment_id?: string | null;
          author_id?: string | null;
          body: string;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["highlight_comment_replies"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "highlight_comment_replies_comment_id_fkey";
            columns: ["comment_id"];
            referencedRelation: "highlight_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "highlight_comment_replies_author_id_fkey";
            columns: ["author_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      highlight_comment_reactions: {
        Row: {
          id: string;
          comment_id: string | null;
          user_id: string | null;
          emoji: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          comment_id?: string | null;
          user_id?: string | null;
          emoji: string;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["highlight_comment_reactions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "highlight_comment_reactions_comment_id_fkey";
            columns: ["comment_id"];
            referencedRelation: "highlight_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "highlight_comment_reactions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      review_reactions: {
        Row: {
          id: string;
          review_id: string | null;
          user_id: string | null;
          emoji: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          review_id?: string | null;
          user_id?: string | null;
          emoji: string;
          created_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["review_reactions"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "review_reactions_review_id_fkey";
            columns: ["review_id"];
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_reactions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
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
      quote_reactions: {
        Row: {
          id: string;
          quote_id: string | null;
          user_id: string | null;
          emoji: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          quote_id?: string | null;
          user_id?: string | null;
          emoji: string;
          created_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["quote_reactions"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "quote_reactions_quote_id_fkey";
            columns: ["quote_id"];
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_reactions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
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
      review_comment_replies: {
        Row: {
          id: string;
          comment_id: string | null;
          author_id: string | null;
          body: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          comment_id?: string | null;
          author_id?: string | null;
          body: string;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["review_comment_replies"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "review_comment_replies_comment_id_fkey";
            columns: ["comment_id"];
            referencedRelation: "review_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_comment_replies_author_id_fkey";
            columns: ["author_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      topic_comment_replies: {
        Row: {
          id: string;
          comment_id: string | null;
          author_id: string | null;
          body: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          comment_id?: string | null;
          author_id?: string | null;
          body: string;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["topic_comment_replies"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "topic_comment_replies_comment_id_fkey";
            columns: ["comment_id"];
            referencedRelation: "topic_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "topic_comment_replies_author_id_fkey";
            columns: ["author_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      point_transactions: {
        Row: {
          id: string;
          user_id: string;
          schedule_id: string | null;
          source_type: string;
          source_id: string | null;
          points: number;
          memo: string | null;
          created_by: string | null;
          created_at: string;
          cohort: number;
          idempotency_key: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          schedule_id?: string | null;
          source_type: string;
          source_id?: string | null;
          points: number;
          memo?: string | null;
          created_by?: string | null;
          created_at?: string;
          cohort?: number;
          idempotency_key: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["point_transactions"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "point_transactions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "point_transactions_schedule_id_fkey";
            columns: ["schedule_id"];
            referencedRelation: "schedules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "point_transactions_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {};
    Functions: {
      delete_point_transactions_for_source: {
        Args: {
          p_source_type: string;
          p_source_ids: string[];
          p_cohort?: number;
        };
        Returns: void;
      };
      recompute_review_rank_bonus_points: {
        Args: {
          p_schedule_id: string;
          p_cohort?: number;
        };
        Returns: void;
      };
    };
    Enums: {
      user_role: "pending" | "member" | "admin";
    };
    CompositeTypes: {};
  };
}
