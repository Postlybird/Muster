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
      admin_flags: {
        Row: {
          assignment_id: string | null;
          business_id: string | null;
          created_at: string;
          id: string;
          kind: string;
          resolution: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: string;
          summary: string;
          updated_at: string;
          worker_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          assignment_id?: string | null;
          business_id?: string | null;
          created_at?: string;
          id?: string;
          kind: string;
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
          summary: string;
          updated_at?: string;
          worker_id?: string | null;
        };
        Update: {
          assignment_id?: string | null;
          business_id?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
          summary?: string;
          updated_at?: string;
          worker_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "admin_flags_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_flags_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_flags_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_flags_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
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
      applications: {
        Row: {
          created_at: string;
          decided_at: string | null;
          id: string;
          shift_id: string;
          status: Database["public"]["Enums"]["application_status"];
          updated_at: string;
          worker_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          decided_at?: string | null;
          id?: string;
          shift_id: string;
          status?: Database["public"]["Enums"]["application_status"];
          updated_at?: string;
          worker_id: string;
        };
        Update: {
          created_at?: string;
          decided_at?: string | null;
          id?: string;
          shift_id?: string;
          status?: Database["public"]["Enums"]["application_status"];
          updated_at?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "applications_shift_id_fkey";
            columns: ["shift_id"];
            isOneToOne: false;
            referencedRelation: "shifts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
      assignment_rates: {
        Row: {
          assignment_id: string;
          bill_hourly_cents: number;
          bill_rate_rule_id: string | null;
          cost_rules: NonNullable<Json>;
          created_at: string;
          estimate_bill_cents: number;
          estimate_margin_cents: number;
          estimate_pay_cents: number;
          pay_hourly_cents: number;
          rate_card_id: string;
        };
        ComputedFields: never;
        Insert: {
          assignment_id: string;
          bill_hourly_cents: number;
          bill_rate_rule_id?: string | null;
          cost_rules: NonNullable<Json>;
          created_at?: string;
          estimate_bill_cents: number;
          estimate_margin_cents: number;
          estimate_pay_cents: number;
          pay_hourly_cents: number;
          rate_card_id: string;
        };
        Update: {
          assignment_id?: string;
          bill_hourly_cents?: number;
          bill_rate_rule_id?: string | null;
          cost_rules?: NonNullable<Json>;
          created_at?: string;
          estimate_bill_cents?: number;
          estimate_margin_cents?: number;
          estimate_pay_cents?: number;
          pay_hourly_cents?: number;
          rate_card_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignment_rates_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: true;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignment_rates_bill_rate_rule_id_fkey";
            columns: ["bill_rate_rule_id"];
            isOneToOne: false;
            referencedRelation: "bill_rate_rules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignment_rates_rate_card_id_fkey";
            columns: ["rate_card_id"];
            isOneToOne: false;
            referencedRelation: "rate_cards";
            referencedColumns: ["id"];
          },
        ];
      };
      assignments: {
        Row: {
          cancellation_charge_hours: number | null;
          cancellation_pay_hours: number | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          confirmed_at: string;
          confirmed_by: string | null;
          created_at: string;
          id: string;
          late_cancellation: boolean;
          no_show_reported_at: string | null;
          no_show_reported_by: string | null;
          reminded_day_before_at: string | null;
          reminded_soon_at: string | null;
          shift_id: string;
          status: Database["public"]["Enums"]["assignment_status"];
          updated_at: string;
          worker_id: string;
        };
        ComputedFields: never;
        Insert: {
          cancellation_charge_hours?: number | null;
          cancellation_pay_hours?: number | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          confirmed_at?: string;
          confirmed_by?: string | null;
          created_at?: string;
          id?: string;
          late_cancellation?: boolean;
          no_show_reported_at?: string | null;
          no_show_reported_by?: string | null;
          reminded_day_before_at?: string | null;
          reminded_soon_at?: string | null;
          shift_id: string;
          status?: Database["public"]["Enums"]["assignment_status"];
          updated_at?: string;
          worker_id: string;
        };
        Update: {
          cancellation_charge_hours?: number | null;
          cancellation_pay_hours?: number | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          confirmed_at?: string;
          confirmed_by?: string | null;
          created_at?: string;
          id?: string;
          late_cancellation?: boolean;
          no_show_reported_at?: string | null;
          no_show_reported_by?: string | null;
          reminded_day_before_at?: string | null;
          reminded_soon_at?: string | null;
          shift_id?: string;
          status?: Database["public"]["Enums"]["assignment_status"];
          updated_at?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignments_cancelled_by_fkey";
            columns: ["cancelled_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_confirmed_by_fkey";
            columns: ["confirmed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_no_show_reported_by_fkey";
            columns: ["no_show_reported_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_shift_id_fkey";
            columns: ["shift_id"];
            isOneToOne: false;
            referencedRelation: "shifts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
      attendance_events: {
        Row: {
          accuracy_m: number | null;
          assignment_id: string;
          created_at: string;
          distance_m: number | null;
          id: string;
          inside_geofence: boolean | null;
          kind: Database["public"]["Enums"]["attendance_kind"];
          lat: number | null;
          lng: number | null;
          occurred_at: string;
          offline: boolean;
          reason: string | null;
          received_at: string;
          recorded_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          accuracy_m?: number | null;
          assignment_id: string;
          created_at?: string;
          distance_m?: number | null;
          id?: string;
          inside_geofence?: boolean | null;
          kind: Database["public"]["Enums"]["attendance_kind"];
          lat?: number | null;
          lng?: number | null;
          occurred_at: string;
          offline?: boolean;
          reason?: string | null;
          received_at?: string;
          recorded_by?: string | null;
        };
        Update: {
          accuracy_m?: number | null;
          assignment_id?: string;
          created_at?: string;
          distance_m?: number | null;
          id?: string;
          inside_geofence?: boolean | null;
          kind?: Database["public"]["Enums"]["attendance_kind"];
          lat?: number | null;
          lng?: number | null;
          occurred_at?: string;
          offline?: boolean;
          reason?: string | null;
          received_at?: string;
          recorded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_events_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_events_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
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
      blocks: {
        Row: {
          archived_at: string | null;
          business_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          reason: string;
          updated_at: string;
          worker_id: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          business_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          reason: string;
          updated_at?: string;
          worker_id: string;
        };
        Update: {
          archived_at?: string | null;
          business_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          reason?: string;
          updated_at?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blocks_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blocks_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blocks_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
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
          rating_avg: number | null;
          rating_count: number;
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
          rating_avg?: number | null;
          rating_count?: number;
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
          rating_avg?: number | null;
          rating_count?: number;
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
      favourites: {
        Row: {
          business_id: string;
          created_at: string;
          created_by: string | null;
          worker_id: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          created_by?: string | null;
          worker_id: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          created_by?: string | null;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favourites_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favourites_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favourites_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
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
      invoices: {
        Row: {
          business_id: string;
          created_at: string;
          due_on: string;
          emailed_at: string | null;
          emailed_to: string | null;
          gst_cents: number;
          id: string;
          issued_on: string;
          marked_paid_by: string | null;
          number: string;
          paid_on: string | null;
          pay_run_id: string;
          payment_reference: string | null;
          pdf_path: string | null;
          status: string;
          subtotal_cents: number;
          total_cents: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          due_on: string;
          emailed_at?: string | null;
          emailed_to?: string | null;
          gst_cents: number;
          id?: string;
          issued_on: string;
          marked_paid_by?: string | null;
          number: string;
          paid_on?: string | null;
          pay_run_id: string;
          payment_reference?: string | null;
          pdf_path?: string | null;
          status?: string;
          subtotal_cents: number;
          total_cents: number;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          due_on?: string;
          emailed_at?: string | null;
          emailed_to?: string | null;
          gst_cents?: number;
          id?: string;
          issued_on?: string;
          marked_paid_by?: string | null;
          number?: string;
          paid_on?: string | null;
          pay_run_id?: string;
          payment_reference?: string | null;
          pdf_path?: string | null;
          status?: string;
          subtotal_cents?: number;
          total_cents?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_marked_paid_by_fkey";
            columns: ["marked_paid_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_pay_run_id_fkey";
            columns: ["pay_run_id"];
            isOneToOne: false;
            referencedRelation: "pay_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      job_credentials: {
        Row: {
          created_at: string;
          credential_type_id: string;
          job_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          credential_type_id: string;
          job_id: string;
        };
        Update: {
          created_at?: string;
          credential_type_id?: string;
          job_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_credentials_credential_type_id_fkey";
            columns: ["credential_type_id"];
            isOneToOne: false;
            referencedRelation: "credential_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_credentials_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      job_hazards: {
        Row: {
          created_at: string;
          hazard_id: string;
          job_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          hazard_id: string;
          job_id: string;
        };
        Update: {
          created_at?: string;
          hazard_id?: string;
          job_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_hazards_hazard_id_fkey";
            columns: ["hazard_id"];
            isOneToOne: false;
            referencedRelation: "hazards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_hazards_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      job_photos: {
        Row: {
          archived_at: string | null;
          created_at: string;
          id: string;
          job_id: string;
          path: string;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          job_id: string;
          path: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          job_id?: string;
          path?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_photos_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      job_ppe: {
        Row: {
          created_at: string;
          job_id: string;
          ppe_item_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          job_id: string;
          ppe_item_id: string;
        };
        Update: {
          created_at?: string;
          job_id?: string;
          ppe_item_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_ppe_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_ppe_ppe_item_id_fkey";
            columns: ["ppe_item_id"];
            isOneToOne: false;
            referencedRelation: "ppe_items";
            referencedColumns: ["id"];
          },
        ];
      };
      job_templates: {
        Row: {
          archived_at: string | null;
          business_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          job_id: string;
          name: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          business_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          job_id: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          business_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          job_id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_templates_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_templates_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          archived_at: string | null;
          business_id: string;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          category_id: string | null;
          copied_from: string | null;
          created_at: string;
          created_by: string | null;
          estimate_cents: number | null;
          estimate_gst_cents: number | null;
          favourites_first_minutes: number | null;
          fill_mode: Database["public"]["Enums"]["fill_mode"];
          filled_emailed_at: string | null;
          first_applicant_emailed_at: string | null;
          hazard_controls: string;
          hazard_notes: string;
          headcount: number;
          id: string;
          induction: string;
          instructions: string;
          level: number;
          no_known_hazards: boolean;
          police_check_required: boolean;
          posted_at: string | null;
          posted_by: string | null;
          ppe_notes: string;
          ppe_supplied_by: Database["public"]["Enums"]["ppe_supplier"];
          report_to_name: string | null;
          report_to_phone: string | null;
          site_id: string | null;
          status: Database["public"]["Enums"]["job_status"];
          steps: string[];
          type: Database["public"]["Enums"]["job_type"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          business_id: string;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          category_id?: string | null;
          copied_from?: string | null;
          created_at?: string;
          created_by?: string | null;
          estimate_cents?: number | null;
          estimate_gst_cents?: number | null;
          favourites_first_minutes?: number | null;
          fill_mode?: Database["public"]["Enums"]["fill_mode"];
          filled_emailed_at?: string | null;
          first_applicant_emailed_at?: string | null;
          hazard_controls?: string;
          hazard_notes?: string;
          headcount?: number;
          id?: string;
          induction?: string;
          instructions?: string;
          level?: number;
          no_known_hazards?: boolean;
          police_check_required?: boolean;
          posted_at?: string | null;
          posted_by?: string | null;
          ppe_notes?: string;
          ppe_supplied_by?: Database["public"]["Enums"]["ppe_supplier"];
          report_to_name?: string | null;
          report_to_phone?: string | null;
          site_id?: string | null;
          status?: Database["public"]["Enums"]["job_status"];
          steps?: string[];
          type?: Database["public"]["Enums"]["job_type"];
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          business_id?: string;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          category_id?: string | null;
          copied_from?: string | null;
          created_at?: string;
          created_by?: string | null;
          estimate_cents?: number | null;
          estimate_gst_cents?: number | null;
          favourites_first_minutes?: number | null;
          fill_mode?: Database["public"]["Enums"]["fill_mode"];
          filled_emailed_at?: string | null;
          first_applicant_emailed_at?: string | null;
          hazard_controls?: string;
          hazard_notes?: string;
          headcount?: number;
          id?: string;
          induction?: string;
          instructions?: string;
          level?: number;
          no_known_hazards?: boolean;
          police_check_required?: boolean;
          posted_at?: string | null;
          posted_by?: string | null;
          ppe_notes?: string;
          ppe_supplied_by?: Database["public"]["Enums"]["ppe_supplier"];
          report_to_name?: string | null;
          report_to_phone?: string | null;
          site_id?: string | null;
          status?: Database["public"]["Enums"]["job_status"];
          steps?: string[];
          type?: Database["public"]["Enums"]["job_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_cancelled_by_fkey";
            columns: ["cancelled_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_copied_from_fkey";
            columns: ["copied_from"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_posted_by_fkey";
            columns: ["posted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
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
      pay_run_lines: {
        Row: {
          allowance_cents: number;
          assignment_id: string;
          bill_cents: number;
          break_minutes: number | null;
          business_id: string;
          created_at: string;
          description: string;
          detail: string | null;
          finish_at: string | null;
          hours: number;
          id: string;
          invoice_id: string;
          kind: Database["public"]["Enums"]["pay_line_kind"];
          pay_cents: number;
          pay_run_id: string;
          site_name: string;
          start_at: string | null;
          timesheet_id: string | null;
          work_date: string;
          work_type: string;
          worker_id: string;
        };
        ComputedFields: never;
        Insert: {
          allowance_cents?: number;
          assignment_id: string;
          bill_cents: number;
          break_minutes?: number | null;
          business_id: string;
          created_at?: string;
          description: string;
          detail?: string | null;
          finish_at?: string | null;
          hours: number;
          id?: string;
          invoice_id: string;
          kind: Database["public"]["Enums"]["pay_line_kind"];
          pay_cents: number;
          pay_run_id: string;
          site_name: string;
          start_at?: string | null;
          timesheet_id?: string | null;
          work_date: string;
          work_type: string;
          worker_id: string;
        };
        Update: {
          allowance_cents?: number;
          assignment_id?: string;
          bill_cents?: number;
          break_minutes?: number | null;
          business_id?: string;
          created_at?: string;
          description?: string;
          detail?: string | null;
          finish_at?: string | null;
          hours?: number;
          id?: string;
          invoice_id?: string;
          kind?: Database["public"]["Enums"]["pay_line_kind"];
          pay_cents?: number;
          pay_run_id?: string;
          site_name?: string;
          start_at?: string | null;
          timesheet_id?: string | null;
          work_date?: string;
          work_type?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pay_run_lines_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: true;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pay_run_lines_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pay_run_lines_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pay_run_lines_pay_run_id_fkey";
            columns: ["pay_run_id"];
            isOneToOne: false;
            referencedRelation: "pay_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pay_run_lines_timesheet_id_fkey";
            columns: ["timesheet_id"];
            isOneToOne: true;
            referencedRelation: "timesheets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pay_run_lines_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
      pay_runs: {
        Row: {
          bill_cents: number;
          created_at: string;
          gst_cents: number;
          id: string;
          line_count: number;
          pay_cents: number;
          period_end: string;
          period_start: string;
          run_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          bill_cents: number;
          created_at?: string;
          gst_cents: number;
          id?: string;
          line_count: number;
          pay_cents: number;
          period_end: string;
          period_start: string;
          run_by?: string | null;
        };
        Update: {
          bill_cents?: number;
          created_at?: string;
          gst_cents?: number;
          id?: string;
          line_count?: number;
          pay_cents?: number;
          period_end?: string;
          period_start?: string;
          run_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pay_runs_run_by_fkey";
            columns: ["run_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
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
      ratings: {
        Row: {
          assignment_id: string;
          business_id: string;
          created_at: string;
          direction: Database["public"]["Enums"]["rating_direction"];
          id: string;
          private_note: string | null;
          rated_by: string;
          score: number;
          site_id: string;
          tags: string[];
          worker_id: string;
        };
        ComputedFields: never;
        Insert: {
          assignment_id: string;
          business_id: string;
          created_at?: string;
          direction: Database["public"]["Enums"]["rating_direction"];
          id?: string;
          private_note?: string | null;
          rated_by: string;
          score: number;
          site_id: string;
          tags?: string[];
          worker_id: string;
        };
        Update: {
          assignment_id?: string;
          business_id?: string;
          created_at?: string;
          direction?: Database["public"]["Enums"]["rating_direction"];
          id?: string;
          private_note?: string | null;
          rated_by?: string;
          score?: number;
          site_id?: string;
          tags?: string[];
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ratings_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ratings_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ratings_rated_by_fkey";
            columns: ["rated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ratings_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ratings_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
      safety_reports: {
        Row: {
          assignment_id: string;
          created_at: string;
          description: string;
          id: string;
          photo_paths: string[];
          resolution: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: string;
          updated_at: string;
          worker_id: string;
        };
        ComputedFields: never;
        Insert: {
          assignment_id: string;
          created_at?: string;
          description: string;
          id?: string;
          photo_paths?: string[];
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
          updated_at?: string;
          worker_id: string;
        };
        Update: {
          assignment_id?: string;
          created_at?: string;
          description?: string;
          id?: string;
          photo_paths?: string[];
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
          updated_at?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "safety_reports_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "safety_reports_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "safety_reports_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
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
      shift_matches: {
        Row: {
          computed_at: string;
          distance_km: number | null;
          eligible: boolean;
          favourite: boolean;
          flags: string[];
          notified_at: string | null;
          rank_score: number;
          reasons: string[];
          shift_id: string;
          visible_from: string;
          worker_id: string;
        };
        ComputedFields: never;
        Insert: {
          computed_at?: string;
          distance_km?: number | null;
          eligible: boolean;
          favourite?: boolean;
          flags?: string[];
          notified_at?: string | null;
          rank_score?: number;
          reasons?: string[];
          shift_id: string;
          visible_from?: string;
          worker_id: string;
        };
        Update: {
          computed_at?: string;
          distance_km?: number | null;
          eligible?: boolean;
          favourite?: boolean;
          flags?: string[];
          notified_at?: string | null;
          rank_score?: number;
          reasons?: string[];
          shift_id?: string;
          visible_from?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shift_matches_shift_id_fkey";
            columns: ["shift_id"];
            isOneToOne: false;
            referencedRelation: "shifts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shift_matches_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
      shift_pay: {
        Row: {
          bill_hourly_cents: number | null;
          bill_rate_rule_id: string | null;
          computed_at: string;
          cost_rules: Json | null;
          estimate_bill_cents: number | null;
          estimate_cents: number;
          estimate_margin_cents: number | null;
          hourly_cents: number;
          rate_card_id: string | null;
          shift_id: string;
        };
        ComputedFields: never;
        Insert: {
          bill_hourly_cents?: number | null;
          bill_rate_rule_id?: string | null;
          computed_at?: string;
          cost_rules?: Json | null;
          estimate_bill_cents?: number | null;
          estimate_cents: number;
          estimate_margin_cents?: number | null;
          hourly_cents: number;
          rate_card_id?: string | null;
          shift_id: string;
        };
        Update: {
          bill_hourly_cents?: number | null;
          bill_rate_rule_id?: string | null;
          computed_at?: string;
          cost_rules?: Json | null;
          estimate_bill_cents?: number | null;
          estimate_cents?: number;
          estimate_margin_cents?: number | null;
          hourly_cents?: number;
          rate_card_id?: string | null;
          shift_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shift_pay_bill_rate_rule_id_fkey";
            columns: ["bill_rate_rule_id"];
            isOneToOne: false;
            referencedRelation: "bill_rate_rules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shift_pay_rate_card_id_fkey";
            columns: ["rate_card_id"];
            isOneToOne: false;
            referencedRelation: "rate_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shift_pay_shift_id_fkey";
            columns: ["shift_id"];
            isOneToOne: true;
            referencedRelation: "shifts";
            referencedColumns: ["id"];
          },
        ];
      };
      shifts: {
        Row: {
          break_minutes: number;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          created_at: string;
          ends_at: string;
          headcount: number;
          id: string;
          job_id: string;
          starts_at: string;
          status: Database["public"]["Enums"]["shift_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          break_minutes?: number;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          created_at?: string;
          ends_at: string;
          headcount: number;
          id?: string;
          job_id: string;
          starts_at: string;
          status?: Database["public"]["Enums"]["shift_status"];
          updated_at?: string;
        };
        Update: {
          break_minutes?: number;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          created_at?: string;
          ends_at?: string;
          headcount?: number;
          id?: string;
          job_id?: string;
          starts_at?: string;
          status?: Database["public"]["Enums"]["shift_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shifts_cancelled_by_fkey";
            columns: ["cancelled_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shifts_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
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
      timesheet_costs: {
        Row: {
          bill_cents: number;
          break_minutes: number;
          cost: NonNullable<Json>;
          costed_at: string;
          finish_at: string;
          margin_cents: number;
          minutes_by_type: NonNullable<Json>;
          on_cost_cents: number;
          paid_minutes: number;
          pay_cents: number;
          start_at: string;
          timesheet_id: string;
        };
        ComputedFields: never;
        Insert: {
          bill_cents: number;
          break_minutes: number;
          cost: NonNullable<Json>;
          costed_at?: string;
          finish_at: string;
          margin_cents: number;
          minutes_by_type: NonNullable<Json>;
          on_cost_cents: number;
          paid_minutes: number;
          pay_cents: number;
          start_at: string;
          timesheet_id: string;
        };
        Update: {
          bill_cents?: number;
          break_minutes?: number;
          cost?: NonNullable<Json>;
          costed_at?: string;
          finish_at?: string;
          margin_cents?: number;
          minutes_by_type?: NonNullable<Json>;
          on_cost_cents?: number;
          paid_minutes?: number;
          pay_cents?: number;
          start_at?: string;
          timesheet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "timesheet_costs_timesheet_id_fkey";
            columns: ["timesheet_id"];
            isOneToOne: true;
            referencedRelation: "timesheets";
            referencedColumns: ["id"];
          },
        ];
      };
      timesheets: {
        Row: {
          adjusted_at: string | null;
          adjusted_by: string | null;
          approve_by: string;
          approved_at: string | null;
          approved_by: string | null;
          assignment_id: string;
          break_minutes: number;
          business_note: string | null;
          business_notified_at: string | null;
          created_at: string;
          disputed_at: string | null;
          disputed_by: string | null;
          finish_at: string;
          id: string;
          job_id: string;
          recorded_finish: string | null;
          recorded_start: string | null;
          resolution: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          start_at: string;
          status: Database["public"]["Enums"]["timesheet_status"];
          updated_at: string;
          worker_id: string;
          worker_note: string | null;
        };
        ComputedFields: never;
        Insert: {
          adjusted_at?: string | null;
          adjusted_by?: string | null;
          approve_by: string;
          approved_at?: string | null;
          approved_by?: string | null;
          assignment_id: string;
          break_minutes?: number;
          business_note?: string | null;
          business_notified_at?: string | null;
          created_at?: string;
          disputed_at?: string | null;
          disputed_by?: string | null;
          finish_at: string;
          id?: string;
          job_id: string;
          recorded_finish?: string | null;
          recorded_start?: string | null;
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          start_at: string;
          status?: Database["public"]["Enums"]["timesheet_status"];
          updated_at?: string;
          worker_id: string;
          worker_note?: string | null;
        };
        Update: {
          adjusted_at?: string | null;
          adjusted_by?: string | null;
          approve_by?: string;
          approved_at?: string | null;
          approved_by?: string | null;
          assignment_id?: string;
          break_minutes?: number;
          business_note?: string | null;
          business_notified_at?: string | null;
          created_at?: string;
          disputed_at?: string | null;
          disputed_by?: string | null;
          finish_at?: string;
          id?: string;
          job_id?: string;
          recorded_finish?: string | null;
          recorded_start?: string | null;
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          start_at?: string;
          status?: Database["public"]["Enums"]["timesheet_status"];
          updated_at?: string;
          worker_id?: string;
          worker_note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "timesheets_adjusted_by_fkey";
            columns: ["adjusted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "timesheets_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "timesheets_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: true;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "timesheets_disputed_by_fkey";
            columns: ["disputed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "timesheets_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "timesheets_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "timesheets_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
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
      accept_shifts: {
        Args: { p_shift_ids: string[] };
        Returns: {
          result: string;
          shift_id: string;
        }[];
      };
      activate_worker: { Args: { p_worker_id: string }; Returns: undefined };
      add_timesheet: {
        Args: {
          p_assignment_id: string;
          p_break_minutes: number;
          p_finish: string;
          p_note?: string;
          p_start: string;
        };
        Returns: string;
      };
      adjust_timesheet: {
        Args: {
          p_break_minutes: number;
          p_finish: string;
          p_id: string;
          p_note: string;
          p_start: string;
        };
        Returns: undefined;
      };
      apply_for_shifts: {
        Args: { p_shift_ids: string[] };
        Returns: {
          result: string;
          shift_id: string;
        }[];
      };
      approve_timesheets: {
        Args: { p_ids: string[] };
        Returns: {
          timesheet_id: string;
        }[];
      };
      auto_approve_timesheets: {
        Args: Record<PropertyKey, never>;
        Returns: {
          job_id: string;
          timesheet_id: string;
          worker_id: string;
        }[];
      };
      book_applicant: {
        Args: { p_job_id: string; p_worker_id: string };
        Returns: {
          result: string;
          shift_id: string;
        }[];
      };
      book_worker: {
        Args: {
          p_check_visible: boolean;
          p_shift_id: string;
          p_worker_id: string;
        };
        Returns: string;
      };
      booked_worker_can_see_photo: {
        Args: { p_path: string };
        Returns: boolean;
      };
      business_can_see_worker: {
        Args: { p_worker_id: string };
        Returns: boolean;
      };
      business_can_see_worker_folder: {
        Args: { p_folder: string };
        Returns: boolean;
      };
      business_timesheets: {
        Args: { p_days?: number; p_job_id?: string };
        Returns: {
          adjusted_at: string;
          approve_by: string;
          arrival_confirmed: boolean;
          assignment_id: string;
          away_reasons: string[];
          bill_cents: number;
          break_minutes: number;
          business_note: string;
          category_name: string;
          clocked_out_at: string;
          finish_at: string;
          job_id: string;
          offline: boolean;
          recorded_finish: string;
          recorded_start: string;
          resolution: string;
          shift_break_minutes: number;
          shift_ends_at: string;
          shift_starts_at: string;
          site_name: string;
          start_at: string;
          started_at: string;
          status: Database["public"]["Enums"]["timesheet_status"];
          timesheet_id: string;
          worker_id: string;
          worker_name: string;
          worker_note: string;
        }[];
      };
      business_workers: {
        Args: Record<PropertyKey, never>;
        Returns: {
          block_id: string;
          block_reason: string;
          display_name: string;
          favourite: boolean;
          last_worked_at: string;
          photo_path: string;
          rating: number;
          rating_count: number;
          reliability: number;
          shifts_completed: number;
          shifts_here: number;
          worker_id: string;
        }[];
      };
      can_edit_job: { Args: { p_job_id: string }; Returns: boolean };
      can_read_invoice_folder: { Args: { p_folder: string }; Returns: boolean };
      can_see_job: { Args: { p_job_id: string }; Returns: boolean };
      can_see_site: { Args: { p_site_id: string }; Returns: boolean };
      cancel_my_bookings: {
        Args: { p_assignment_ids: string[]; p_reason: string };
        Returns: {
          assignment_id: string;
          late: boolean;
          shift_id: string;
        }[];
      };
      cancel_shifts: {
        Args: { p_reason: string; p_shift_ids: string[] };
        Returns: {
          late: boolean;
          shift_id: string;
          worker_id: string;
        }[];
      };
      check_timesheet_hours: {
        Args: {
          p_break_minutes: number;
          p_finish: string;
          p_shift_end: string;
          p_shift_start: string;
          p_start: string;
        };
        Returns: undefined;
      };
      clock: {
        Args: {
          p_accuracy_m?: number;
          p_assignment_id: string;
          p_kind: Database["public"]["Enums"]["attendance_kind"];
          p_lat?: number;
          p_lng?: number;
          p_occurred_at: string;
          p_offline?: boolean;
          p_reason?: string;
        };
        Returns: {
          distance_m: number;
          inside: boolean;
        }[];
      };
      confirm_arrival: {
        Args: { p_assignment_id: string; p_at?: string };
        Returns: undefined;
      };
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
      dispute_timesheet: {
        Args: { p_id: string; p_note: string };
        Returns: undefined;
      };
      distance_m: {
        Args: {
          p_lat1: number;
          p_lat2: number;
          p_lng1: number;
          p_lng2: number;
        };
        Returns: number;
      };
      duplicate_job: { Args: { p_job_id: string }; Returns: string };
      finish_shifts: {
        Args: Record<PropertyKey, never>;
        Returns: {
          worker_id: string;
        }[];
      };
      flag_possible_no_shows: {
        Args: Record<PropertyKey, never>;
        Returns: {
          assignment_id: string;
          job_id: string;
          worker_id: string;
        }[];
      };
      hook_send_email: { Args: { event: Json }; Returns: Json };
      hook_send_sms: { Args: { event: Json }; Returns: Json };
      hours_approved: { Args: { p_assignment_id: string }; Returns: boolean };
      in_worker_folder: {
        Args: { p_path: string; p_worker_id: string };
        Returns: boolean;
      };
      invoice_lines: {
        Args: { p_invoice_id: string };
        Returns: {
          bill_cents: number;
          description: string;
          detail: string;
          hours: number;
          kind: Database["public"]["Enums"]["pay_line_kind"];
          line_id: string;
          work_date: string;
        }[];
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_business_manager: {
        Args: { p_business_id: string };
        Returns: boolean;
      };
      is_business_owner: { Args: { p_business_id: string }; Returns: boolean };
      job_applicants: {
        Args: { p_job_id: string };
        Returns: {
          applied_at: string;
          display_name: string;
          photo_path: string;
          rank_score: number;
          rating: number;
          reliability: number;
          shift_ids: string[];
          shifts_completed: number;
          tickets: string[];
          worker_id: string;
        }[];
      };
      job_bookings: {
        Args: { p_job_id: string };
        Returns: {
          assignment_id: string;
          confirmed_at: string;
          display_name: string;
          mobile: string;
          photo_path: string;
          rating: number;
          reliability: number;
          shift_id: string;
          shifts_completed: number;
          worker_id: string;
        }[];
      };
      job_offer_count: { Args: { p_job_id: string }; Returns: number };
      job_open_to_all_at: { Args: { p_job_id: string }; Returns: string };
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
      mark_invoice_paid: {
        Args: { p_id: string; p_paid_on: string; p_reference?: string };
        Returns: undefined;
      };
      mark_invoice_unpaid: { Args: { p_id: string }; Returns: undefined };
      my_business_id: { Args: Record<PropertyKey, never>; Returns: string };
      my_business_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["business_role"];
      };
      my_job: {
        Args: { p_job_id: string };
        Returns: {
          access_notes: string;
          address_line1: string;
          booked: boolean;
          business_name: string;
          business_rating: number;
          business_rating_count: number;
          category_name: string;
          fill_mode: Database["public"]["Enums"]["fill_mode"];
          hazard_controls: string;
          hazard_notes: string;
          hazards: string[];
          induction: string;
          instructions: string;
          job_id: string;
          job_type: Database["public"]["Enums"]["job_type"];
          lat: number;
          lng: number;
          no_known_hazards: boolean;
          parking_notes: string;
          photo_paths: string[];
          police_check_required: boolean;
          postcode: string;
          ppe: string[];
          ppe_notes: string;
          ppe_supplied_by: Database["public"]["Enums"]["ppe_supplier"];
          report_to_name: string;
          report_to_phone: string;
          state: string;
          suburb: string;
          tickets: string[];
        }[];
      };
      my_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      my_shift_offers: {
        Args: { p_job_id?: string };
        Returns: {
          break_minutes: number;
          business_name: string;
          business_rating: number;
          business_rating_count: number;
          category_name: string;
          distance_km: number;
          ends_at: string;
          estimate_cents: number;
          hazards: string[];
          headcount: number;
          hourly_cents: number;
          job_id: string;
          job_type: Database["public"]["Enums"]["job_type"];
          no_known_hazards: boolean;
          police_check_required: boolean;
          ppe: string[];
          ppe_supplied_by: Database["public"]["Enums"]["ppe_supplier"];
          shift_id: string;
          starts_at: string;
          state: string;
          suburb: string;
          tickets: string[];
        }[];
      };
      my_shifts: {
        Args: { p_job_id?: string };
        Returns: {
          application_status: Database["public"]["Enums"]["application_status"];
          assignment_id: string;
          assignment_status: Database["public"]["Enums"]["assignment_status"];
          break_minutes: number;
          business_name: string;
          category_name: string;
          ends_at: string;
          estimate_cents: number;
          hourly_cents: number;
          job_id: string;
          job_type: Database["public"]["Enums"]["job_type"];
          shift_id: string;
          starts_at: string;
          suburb: string;
        }[];
      };
      my_timesheets: {
        Args: { p_id?: string };
        Returns: {
          adjusted_at: string;
          approve_by: string;
          break_minutes: number;
          business_name: string;
          business_note: string;
          category_name: string;
          finish_at: string;
          job_id: string;
          pay_cents: number;
          recorded_finish: string;
          recorded_start: string;
          resolution: string;
          resolved_at: string;
          shift_break_minutes: number;
          shift_ends_at: string;
          shift_starts_at: string;
          site_name: string;
          start_at: string;
          status: Database["public"]["Enums"]["timesheet_status"];
          timesheet_id: string;
          worker_note: string;
        }[];
      };
      my_worker_id: { Args: Record<PropertyKey, never>; Returns: string };
      normalise_auth_phone: { Args: { raw: string }; Returns: string };
      note_timesheet: {
        Args: { p_id: string; p_note: string };
        Returns: undefined;
      };
      pay_run_candidates: {
        Args: { p_until: string };
        Returns: {
          assignment_id: string;
          kind: Database["public"]["Enums"]["pay_line_kind"];
          timesheet_id: string;
        }[];
      };
      post_job: { Args: { p_job_id: string }; Returns: undefined };
      rate_site: {
        Args: {
          p_assignment_id: string;
          p_note?: string;
          p_score: number;
          p_tags?: string[];
        };
        Returns: undefined;
      };
      rate_worker: {
        Args: {
          p_assignment_id: string;
          p_note?: string;
          p_score: number;
          p_tags?: string[];
        };
        Returns: undefined;
      };
      record_missing_timesheets: {
        Args: Record<PropertyKey, never>;
        Returns: {
          timesheet_id: string;
          worker_id: string;
        }[];
      };
      record_timesheet: { Args: { p_assignment_id: string }; Returns: string };
      report_no_show: {
        Args: { p_assignment_id: string };
        Returns: {
          suspended: boolean;
          worker_id: string;
        }[];
      };
      report_safety_issue: {
        Args: {
          p_assignment_id: string;
          p_description: string;
          p_photo_paths: string[];
        };
        Returns: string;
      };
      resolve_timesheet: {
        Args: {
          p_break_minutes?: number;
          p_finish?: string;
          p_id: string;
          p_resolution: string;
          p_start?: string;
          p_worked: boolean;
        };
        Returns: undefined;
      };
      review_worker_credential: {
        Args: { p_approve: boolean; p_id: string; p_reason?: string };
        Returns: undefined;
      };
      save_pay_run: {
        Args: {
          p_invoices: Json;
          p_lines: Json;
          p_period_start: string;
          p_run_by: string;
        };
        Returns: string;
      };
      set_current_agreement: {
        Args: { p_agreement_id: string };
        Returns: undefined;
      };
      setting_boolean: {
        Args: { p_default: boolean; p_key: string };
        Returns: boolean;
      };
      setting_numeric: {
        Args: { p_default: number; p_key: string };
        Returns: number;
      };
      state_blocked: { Args: { p_state: string }; Returns: boolean };
      submit_business: { Args: Record<PropertyKey, never>; Returns: undefined };
      submit_worker_onboarding: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      timesheet_break: {
        Args: { p_finish: string; p_rostered: number; p_start: string };
        Returns: number;
      };
      timesheets_to_cost: {
        Args: { p_limit?: number };
        Returns: {
          timesheet_id: string;
        }[];
      };
      withdraw_applications: {
        Args: { p_shift_ids: string[] };
        Returns: number;
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
      application_status: "applied" | "booked" | "declined" | "withdrawn";
      assignment_status:
        | "confirmed"
        | "cancelled_by_worker"
        | "cancelled_by_business"
        | "no_show"
        | "completed";
      attendance_kind: "clock_in" | "clock_out" | "arrival_confirmed";
      bill_method: "markup" | "fixed";
      business_role: "owner" | "manager" | "supervisor";
      business_status: "draft" | "pending" | "approved" | "suspended";
      check_status: "pending" | "verified" | "rejected" | "expired";
      citizenship_evidence:
        "australian_passport" | "birth_certificate" | "citizenship_certificate";
      credential_kind: "ticket" | "licence" | "police_check" | "wwcc";
      fill_mode: "pick" | "auto";
      identity_document: "driver_licence" | "passport";
      job_status: "draft" | "posted" | "cancelled" | "completed";
      job_type: "single" | "multi_day" | "urgent";
      licence_class: "none" | "C" | "MR" | "HR";
      licence_status: "active" | "expired" | "suspended" | "cancelled";
      pay_line_kind: "hours" | "cancellation";
      payroll_status: "not_started" | "invited" | "complete";
      ppe_supplier: "business" | "worker" | "both";
      rating_direction: "worker" | "site";
      right_to_work_basis:
        "citizen" | "permanent_resident" | "nz_citizen" | "visa";
      shift_status: "open" | "filled" | "cancelled" | "completed";
      timesheet_status:
        | "submitted"
        | "approved"
        | "auto_approved"
        | "adjusted"
        | "disputed"
        | "rejected";
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
      application_status: ["applied", "booked", "declined", "withdrawn"],
      assignment_status: [
        "confirmed",
        "cancelled_by_worker",
        "cancelled_by_business",
        "no_show",
        "completed",
      ],
      attendance_kind: ["clock_in", "clock_out", "arrival_confirmed"],
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
      fill_mode: ["pick", "auto"],
      identity_document: ["driver_licence", "passport"],
      job_status: ["draft", "posted", "cancelled", "completed"],
      job_type: ["single", "multi_day", "urgent"],
      licence_class: ["none", "C", "MR", "HR"],
      licence_status: ["active", "expired", "suspended", "cancelled"],
      pay_line_kind: ["hours", "cancellation"],
      payroll_status: ["not_started", "invited", "complete"],
      ppe_supplier: ["business", "worker", "both"],
      rating_direction: ["worker", "site"],
      right_to_work_basis: [
        "citizen",
        "permanent_resident",
        "nz_citizen",
        "visa",
      ],
      shift_status: ["open", "filled", "cancelled", "completed"],
      timesheet_status: [
        "submitted",
        "approved",
        "auto_approved",
        "adjusted",
        "disputed",
        "rejected",
      ],
      user_role: ["worker", "business_user", "admin"],
      verification_method: ["manual", "register_check", "provider_api"],
      worker_status: ["draft", "pending", "active", "suspended", "offboarded"],
    },
  },
} as const;
