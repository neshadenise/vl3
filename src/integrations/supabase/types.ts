export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      closet_items: {
        Row: {
          back_url: string | null
          brand: string | null
          category: string
          closet_id: string | null
          color: string | null
          created_at: string
          custom_fields: Json
          favorite: boolean
          gender: string | null
          id: string
          image_url: string
          name: string
          notes: string | null
          price: number | null
          season: string | null
          source: string | null
          subcategory: string | null
          tags: string[]
          user_id: string
        }
        Insert: {
          back_url?: string | null
          brand?: string | null
          category: string
          closet_id?: string | null
          color?: string | null
          created_at?: string
          custom_fields?: Json
          favorite?: boolean
          gender?: string | null
          id?: string
          image_url: string
          name: string
          notes?: string | null
          price?: number | null
          season?: string | null
          source?: string | null
          subcategory?: string | null
          tags?: string[]
          user_id: string
        }
        Update: {
          back_url?: string | null
          brand?: string | null
          category?: string
          closet_id?: string | null
          color?: string | null
          created_at?: string
          custom_fields?: Json
          favorite?: boolean
          gender?: string | null
          id?: string
          image_url?: string
          name?: string
          notes?: string | null
          price?: number | null
          season?: string | null
          source?: string | null
          subcategory?: string | null
          tags?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "closet_items_closet_id_fkey"
            columns: ["closet_id"]
            isOneToOne: false
            referencedRelation: "closets"
            referencedColumns: ["id"]
          },
        ]
      }
      closet_subcategories: {
        Row: {
          category: string
          closet_id: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          category: string
          closet_id?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          category?: string
          closet_id?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "closet_subcategories_closet_id_fkey"
            columns: ["closet_id"]
            isOneToOne: false
            referencedRelation: "closets"
            referencedColumns: ["id"]
          },
        ]
      }
      closets: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          cover: string | null
          created_at: string
          description: string | null
          id: string
          look_ids: Json
          name: string
          user_id: string
        }
        Insert: {
          cover?: string | null
          created_at?: string
          description?: string | null
          id?: string
          look_ids?: Json
          name: string
          user_id: string
        }
        Update: {
          cover?: string | null
          created_at?: string
          description?: string | null
          id?: string
          look_ids?: Json
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      looks: {
        Row: {
          created_at: string
          id: string
          image_url: string
          item_ids: Json
          model_id: string | null
          name: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          item_ids?: Json
          model_id?: string | null
          name: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          item_ids?: Json
          model_id?: string | null
          name?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      models: {
        Row: {
          base_image_url: string
          created_at: string
          current_image_url: string
          history: Json
          id: string
          is_child: boolean
          is_infant: boolean
          name: string
          pose: string
          prompt: string
          user_id: string
          worn_item_ids: Json
        }
        Insert: {
          base_image_url: string
          created_at?: string
          current_image_url: string
          history?: Json
          id?: string
          is_child?: boolean
          is_infant?: boolean
          name: string
          pose: string
          prompt: string
          user_id: string
          worn_item_ids?: Json
        }
        Update: {
          base_image_url?: string
          created_at?: string
          current_image_url?: string
          history?: Json
          id?: string
          is_child?: boolean
          is_infant?: boolean
          name?: string
          pose?: string
          prompt?: string
          user_id?: string
          worn_item_ids?: Json
        }
        Relationships: []
      }
      moodboards: {
        Row: {
          created_at: string
          id: string
          name: string
          palette: Json
          pins: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          palette?: Json
          pins?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          palette?: Json
          pins?: Json
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
