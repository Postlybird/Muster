export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_role: string;
          after: Json | null;
          before: Json | null;
          context: NonNullable<Json>;
          created_at: string;
          id: string;
          ip: unknown;
          record_id: string | null;
          subject_profile_id: string | null;
          table_name: string | null;
          user_agent: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_role: string;
          after?: Json | null;
          before?: Json | null;
          context?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          ip?: unknown;
          record_id?: string | null;
          subject_profile_id?: string | null;
          table_name?: string | null;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_role?: string;
          after?: Json | null;
          before?: Json | null;
          context?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          ip?: unknown;
          record_id?: string | null;
          subject_profile_id?: string | null;
          table_name?: string | null;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          active: boolean;
          archived_at: string | null;
          code: string;
          created_at: string;
          default_level: number;
          description: string;
          id: string;
          min_engagement_hours: number;
          name: string;
          police_check_required: boolean;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          archived_at?: string | null;
          code: string;
          created_at?: string;
          default_level?: number;
          description?: string;
          id?: string;
          min_engagement_hours?: number;
          name: string;
          police_check_required?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          archived_at?: string | null;
          code?: string;
          created_at?: string;
          default_level?: number;
          description?: string;
          id?: string;
          min_engagement_hours?: number;
          name?: string;
          police_check_required?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      category_credentials: {
        Row: {
          category_id: string;
          created_at: string;
          credential_type_id: string;
        };
        ComputedFields: never;
        Insert: {
          category_id: string;
          created_at?: string;
          credential_type_id: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          credential_type_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "category_credentials_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "category_credentials_credential_type_id_fkey";
            columns: ["credential_type_id"];
            isOneToOne: false;
            referencedRelation: "credential_types";
            referencedColumns: ["id"];
          },
        ];
      };
      category_ppe: {
        Row: {
          category_id: string;
          created_at: string;
          ppe_item_id: string;
        };
        ComputedFields: never;
        Insert: {
          category_id: string;
          created_at?: string;
          ppe_item_id: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          ppe_item_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "category_ppe_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "category_ppe_ppe_item_id_fkey";
            columns: ["ppe_item_id"];
            isOneToOne: false;
            referencedRelation: "ppe_items";
            referencedColumns: ["id"];
          },
        ];
      };
      credential_types: {
        Row: {
          active: boolean;
          archived_at: string | null;
          code: string;
          created_at: string;
          description: string;
          has_expiry: boolean;
          has_number: boolean;
          id: string;
          issuer: string | null;
          kind: Database["public"]["Enums"]["credential_kind"];
          name: string;
          needs_document: boolean;
          sort_order: number;
          updated_at: string;
          verification_method: Database["public"]["Enums"]["verification_method"];
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          archived_at?: string | null;
          code: string;
          created_at?: string;
          description?: string;
          has_expiry?: boolean;
          has_number?: boolean;
          id?: string;
          issuer?: string | null;
          kind?: Database["public"]["Enums"]["credential_kind"];
          name: string;
          needs_document?: boolean;
          sort_order?: number;
          updated_at?: string;
          verification_method?: Database["public"]["Enums"]["verification_method"];
        };
        Update: {
          active?: boolean;
          archived_at?: string | null;
          code?: string;
          created_at?: string;
          description?: string;
          has_expiry?: boolean;
          has_number?: boolean;
          id?: string;
          issuer?: string | null;
          kind?: Database["public"]["Enums"]["credential_kind"];
          name?: string;
          needs_document?: boolean;
          sort_order?: number;
          updated_at?: string;
          verification_method?: Database["public"]["Enums"]["verification_method"];
        };
        Relationships: [];
      };
      dev_outbox: {
        Row: {
          body: string;
          channel: string;
          created_at: string;
          id: string;
          meta: NonNullable<Json>;
          recipient: string;
          subject: string | null;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          channel: string;
          created_at?: string;
          id?: string;
          meta?: NonNullable<Json>;
          recipient: string;
          subject?: string | null;
        };
        Update: {
          body?: string;
          channel?: string;
          created_at?: string;
          id?: string;
          meta?: NonNullable<Json>;
          recipient?: string;
          subject?: string | null;
        };
        Relationships: [];
      };
      hazards: {
        Row: {
          active: boolean;
          archived_at: string | null;
          code: string;
          created_at: string;
          description: string;
          id: string;
          name: string;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          archived_at?: string | null;
          code: string;
          created_at?: string;
          description?: string;
          id?: string;
          name: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          archived_at?: string | null;
          code?: string;
          created_at?: string;
          description?: string;
          id?: string;
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      ppe_items: {
        Row: {
          active: boolean;
          archived_at: string | null;
          code: string;
          created_at: string;
          description: string;
          id: string;
          name: string;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          archived_at?: string | null;
          code: string;
          created_at?: string;
          description?: string;
          id?: string;
          name: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          archived_at?: string | null;
          code?: string;
          created_at?: string;
          description?: string;
          id?: string;
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          archived_at: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          notification_prefs: NonNullable<Json>;
          phone: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          notification_prefs?: NonNullable<Json>;
          phone?: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          notification_prefs?: NonNullable<Json>;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          created_at: string;
          description: string;
          is_public: boolean;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string;
          is_public?: boolean;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          created_at?: string;
          description?: string;
          is_public?: boolean;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      hook_send_email: { Args: { event: Json }; Returns: Json };
      hook_send_sms: { Args: { event: Json }; Returns: Json };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      log_access_event: {
        Args: {
          p_action: string;
          p_context?: Json;
          p_ip?: unknown;
          p_record_id: string;
          p_subject_profile_id?: string;
          p_table_name: string;
          p_user_agent?: string;
        };
        Returns: undefined;
      };
      my_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      normalise_auth_phone: { Args: { raw: string }; Returns: string };
    };
    Enums: {
      credential_kind: "ticket" | "licence" | "police_check" | "wwcc";
      user_role: "worker" | "business_user" | "admin";
      verification_method: "manual" | "register_check" | "provider_api";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      credential_kind: ["ticket", "licence", "police_check", "wwcc"],
      user_role: ["worker", "business_user", "admin"],
      verification_method: ["manual", "register_check", "provider_api"],
    },
  },
} as const;
