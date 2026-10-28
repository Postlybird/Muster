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
      agreement_acceptances: {
        Row: {
          accepted_at: string;
          agreement_id: string;
          business_id: string | null;
          created_at: string;
          id: string;
          ip: unknown;
          profile_id: string;
          user_agent: string | null;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string;
          agreement_id: string;
          business_id?: string | null;
          created_at?: string;
          id?: string;
          ip?: unknown;
          profile_id: string;
          user_agent?: string | null;
        };
        Update: {
          accepted_at?: string;
          agreement_id?: string;
          business_id?: string | null;
          created_at?: string;
          id?: string;
          ip?: unknown;
          profile_id?: string;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "agreement_acceptances_agreement_id_fkey";
            columns: ["agreement_id"];
            isOneToOne: false;
            referencedRelation: "agreements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agreement_acceptances_business_fk";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agreement_acceptances_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      agreements: {
        Row: {
          archived_at: string | null;
          body_md: string;
          created_at: string;
          created_by: string | null;
          id: string;
          is_current: boolean;
          jurisdiction: string | null;
          kind: Database["public"]["Enums"]["agreement_kind"];
          published_at: string | null;
          title: string;
          updated_at: string;
          version: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          body_md: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_current?: boolean;
          jurisdiction?: string | null;
          kind: Database["public"]["Enums"]["agreement_kind"];
          published_at?: string | null;
          title: string;
          updated_at?: string;
          version: string;
        };
        Update: {
          archived_at?: string | null;
          body_md?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_current?: boolean;
          jurisdiction?: string | null;
          kind?: Database["public"]["Enums"]["agreement_kind"];
          published_at?: string | null;
          title?: string;
          updated_at?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agreements_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agreements_jurisdiction_fkey";
            columns: ["jurisdiction"];
            isOneToOne: false;
            referencedRelation: "jurisdictions";
            referencedColumns: ["code"];
          },
        ];
      };
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
      availability_blocks: {
        Row: {
          created_at: string;
          date: string;
          id: string;
          note: string | null;
          worker_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          date: string;
          id?: string;
          note?: string | null;
          worker_id: string;
        };
        Update: {
          created_at?: string;
          date?: string;
          id?: string;
          note?: string | null;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "availability_blocks_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
      availability_weekly: {
        Row: {
          created_at: string;
          end_time: string;
          id: string;
          start_time: string;
          weekday: number;
          worker_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          end_time: string;
          id?: string;
          start_time: string;
          weekday: number;
          worker_id: string;
        };
        Update: {
          created_at?: string;
          end_time?: string;
          id?: string;
          start_time?: string;
          weekday?: number;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "availability_weekly_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
      bill_rate_rules: {
        Row: {
          archived_at: string | null;
          business_id: string | null;
          category_id: string | null;
          created_at: string;
          created_by: string | null;
          effective_from: string;
          effective_to: string | null;
          fixed_night_cents: number | null;
          fixed_ordinary_cents: number | null;
          fixed_overtime_cents: number | null;
          fixed_public_holiday_cents: number | null;
          fixed_saturday_cents: number | null;
          fixed_sunday_cents: number | null;
          id: string;
          margin_pct: number | null;
          method: Database["public"]["Enums"]["bill_method"];
          notes: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          business_id?: string | null;
          category_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          effective_from: string;
          effective_to?: string | null;
          fixed_night_cents?: number | null;
          fixed_ordinary_cents?: number | null;
          fixed_overtime_cents?: number | null;
          fixed_public_holiday_cents?: number | null;
          fixed_saturday_cents?: number | null;
          fixed_sunday_cents?: number | null;
          id?: string;
          margin_pct?: number | null;
          method?: Database["public"]["Enums"]["bill_method"];
          notes?: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          business_id?: string | null;
          category_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          effective_from?: string;
          effective_to?: string | null;
          fixed_night_cents?: number | null;
          fixed_ordinary_cents?: number | null;
          fixed_overtime_cents?: number | null;
          fixed_public_holiday_cents?: number | null;
          fixed_saturday_cents?: number | null;
          fixed_sunday_cents?: number | null;
          id?: string;
          margin_pct?: number | null;
          method?: Database["public"]["Enums"]["bill_method"];
          notes?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bill_rate_rules_business_fk";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bill_rate_rules_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bill_rate_rules_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      business_user_sites: {
        Row: {
          business_user_id: string;
          created_at: string;
          site_id: string;
        };
        ComputedFields: never;
        Insert: {
          business_user_id: string;
          created_at?: string;
          site_id: string;
        };
        Update: {
          business_user_id?: string;
          created_at?: string;
          site_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_user_sites_business_user_id_fkey";
            columns: ["business_user_id"];
            isOneToOne: false;
            referencedRelation: "business_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_user_sites_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
        ];
      };
      business_users: {
        Row: {
          accepted_at: string | null;
          archived_at: string | null;
          business_id: string;
          created_at: string;
          id: string;
          invite_email: string | null;
          invited_at: string | null;
          invited_by: string | null;
          profile_id: string | null;
          role: Database["public"]["Enums"]["business_role"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          archived_at?: string | null;
          business_id: string;
          created_at?: string;
          id?: string;
          invite_email?: string | null;
          invited_at?: string | null;
          invited_by?: string | null;
          profile_id?: string | null;
          role: Database["public"]["Enums"]["business_role"];
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          archived_at?: string | null;
          business_id?: string;
          created_at?: string;
          id?: string;
          invite_email?: string | null;
          invited_at?: string | null;
          invited_by?: string | null;
          profile_id?: string | null;
          role?: Database["public"]["Enums"]["business_role"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_users_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_users_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_users_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      businesses: {
        Row: {
          abn: string;
          abn_status: string;
          abn_status_from: string | null;
          abr_checked_at: string;
          abr_postcode: string | null;
          abr_state: string | null;
          account_terms_approved: boolean;
          accounts_email: string | null;
          acn: string | null;
          approved_at: string | null;
          approved_by: string | null;
          archived_at: string | null;
          billing_contact_name: string | null;
          billing_contact_phone: string | null;
          created_at: string;
          created_by: string | null;
          entity_type: string | null;
          entity_type_code: string | null;
          gst_registered: boolean;
          gst_registered_from: string | null;
          id: string;
          legal_name: string;
          onboarding_steps: string[];
          payment_terms_days: number | null;
          status: Database["public"]["Enums"]["business_status"];
          status_reason: string | null;
          stripe_customer_id: string | null;
          submitted_at: string | null;
          trading_name: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          abn: string;
          abn_status: string;
          abn_status_from?: string | null;
          abr_checked_at: string;
          abr_postcode?: string | null;
          abr_state?: string | null;
          account_terms_approved?: boolean;
          accounts_email?: string | null;
          acn?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          archived_at?: string | null;
          billing_contact_name?: string | null;
          billing_contact_phone?: string | null;
          created_at?: string;
          created_by?: string | null;
          entity_type?: string | null;
          entity_type_code?: string | null;
          gst_registered?: boolean;
          gst_registered_from?: string | null;
          id?: string;
          legal_name: string;
          onboarding_steps?: string[];
          payment_terms_days?: number | null;
          status?: Database["public"]["Enums"]["business_status"];
          status_reason?: string | null;
          stripe_customer_id?: string | null;
          submitted_at?: string | null;
          trading_name?: string | null;
          updated_at?: string;
        };
        Update: {
          abn?: string;
          abn_status?: string;
          abn_status_from?: string | null;
          abr_checked_at?: string;
          abr_postcode?: string | null;
          abr_state?: string | null;
          account_terms_approved?: boolean;
          accounts_email?: string | null;
          acn?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          archived_at?: string | null;
          billing_contact_name?: string | null;
          billing_contact_phone?: string | null;
          created_at?: string;
          created_by?: string | null;
          entity_type?: string | null;
          entity_type_code?: string | null;
          gst_registered?: boolean;
          gst_registered_from?: string | null;
          id?: string;
          legal_name?: string;
          onboarding_steps?: string[];
          payment_terms_days?: number | null;
          status?: Database["public"]["Enums"]["business_status"];
          status_reason?: string | null;
          stripe_customer_id?: string | null;
          submitted_at?: string | null;
          trading_name?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "businesses_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "businesses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
          workers_comp_pct: number | null;
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
          workers_comp_pct?: number | null;
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
          workers_comp_pct?: number | null;
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
      identity_checks: {
        Row: {
          created_at: string;
          document_path: string | null;
          document_reference: string | null;
          document_type: Database["public"]["Enums"]["identity_document"];
          id: string;
          images_deleted_at: string | null;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          selfie_path: string | null;
          status: Database["public"]["Enums"]["check_status"];
          updated_at: string;
          worker_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          document_path?: string | null;
          document_reference?: string | null;
          document_type: Database["public"]["Enums"]["identity_document"];
          id?: string;
          images_deleted_at?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          selfie_path?: string | null;
          status?: Database["public"]["Enums"]["check_status"];
          updated_at?: string;
          worker_id: string;
        };
        Update: {
          created_at?: string;
          document_path?: string | null;
          document_reference?: string | null;
          document_type?: Database["public"]["Enums"]["identity_document"];
          id?: string;
          images_deleted_at?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          selfie_path?: string | null;
          status?: Database["public"]["Enums"]["check_status"];
          updated_at?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "identity_checks_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "identity_checks_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: true;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
      jurisdictions: {
        Row: {
          code: string;
          created_at: string;
          licence_required: boolean;
          licensing_body: string | null;
          name: string;
          notes: string;
          show_licence_on_invoice: boolean;
          updated_at: string;
          worker_notice_required: boolean;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          created_at?: string;
          licence_required?: boolean;
          licensing_body?: string | null;
          name: string;
          notes?: string;
          show_licence_on_invoice?: boolean;
          updated_at?: string;
          worker_notice_required?: boolean;
        };
        Update: {
          code?: string;
          created_at?: string;
          licence_required?: boolean;
          licensing_body?: string | null;
          name?: string;
          notes?: string;
          show_licence_on_invoice?: boolean;
          updated_at?: string;
          worker_notice_required?: boolean;
        };
        Relationships: [];
      };
      licences: {
        Row: {
          archived_at: string | null;
          created_at: string;
          expires_on: string | null;
          holder_name: string;
          id: string;
          issued_on: string | null;
          jurisdiction: string;
          licence_number: string;
          notes: string;
          status: Database["public"]["Enums"]["licence_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          expires_on?: string | null;
          holder_name: string;
          id?: string;
          issued_on?: string | null;
          jurisdiction: string;
          licence_number: string;
          notes?: string;
          status?: Database["public"]["Enums"]["licence_status"];
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          expires_on?: string | null;
          holder_name?: string;
          id?: string;
          issued_on?: string | null;
          jurisdiction?: string;
          licence_number?: string;
          notes?: string;
          status?: Database["public"]["Enums"]["licence_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "licences_jurisdiction_fkey";
            columns: ["jurisdiction"];
            isOneToOne: false;
            referencedRelation: "jurisdictions";
            referencedColumns: ["code"];
          },
        ];
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
      public_holidays: {
        Row: {
          created_at: string;
          date: string;
          id: string;
          name: string;
          state: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          date: string;
          id?: string;
          name: string;
          state?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          date?: string;
          id?: string;
          name?: string;
          state?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      rate_cards: {
        Row: {
          archived_at: string | null;
          base_rate_cents: number;
          business_id: string | null;
          category_id: string;
          checked_by: string | null;
          checked_on: string | null;
          created_at: string;
          created_by: string | null;
          effective_from: string;
          effective_to: string | null;
          id: string;
          level: number;
          night_multiplier: number;
          notes: string;
          ordinary_multiplier: number;
          overtime_multiplier: number;
          public_holiday_multiplier: number;
          saturday_multiplier: number;
          sunday_multiplier: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          base_rate_cents: number;
          business_id?: string | null;
          category_id: string;
          checked_by?: string | null;
          checked_on?: string | null;
          created_at?: string;
          created_by?: string | null;
          effective_from: string;
          effective_to?: string | null;
          id?: string;
          level?: number;
          night_multiplier?: number;
          notes?: string;
          ordinary_multiplier?: number;
          overtime_multiplier?: number;
          public_holiday_multiplier?: number;
          saturday_multiplier?: number;
          sunday_multiplier?: number;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          base_rate_cents?: number;
          business_id?: string | null;
          category_id?: string;
          checked_by?: string | null;
          checked_on?: string | null;
          created_at?: string;
          created_by?: string | null;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          level?: number;
          night_multiplier?: number;
          notes?: string;
          ordinary_multiplier?: number;
          overtime_multiplier?: number;
          public_holiday_multiplier?: number;
          saturday_multiplier?: number;
          sunday_multiplier?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rate_cards_business_fk";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rate_cards_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rate_cards_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
      sites: {
        Row: {
          access_notes: string | null;
          address_line1: string;
          archived_at: string | null;
          business_id: string;
          created_at: string;
          geofence_radius_m: number | null;
          id: string;
          lat: number;
          lng: number;
          name: string;
          parking_notes: string | null;
          postcode: string;
          report_to_name: string | null;
          report_to_phone: string | null;
          state: string;
          suburb: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          access_notes?: string | null;
          address_line1: string;
          archived_at?: string | null;
          business_id: string;
          created_at?: string;
          geofence_radius_m?: number | null;
          id?: string;
          lat: number;
          lng: number;
          name: string;
          parking_notes?: string | null;
          postcode: string;
          report_to_name?: string | null;
          report_to_phone?: string | null;
          state: string;
          suburb: string;
          updated_at?: string;
        };
        Update: {
          access_notes?: string | null;
          address_line1?: string;
          archived_at?: string | null;
          business_id?: string;
          created_at?: string;
          geofence_radius_m?: number | null;
          id?: string;
          lat?: number;
          lng?: number;
          name?: string;
          parking_notes?: string | null;
          postcode?: string;
          report_to_name?: string | null;
          report_to_phone?: string | null;
          state?: string;
          suburb?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sites_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sites_state_fkey";
            columns: ["state"];
            isOneToOne: false;
            referencedRelation: "jurisdictions";
            referencedColumns: ["code"];
          },
        ];
      };
      work_rights: {
        Row: {
          basis: Database["public"]["Enums"]["right_to_work_basis"];
          checked_by: string | null;
          citizenship_evidence:
            Database["public"]["Enums"]["citizenship_evidence"] | null;
          created_at: string;
          evidence_deleted_at: string | null;
          evidence_path: string | null;
          id: string;
          next_check_due: string | null;
          passport_country: string | null;
          passport_number: string | null;
          rejection_reason: string | null;
          status: Database["public"]["Enums"]["check_status"];
          updated_at: string;
          vevo_checked_at: string | null;
          vevo_consent_at: string | null;
          vevo_reference: string | null;
          visa_conditions: string | null;
          visa_expiry: string | null;
          visa_grant_number: string | null;
          visa_subclass: string | null;
          work_limit_flag: boolean;
          worker_id: string;
        };
        ComputedFields: never;
        Insert: {
          basis: Database["public"]["Enums"]["right_to_work_basis"];
          checked_by?: string | null;
          citizenship_evidence?:
            Database["public"]["Enums"]["citizenship_evidence"] | null;
          created_at?: string;
          evidence_deleted_at?: string | null;
          evidence_path?: string | null;
          id?: string;
          next_check_due?: string | null;
          passport_country?: string | null;
          passport_number?: string | null;
          rejection_reason?: string | null;
          status?: Database["public"]["Enums"]["check_status"];
          updated_at?: string;
          vevo_checked_at?: string | null;
          vevo_consent_at?: string | null;
          vevo_reference?: string | null;
          visa_conditions?: string | null;
          visa_expiry?: string | null;
          visa_grant_number?: string | null;
          visa_subclass?: string | null;
          work_limit_flag?: boolean;
          worker_id: string;
        };
        Update: {
          basis?: Database["public"]["Enums"]["right_to_work_basis"];
          checked_by?: string | null;
          citizenship_evidence?:
            Database["public"]["Enums"]["citizenship_evidence"] | null;
          created_at?: string;
          evidence_deleted_at?: string | null;
          evidence_path?: string | null;
          id?: string;
          next_check_due?: string | null;
          passport_country?: string | null;
          passport_number?: string | null;
          rejection_reason?: string | null;
          status?: Database["public"]["Enums"]["check_status"];
          updated_at?: string;
          vevo_checked_at?: string | null;
          vevo_consent_at?: string | null;
          vevo_reference?: string | null;
          visa_conditions?: string | null;
          visa_expiry?: string | null;
          visa_grant_number?: string | null;
          visa_subclass?: string | null;
          work_limit_flag?: boolean;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_rights_checked_by_fkey";
            columns: ["checked_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_rights_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: true;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
      worker_categories: {
        Row: {
          category_id: string;
          created_at: string;
          level: number;
          worker_id: string;
          years_experience: number;
        };
        ComputedFields: never;
        Insert: {
          category_id: string;
          created_at?: string;
          level?: number;
          worker_id: string;
          years_experience?: number;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          level?: number;
          worker_id?: string;
          years_experience?: number;
        };
        Relationships: [
          {
            foreignKeyName: "worker_categories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "worker_categories_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
      worker_credentials: {
        Row: {
          archived_at: string | null;
          created_at: string;
          credential_type_id: string;
          document_deleted_at: string | null;
          document_path: string | null;
          expires_on: string | null;
          id: string;
          issued_on: string | null;
          last_expiry_warning_days: number | null;
          number: string | null;
          rejection_reason: string | null;
          status: Database["public"]["Enums"]["check_status"];
          updated_at: string;
          verified_at: string | null;
          verified_by: string | null;
          worker_id: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          credential_type_id: string;
          document_deleted_at?: string | null;
          document_path?: string | null;
          expires_on?: string | null;
          id?: string;
          issued_on?: string | null;
          last_expiry_warning_days?: number | null;
          number?: string | null;
          rejection_reason?: string | null;
          status?: Database["public"]["Enums"]["check_status"];
          updated_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
          worker_id: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          credential_type_id?: string;
          document_deleted_at?: string | null;
          document_path?: string | null;
          expires_on?: string | null;
          id?: string;
          issued_on?: string | null;
          last_expiry_warning_days?: number | null;
          number?: string | null;
          rejection_reason?: string | null;
          status?: Database["public"]["Enums"]["check_status"];
          updated_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "worker_credentials_credential_type_id_fkey";
            columns: ["credential_type_id"];
            isOneToOne: false;
            referencedRelation: "credential_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "worker_credentials_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "worker_credentials_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
      workers: {
        Row: {
          activated_at: string | null;
          archived_at: string | null;
          available_now_until: string | null;
          bio: string | null;
          created_at: string;
          date_of_birth: string | null;
          has_car: boolean | null;
          home_lat: number | null;
          home_lng: number | null;
          home_postcode: string | null;
          home_state: string;
          home_suburb: string | null;
          id: string;
          legal_first_name: string | null;
          legal_last_name: string | null;
          licence_class: Database["public"]["Enums"]["licence_class"] | null;
          onboarding_steps: string[];
          payroll_employee_id: string | null;
          payroll_status: Database["public"]["Enums"]["payroll_status"];
          photo_path: string | null;
          photo_rejection_reason: string | null;
          photo_status: Database["public"]["Enums"]["check_status"] | null;
          preferred_name: string | null;
          profile_id: string;
          rating_avg: number | null;
          rating_count: number;
          reliability_score: number | null;
          shifts_completed: number;
          status: Database["public"]["Enums"]["worker_status"];
          status_reason: string | null;
          submitted_at: string | null;
          travel_radius_km: number;
          updated_at: string;
          urgent_opt_in: boolean;
          uses_public_transport: boolean | null;
        };
        ComputedFields: never;
        Insert: {
          activated_at?: string | null;
          archived_at?: string | null;
          available_now_until?: string | null;
          bio?: string | null;
          created_at?: string;
          date_of_birth?: string | null;
          has_car?: boolean | null;
          home_lat?: number | null;
          home_lng?: number | null;
          home_postcode?: string | null;
          home_state?: string;
          home_suburb?: string | null;
          id?: string;
          legal_first_name?: string | null;
          legal_last_name?: string | null;
          licence_class?: Database["public"]["Enums"]["licence_class"] | null;
          onboarding_steps?: string[];
          payroll_employee_id?: string | null;
          payroll_status?: Database["public"]["Enums"]["payroll_status"];
          photo_path?: string | null;
          photo_rejection_reason?: string | null;
          photo_status?: Database["public"]["Enums"]["check_status"] | null;
          preferred_name?: string | null;
          profile_id: string;
          rating_avg?: number | null;
          rating_count?: number;
          reliability_score?: number | null;
          shifts_completed?: number;
          status?: Database["public"]["Enums"]["worker_status"];
          status_reason?: string | null;
          submitted_at?: string | null;
          travel_radius_km?: number;
          updated_at?: string;
          urgent_opt_in?: boolean;
          uses_public_transport?: boolean | null;
        };
        Update: {
          activated_at?: string | null;
          archived_at?: string | null;
          available_now_until?: string | null;
          bio?: string | null;
          created_at?: string;
          date_of_birth?: string | null;
          has_car?: boolean | null;
          home_lat?: number | null;
          home_lng?: number | null;
          home_postcode?: string | null;
          home_state?: string;
          home_suburb?: string | null;
          id?: string;
          legal_first_name?: string | null;
          legal_last_name?: string | null;
          licence_class?: Database["public"]["Enums"]["licence_class"] | null;
          onboarding_steps?: string[];
          payroll_employee_id?: string | null;
          payroll_status?: Database["public"]["Enums"]["payroll_status"];
          photo_path?: string | null;
          photo_rejection_reason?: string | null;
          photo_status?: Database["public"]["Enums"]["check_status"] | null;
          preferred_name?: string | null;
          profile_id?: string;
          rating_avg?: number | null;
          rating_count?: number;
          reliability_score?: number | null;
          shifts_completed?: number;
          status?: Database["public"]["Enums"]["worker_status"];
          status_reason?: string | null;
          submitted_at?: string | null;
          travel_radius_km?: number;
          updated_at?: string;
          urgent_opt_in?: boolean;
          uses_public_transport?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "workers_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
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
      accept_business_invites: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      activate_worker: { Args: { p_worker_id: string }; Returns: undefined };
      can_see_site: { Args: { p_site_id: string }; Returns: boolean };
      dev_auth_email: {
        Args: {
          p_action: string;
          p_base_url: string;
          p_recipient: string;
          p_token: string;
          p_token_hash: string;
        };
        Returns: undefined;
      };
      hook_send_email: { Args: { event: Json }; Returns: Json };
      hook_send_sms: { Args: { event: Json }; Returns: Json };
      in_worker_folder: {
        Args: { p_path: string; p_worker_id: string };
        Returns: boolean;
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_business_manager: {
        Args: { p_business_id: string };
        Returns: boolean;
      };
      is_business_owner: { Args: { p_business_id: string }; Returns: boolean };
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
      my_business_id: { Args: Record<PropertyKey, never>; Returns: string };
      my_business_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["business_role"];
      };
      my_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      my_worker_id: { Args: Record<PropertyKey, never>; Returns: string };
      normalise_auth_phone: { Args: { raw: string }; Returns: string };
      review_worker_credential: {
        Args: { p_approve: boolean; p_id: string; p_reason?: string };
        Returns: undefined;
      };
      set_current_agreement: {
        Args: { p_agreement_id: string };
        Returns: undefined;
      };
      submit_business: { Args: Record<PropertyKey, never>; Returns: undefined };
      submit_worker_onboarding: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
    Enums: {
      agreement_kind:
        | "labour_hire_services"
        | "casual_employment_contract"
        | "fair_work_information_statement"
        | "casual_employment_information_statement"
        | "privacy_collection_notice"
        | "worker_supply_notice";
      bill_method: "markup" | "fixed";
      business_role: "owner" | "manager" | "supervisor";
      business_status: "draft" | "pending" | "approved" | "suspended";
      check_status: "pending" | "verified" | "rejected" | "expired";
      citizenship_evidence:
        "australian_passport" | "birth_certificate" | "citizenship_certificate";
      credential_kind: "ticket" | "licence" | "police_check" | "wwcc";
      identity_document: "driver_licence" | "passport";
      licence_class: "none" | "C" | "MR" | "HR";
      licence_status: "active" | "expired" | "suspended" | "cancelled";
      payroll_status: "not_started" | "invited" | "complete";
      right_to_work_basis:
        "citizen" | "permanent_resident" | "nz_citizen" | "visa";
      user_role: "worker" | "business_user" | "admin";
      verification_method: "manual" | "register_check" | "provider_api";
      worker_status:
        "draft" | "pending" | "active" | "suspended" | "offboarded";
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
      agreement_kind: [
        "labour_hire_services",
        "casual_employment_contract",
        "fair_work_information_statement",
        "casual_employment_information_statement",
        "privacy_collection_notice",
        "worker_supply_notice",
      ],
      bill_method: ["markup", "fixed"],
      business_role: ["owner", "manager", "supervisor"],
      business_status: ["draft", "pending", "approved", "suspended"],
      check_status: ["pending", "verified", "rejected", "expired"],
      citizenship_evidence: [
        "australian_passport",
        "birth_certificate",
        "citizenship_certificate",
      ],
      credential_kind: ["ticket", "licence", "police_check", "wwcc"],
      identity_document: ["driver_licence", "passport"],
      licence_class: ["none", "C", "MR", "HR"],
      licence_status: ["active", "expired", "suspended", "cancelled"],
      payroll_status: ["not_started", "invited", "complete"],
      right_to_work_basis: [
        "citizen",
        "permanent_resident",
        "nz_citizen",
        "visa",
      ],
      user_role: ["worker", "business_user", "admin"],
      verification_method: ["manual", "register_check", "provider_api"],
      worker_status: ["draft", "pending", "active", "suspended", "offboarded"],
    },
  },
} as const;
