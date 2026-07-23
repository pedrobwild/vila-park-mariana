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
      contract_installments: {
        Row: {
          admin_fee: number
          contract_id: string
          contractual_value: number
          corrected_value: number | null
          created_at: string
          discount_value: number
          due_date: string
          fine_value: number
          id: string
          insurance_fee: number
          interest_value: number
          kind: string
          paid_date: string | null
          paid_value: number
          seq_label: string
          updated_at: string
        }
        Insert: {
          admin_fee?: number
          contract_id: string
          contractual_value: number
          corrected_value?: number | null
          created_at?: string
          discount_value?: number
          due_date: string
          fine_value?: number
          id?: string
          insurance_fee?: number
          interest_value?: number
          kind: string
          paid_date?: string | null
          paid_value?: number
          seq_label: string
          updated_at?: string
        }
        Update: {
          admin_fee?: number
          contract_id?: string
          contractual_value?: number
          corrected_value?: number | null
          created_at?: string
          discount_value?: number
          due_date?: string
          fine_value?: number
          id?: string
          insurance_fee?: number
          interest_value?: number
          kind?: string
          paid_date?: string | null
          paid_value?: number
          seq_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_installments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          client_name: string
          contract_date: string
          contract_number: string
          contract_value: number
          created_at: string
          id: string
          index_label: string
          late_fine_rate: number
          late_interest_monthly: number
          monthly_index_rate: number
          original_value: number
          status: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          client_name: string
          contract_date: string
          contract_number: string
          contract_value: number
          created_at?: string
          id?: string
          index_label?: string
          late_fine_rate?: number
          late_interest_monthly?: number
          monthly_index_rate?: number
          original_value: number
          status?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          client_name?: string
          contract_date?: string
          contract_number?: string
          contract_value?: number
          created_at?: string
          id?: string
          index_label?: string
          late_fine_rate?: number
          late_interest_monthly?: number
          monthly_index_rate?: number
          original_value?: number
          status?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_definitions: {
        Row: {
          created_at: string
          field_type: Database["public"]["Enums"]["custom_field_type"]
          id: string
          label: string
          options: Json
          sort_order: number
          updated_at: string
          visible_public: boolean
        }
        Insert: {
          created_at?: string
          field_type: Database["public"]["Enums"]["custom_field_type"]
          id?: string
          label: string
          options?: Json
          sort_order?: number
          updated_at?: string
          visible_public?: boolean
        }
        Update: {
          created_at?: string
          field_type?: Database["public"]["Enums"]["custom_field_type"]
          id?: string
          label?: string
          options?: Json
          sort_order?: number
          updated_at?: string
          visible_public?: boolean
        }
        Relationships: []
      }
      custom_field_values: {
        Row: {
          created_at: string
          field_id: string
          id: string
          unit_id: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          field_id: string
          id?: string
          unit_id: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          field_id?: string
          id?: string
          unit_id?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "custom_field_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_field_values_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      elephant_insights_cache: {
        Row: {
          amanda_name: string | null
          cache_key: string
          charts_data: Json | null
          created_at: string
          id: string
          insights: string
          latest_meeting: string | null
          positive_sentiment_pct: number | null
          total_duration_minutes: number
          total_meetings: number
          updated_at: string
        }
        Insert: {
          amanda_name?: string | null
          cache_key?: string
          charts_data?: Json | null
          created_at?: string
          id?: string
          insights: string
          latest_meeting?: string | null
          positive_sentiment_pct?: number | null
          total_duration_minutes?: number
          total_meetings?: number
          updated_at?: string
        }
        Update: {
          amanda_name?: string | null
          cache_key?: string
          charts_data?: Json | null
          created_at?: string
          id?: string
          insights?: string
          latest_meeting?: string | null
          positive_sentiment_pct?: number | null
          total_duration_minutes?: number
          total_meetings?: number
          updated_at?: string
        }
        Relationships: []
      }
      units: {
        Row: {
          area_m2: number
          block: string
          code: string
          created_at: string
          id: string
          planta_mime: string | null
          planta_url: string | null
          price_brl: number
          status: Database["public"]["Enums"]["unit_status"]
          updated_at: string
        }
        Insert: {
          area_m2: number
          block: string
          code: string
          created_at?: string
          id?: string
          planta_mime?: string | null
          planta_url?: string | null
          price_brl: number
          status?: Database["public"]["Enums"]["unit_status"]
          updated_at?: string
        }
        Update: {
          area_m2?: number
          block?: string
          code?: string
          created_at?: string
          id?: string
          planta_mime?: string | null
          planta_url?: string | null
          price_brl?: number
          status?: Database["public"]["Enums"]["unit_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "incorporadora"
      custom_field_type:
        | "text"
        | "currency"
        | "number"
        | "date"
        | "boolean"
        | "select"
      unit_status: "disponivel" | "reservado" | "vendido"
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
    Enums: {
      app_role: ["admin", "incorporadora"],
      custom_field_type: [
        "text",
        "currency",
        "number",
        "date",
        "boolean",
        "select",
      ],
      unit_status: ["disponivel", "reservado", "vendido"],
    },
  },
} as const
