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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      contacts: {
        Row: {
          created_at: string | null
          email: string
          id: number
          message: string
          name: string
          status: string | null
          admin_notes: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string
          id?: number
          message: string
          name?: string
          status?: string | null
          admin_notes?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: number
          message?: string
          name?: string
          status?: string | null
          admin_notes?: string | null
        }
        Relationships: []
      }
      garage_temps: {
        Row: {
          feed_name: string | null
          humidity: number
          id: number
          probe_key: string | null
          probe_label: string | null
          tempc: number
          tempf: number
          timestamp: string
          user_id: string | null
        }
        Insert: {
          feed_name?: string | null
          humidity: number
          id?: number
          probe_key?: string | null
          probe_label?: string | null
          tempc: number
          tempf: number
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          feed_name?: string | null
          humidity?: number
          id?: number
          probe_key?: string | null
          probe_label?: string | null
          tempc?: number
          tempf?: number
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_temp_feeds: {
        Row: {
          enabled: boolean
          feed_id: string
          id: number
          name: string
          sort_order: number
          url: string
          user_id: string
        }
        Insert: {
          enabled?: boolean
          feed_id: string
          id?: never
          name: string
          sort_order?: number
          url: string
          user_id: string
        }
        Update: {
          enabled?: boolean
          feed_id?: string
          id?: never
          name?: string
          sort_order?: number
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      user_temp_probes: {
        Row: {
          feed_id: string
          id: number
          label: string
          probe_id: string
          probe_key: string
          sort_order: number
          user_id: string
          visible: boolean
        }
        Insert: {
          feed_id: string
          id?: never
          label: string
          probe_id: string
          probe_key: string
          sort_order?: number
          user_id: string
          visible?: boolean
        }
        Update: {
          feed_id?: string
          id?: never
          label?: string
          probe_id?: string
          probe_key?: string
          sort_order?: number
          user_id?: string
          visible?: boolean
        }
        Relationships: []
      }
      households: {
        Row: {
          id: string
          name: string
          created_at: string
          freeze_map_opt_in: boolean
          freeze_map_city_id: string | null
          freeze_map_lat: number | null
          freeze_map_lon: number | null
          freeze_map_label: string | null
        }
        Insert: {
          id?: string
          name?: string
          created_at?: string
          freeze_map_opt_in?: boolean
          freeze_map_city_id?: string | null
          freeze_map_lat?: number | null
          freeze_map_lon?: number | null
          freeze_map_label?: string | null
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          freeze_map_opt_in?: boolean
          freeze_map_city_id?: string | null
          freeze_map_lat?: number | null
          freeze_map_lon?: number | null
          freeze_map_label?: string | null
        }
        Relationships: []
      }
      household_members: {
        Row: {
          id: string
          household_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          user_id: string
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
        Relationships: []
      }
      devices: {
        Row: {
          id: string
          household_id: string
          name: string
          source: string
          pull_url: string | null
          ingest_key_hash: string | null
          ingest_key_prefix: string | null
          enabled: boolean
          last_seen_at: string | null
          sort_order: number
          created_at: string
          updated_at: string
          meta: Json
          space: string | null
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          source: string
          pull_url?: string | null
          ingest_key_hash?: string | null
          ingest_key_prefix?: string | null
          enabled?: boolean
          last_seen_at?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
          meta?: Json
          space?: string | null
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          source?: string
          pull_url?: string | null
          ingest_key_hash?: string | null
          ingest_key_prefix?: string | null
          enabled?: boolean
          last_seen_at?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
          meta?: Json
          space?: string | null
        }
        Relationships: []
      }
      device_sensors: {
        Row: {
          id: string
          device_id: string
          key: string
          label: string
          kind: string
          unit: string | null
          visible: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          device_id: string
          key: string
          label: string
          kind: string
          unit?: string | null
          visible?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          key?: string
          label?: string
          kind?: string
          unit?: string | null
          visible?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      sensor_readings: {
        Row: {
          id: number
          sensor_id: string
          household_id: string
          recorded_at: string
          value_num: number | null
          value_bool: boolean | null
          value_text: string | null
          meta: Json
        }
        Insert: {
          id?: number
          sensor_id: string
          household_id: string
          recorded_at?: string
          value_num?: number | null
          value_bool?: boolean | null
          value_text?: string | null
          meta?: Json
        }
        Update: {
          id?: number
          sensor_id?: string
          household_id?: string
          recorded_at?: string
          value_num?: number | null
          value_bool?: boolean | null
          value_text?: string | null
          meta?: Json
        }
        Relationships: []
      }
      alert_settings: {
        Row: {
          user_id: string
          enabled: boolean
          digest_enabled: boolean
          freeze_threshold_f: number
          humidity_threshold: number
          rate_change_f: number
          outage_hours: number
          email: string | null
          channel_email: boolean
          channel_sms: boolean
          channel_discord: boolean
          channel_push: boolean
          channel_webhook: boolean
          discord_webhook_url: string | null
          sms_phone: string | null
          outbound_webhook_url: string | null
          outbound_webhook_secret: string | null
          last_alert_sent_at: string | null
          last_outage_alert_at: string | null
          last_rate_alert_at: string | null
          updated_at: string
          forecast_freeze_enabled: boolean
          forecast_hours_ahead: number
          last_forecast_alert_at: string | null
          quiet_hours_enabled: boolean
          quiet_hours_start: string
          quiet_hours_end: string
          quiet_hours_timezone: string
          quiet_hours_bypass_freeze: boolean
          quiet_hours_sms_critical: boolean
          channel_telegram: boolean
          telegram_bot_token: string | null
          telegram_chat_id: string | null
          channel_slack: boolean
          slack_webhook_url: string | null
          alert_rules: Json
          channel_severity: Json
        }
        Insert: {
          user_id: string
          enabled?: boolean
          digest_enabled?: boolean
          freeze_threshold_f?: number
          humidity_threshold?: number
          rate_change_f?: number
          outage_hours?: number
          email?: string | null
          channel_email?: boolean
          channel_sms?: boolean
          channel_discord?: boolean
          channel_push?: boolean
          channel_webhook?: boolean
          discord_webhook_url?: string | null
          sms_phone?: string | null
          outbound_webhook_url?: string | null
          outbound_webhook_secret?: string | null
          last_alert_sent_at?: string | null
          last_outage_alert_at?: string | null
          last_rate_alert_at?: string | null
          updated_at?: string
          forecast_freeze_enabled?: boolean
          forecast_hours_ahead?: number
          last_forecast_alert_at?: string | null
          quiet_hours_enabled?: boolean
          quiet_hours_start?: string
          quiet_hours_end?: string
          quiet_hours_timezone?: string
          quiet_hours_bypass_freeze?: boolean
          quiet_hours_sms_critical?: boolean
          channel_telegram?: boolean
          telegram_bot_token?: string | null
          telegram_chat_id?: string | null
          channel_slack?: boolean
          slack_webhook_url?: string | null
          alert_rules?: Json
          channel_severity?: Json
        }
        Update: {
          user_id?: string
          enabled?: boolean
          digest_enabled?: boolean
          freeze_threshold_f?: number
          humidity_threshold?: number
          rate_change_f?: number
          outage_hours?: number
          email?: string | null
          channel_email?: boolean
          channel_sms?: boolean
          channel_discord?: boolean
          channel_push?: boolean
          channel_webhook?: boolean
          discord_webhook_url?: string | null
          sms_phone?: string | null
          outbound_webhook_url?: string | null
          outbound_webhook_secret?: string | null
          last_alert_sent_at?: string | null
          last_outage_alert_at?: string | null
          last_rate_alert_at?: string | null
          updated_at?: string
          forecast_freeze_enabled?: boolean
          forecast_hours_ahead?: number
          last_forecast_alert_at?: string | null
          quiet_hours_enabled?: boolean
          quiet_hours_start?: string
          quiet_hours_end?: string
          quiet_hours_timezone?: string
          quiet_hours_bypass_freeze?: boolean
          quiet_hours_sms_critical?: boolean
          channel_telegram?: boolean
          telegram_bot_token?: string | null
          telegram_chat_id?: string | null
          channel_slack?: boolean
          slack_webhook_url?: string | null
          alert_rules?: Json
          channel_severity?: Json
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string
        }
        Relationships: []
      }
      share_links: {
        Row: {
          id: string
          token: string
          household_id: string
          scope: string
          label: string | null
          expires_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          token: string
          household_id: string
          scope: string
          label?: string | null
          expires_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          token?: string
          household_id?: string
          scope?: string
          label?: string | null
          expires_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      alert_events: {
        Row: {
          id: number
          user_id: string
          kind: string
          title: string
          body: string
          channels_sent: string[]
          channels_skipped: string[]
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          kind: string
          title: string
          body: string
          channels_sent?: string[]
          channels_skipped?: string[]
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          kind?: string
          title?: string
          body?: string
          channels_sent?: string[]
          channels_skipped?: string[]
          created_at?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          id: string
          household_id: string
          name: string
          key_prefix: string
          key_hash: string
          created_by: string | null
          created_at: string
          last_used_at: string | null
          revoked_at: string | null
        }
        Insert: {
          id?: string
          household_id: string
          name?: string
          key_prefix: string
          key_hash: string
          created_by?: string | null
          created_at?: string
          last_used_at?: string | null
          revoked_at?: string | null
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          key_prefix?: string
          key_hash?: string
          created_by?: string | null
          created_at?: string
          last_used_at?: string | null
          revoked_at?: string | null
        }
        Relationships: []
      }
      freeze_map_snapshots: {
        Row: {
          id: number
          city_id: string
          city_label: string
          sample_count: number
          avg_temp_f: number | null
          min_temp_f: number | null
          freeze_risk_count: number
          captured_at: string
        }
        Insert: {
          id?: number
          city_id: string
          city_label: string
          sample_count?: number
          avg_temp_f?: number | null
          min_temp_f?: number | null
          freeze_risk_count?: number
          captured_at?: string
        }
        Update: {
          id?: number
          city_id?: string
          city_label?: string
          sample_count?: number
          avg_temp_f?: number | null
          min_temp_f?: number | null
          freeze_risk_count?: number
          captured_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      sync_plan_group_membership: {
        Args: {
          target_user_id: string
          plan_tier: string
          is_active: boolean
        }
        Returns: undefined
      }
      sync_member_group_membership: {
        Args: {
          target_user_id: string
          is_active: boolean
        }
        Returns: undefined
      }
      is_household_member: {
        Args: {
          target_household_id: string
        }
        Returns: boolean
      }
      get_user_household_id: {
        Args: {
          target_user_id: string
        }
        Returns: string
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
