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
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
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
          person_id: string | null
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
          person_id?: string | null
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
          person_id?: string | null
          status?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "crm_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "crm_sales_mirror"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "contracts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          content: string
          created_at: string
          deal_id: string
          id: string
          type: Database["public"]["Enums"]["crm_activity_type"]
        }
        Insert: {
          content: string
          created_at?: string
          deal_id: string
          id?: string
          type?: Database["public"]["Enums"]["crm_activity_type"]
        }
        Update: {
          content?: string
          created_at?: string
          deal_id?: string
          id?: string
          type?: Database["public"]["Enums"]["crm_activity_type"]
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_brokers: {
        Row: {
          assigned_count: number
          commission_pct: number
          created_at: string
          creci: string | null
          email: string | null
          full_name: string
          id: string
          in_rotation: boolean
          is_active: boolean
          last_assigned_at: string | null
          phone: string | null
          team: string | null
          updated_at: string
          user_id: string | null
          weight: number
        }
        Insert: {
          assigned_count?: number
          commission_pct?: number
          created_at?: string
          creci?: string | null
          email?: string | null
          full_name: string
          id?: string
          in_rotation?: boolean
          is_active?: boolean
          last_assigned_at?: string | null
          phone?: string | null
          team?: string | null
          updated_at?: string
          user_id?: string | null
          weight?: number
        }
        Update: {
          assigned_count?: number
          commission_pct?: number
          created_at?: string
          creci?: string | null
          email?: string | null
          full_name?: string
          id?: string
          in_rotation?: boolean
          is_active?: boolean
          last_assigned_at?: string | null
          phone?: string | null
          team?: string | null
          updated_at?: string
          user_id?: string | null
          weight?: number
        }
        Relationships: []
      }
      crm_commission_splits: {
        Row: {
          amount_brl: number
          beneficiary: string | null
          broker_id: string | null
          commission_id: string
          created_at: string
          id: string
          pct: number
          role: string
        }
        Insert: {
          amount_brl?: number
          beneficiary?: string | null
          broker_id?: string | null
          commission_id: string
          created_at?: string
          id?: string
          pct?: number
          role?: string
        }
        Update: {
          amount_brl?: number
          beneficiary?: string | null
          broker_id?: string | null
          commission_id?: string
          created_at?: string
          id?: string
          pct?: number
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_commission_splits_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "crm_brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_commission_splits_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "crm_commissions"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_commissions: {
        Row: {
          base_brl: number
          created_at: string
          deal_id: string
          due_date: string | null
          id: string
          notes: string | null
          paid_at: string | null
          proposal_id: string | null
          status: Database["public"]["Enums"]["crm_commission_status"]
          total_brl: number
          total_pct: number
          updated_at: string
        }
        Insert: {
          base_brl?: number
          created_at?: string
          deal_id: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          proposal_id?: string | null
          status?: Database["public"]["Enums"]["crm_commission_status"]
          total_brl?: number
          total_pct?: number
          updated_at?: string
        }
        Update: {
          base_brl?: number
          created_at?: string
          deal_id?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          proposal_id?: string | null
          status?: Database["public"]["Enums"]["crm_commission_status"]
          total_brl?: number
          total_pct?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_commissions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_commissions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "crm_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_credit_checks: {
        Row: {
          approved_amount_brl: number | null
          bank: string
          created_at: string
          deal_id: string
          decided_at: string | null
          fgts_brl: number | null
          id: string
          income_brl: number | null
          notes: string | null
          requested_amount_brl: number | null
          status: Database["public"]["Enums"]["crm_credit_status"]
          submitted_at: string | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          approved_amount_brl?: number | null
          bank: string
          created_at?: string
          deal_id: string
          decided_at?: string | null
          fgts_brl?: number | null
          id?: string
          income_brl?: number | null
          notes?: string | null
          requested_amount_brl?: number | null
          status?: Database["public"]["Enums"]["crm_credit_status"]
          submitted_at?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          approved_amount_brl?: number | null
          bank?: string
          created_at?: string
          deal_id?: string
          decided_at?: string | null
          fgts_brl?: number | null
          id?: string
          income_brl?: number | null
          notes?: string | null
          requested_amount_brl?: number | null
          status?: Database["public"]["Enums"]["crm_credit_status"]
          submitted_at?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_credit_checks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deal_units: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          interest_level: Database["public"]["Enums"]["crm_interest_level"]
          is_primary: boolean
          unit_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          interest_level?: Database["public"]["Enums"]["crm_interest_level"]
          is_primary?: boolean
          unit_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          interest_level?: Database["public"]["Enums"]["crm_interest_level"]
          is_primary?: boolean
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_deal_units_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deal_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "crm_sales_mirror"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "crm_deal_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          broker_id: string | null
          created_at: string
          expected_close_date: string | null
          id: string
          loss_reason_id: string | null
          lost_reason: string | null
          next_step: string | null
          notes: string | null
          person_id: string
          share_token: string | null
          shared_at: string | null
          stage_changed_at: string
          stage_id: string
          title: string
          updated_at: string
          value_brl: number
        }
        Insert: {
          broker_id?: string | null
          created_at?: string
          expected_close_date?: string | null
          id?: string
          loss_reason_id?: string | null
          lost_reason?: string | null
          next_step?: string | null
          notes?: string | null
          person_id: string
          share_token?: string | null
          shared_at?: string | null
          stage_changed_at?: string
          stage_id: string
          title: string
          updated_at?: string
          value_brl?: number
        }
        Update: {
          broker_id?: string | null
          created_at?: string
          expected_close_date?: string | null
          id?: string
          loss_reason_id?: string | null
          lost_reason?: string | null
          next_step?: string | null
          notes?: string | null
          person_id?: string
          share_token?: string | null
          shared_at?: string | null
          stage_changed_at?: string
          stage_id?: string
          title?: string
          updated_at?: string
          value_brl?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "crm_brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_loss_reason_id_fkey"
            columns: ["loss_reason_id"]
            isOneToOne: false
            referencedRelation: "crm_loss_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "crm_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_loss_reasons: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          position: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          position?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          position?: number
        }
        Relationships: []
      }
      crm_people: {
        Row: {
          birth_date: string | null
          cep: string | null
          city: string | null
          complement: string | null
          cpf: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          marital_status: string | null
          monthly_income_brl: number | null
          nationality: string | null
          neighborhood: string | null
          notes: string | null
          occupation: string | null
          phone: string | null
          rg: string | null
          source: Database["public"]["Enums"]["crm_source"]
          spouse_name: string | null
          state: string | null
          street: string | null
          street_number: string | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          marital_status?: string | null
          monthly_income_brl?: number | null
          nationality?: string | null
          neighborhood?: string | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          rg?: string | null
          source?: Database["public"]["Enums"]["crm_source"]
          spouse_name?: string | null
          state?: string | null
          street?: string | null
          street_number?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          marital_status?: string | null
          monthly_income_brl?: number | null
          nationality?: string | null
          neighborhood?: string | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          rg?: string | null
          source?: Database["public"]["Enums"]["crm_source"]
          spouse_name?: string | null
          state?: string | null
          street?: string | null
          street_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_proposal_acceptances: {
        Row: {
          accepted_at: string
          deal_id: string
          doc_hash: string
          id: string
          ip: string | null
          proposal_id: string
          signer_cpf: string | null
          signer_email: string | null
          signer_name: string
          snapshot: Json | null
          user_agent: string | null
        }
        Insert: {
          accepted_at?: string
          deal_id: string
          doc_hash: string
          id?: string
          ip?: string | null
          proposal_id: string
          signer_cpf?: string | null
          signer_email?: string | null
          signer_name: string
          snapshot?: Json | null
          user_agent?: string | null
        }
        Update: {
          accepted_at?: string
          deal_id?: string
          doc_hash?: string
          id?: string
          ip?: string | null
          proposal_id?: string
          signer_cpf?: string | null
          signer_email?: string | null
          signer_name?: string
          snapshot?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_proposal_acceptances_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_proposal_acceptances_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "crm_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_proposal_installments: {
        Row: {
          amount_brl: number
          created_at: string
          due_date: string
          id: string
          kind: string
          proposal_id: string
          seq_no: number
        }
        Insert: {
          amount_brl: number
          created_at?: string
          due_date: string
          id?: string
          kind: string
          proposal_id: string
          seq_no: number
        }
        Update: {
          amount_brl?: number
          created_at?: string
          due_date?: string
          id?: string
          kind?: string
          proposal_id?: string
          seq_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_proposal_installments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "crm_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_proposals: {
        Row: {
          balloon_brl: number
          balloon_count: number
          created_at: string
          deal_id: string
          discount_brl: number
          discount_pct: number
          down_payment_brl: number
          final_price_brl: number
          id: string
          keys_brl: number
          list_price_brl: number
          monthly_brl: number
          monthly_count: number
          notes: string | null
          payment_method: string
          status: string
          unit_id: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          balloon_brl?: number
          balloon_count?: number
          created_at?: string
          deal_id: string
          discount_brl?: number
          discount_pct?: number
          down_payment_brl?: number
          final_price_brl: number
          id?: string
          keys_brl?: number
          list_price_brl: number
          monthly_brl?: number
          monthly_count?: number
          notes?: string | null
          payment_method?: string
          status?: string
          unit_id: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          balloon_brl?: number
          balloon_count?: number
          created_at?: string
          deal_id?: string
          discount_brl?: number
          discount_pct?: number
          down_payment_brl?: number
          final_price_brl?: number
          id?: string
          keys_brl?: number
          list_price_brl?: number
          monthly_brl?: number
          monthly_count?: number
          notes?: string | null
          payment_method?: string
          status?: string
          unit_id?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_proposals_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_proposals_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "crm_sales_mirror"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "crm_proposals_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_settings: {
        Row: {
          default_commission_pct: number
          id: boolean
          roleta_enabled: boolean
          stale_deal_days: number
          task_sla_days: number
          updated_at: string
          vpl_correct_by_incc: boolean
          vpl_monthly_rate: number
        }
        Insert: {
          default_commission_pct?: number
          id?: boolean
          roleta_enabled?: boolean
          stale_deal_days?: number
          task_sla_days?: number
          updated_at?: string
          vpl_correct_by_incc?: boolean
          vpl_monthly_rate?: number
        }
        Update: {
          default_commission_pct?: number
          id?: boolean
          roleta_enabled?: boolean
          stale_deal_days?: number
          task_sla_days?: number
          updated_at?: string
          vpl_correct_by_incc?: boolean
          vpl_monthly_rate?: number
        }
        Relationships: []
      }
      crm_stage_events: {
        Row: {
          changed_at: string
          deal_id: string
          from_stage_id: string | null
          id: string
          to_stage_id: string | null
        }
        Insert: {
          changed_at?: string
          deal_id: string
          from_stage_id?: string | null
          id?: string
          to_stage_id?: string | null
        }
        Update: {
          changed_at?: string
          deal_id?: string
          from_stage_id?: string | null
          id?: string
          to_stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_stage_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_stages: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          kind: string
          label: string
          position: number
          reserves_unit: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean
          kind?: string
          label: string
          position: number
          reserves_unit?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          kind?: string
          label?: string
          position?: number
          reserves_unit?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      crm_tasks: {
        Row: {
          broker_id: string | null
          created_at: string
          deal_id: string
          done: boolean
          done_at: string | null
          due_date: string | null
          id: string
          kind: Database["public"]["Enums"]["crm_task_kind"]
          notes: string | null
          title: string
          updated_at: string
        }
        Insert: {
          broker_id?: string | null
          created_at?: string
          deal_id: string
          done?: boolean
          done_at?: string | null
          due_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["crm_task_kind"]
          notes?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          broker_id?: string | null
          created_at?: string
          deal_id?: string
          done?: boolean
          done_at?: string | null
          due_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["crm_task_kind"]
          notes?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "crm_brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
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
            referencedRelation: "crm_sales_mirror"
            referencedColumns: ["unit_id"]
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
      unit_plantas: {
        Row: {
          created_at: string
          filename: string | null
          id: string
          mime: string | null
          size: number | null
          storage_path: string | null
          unit_id: string
          url: string
        }
        Insert: {
          created_at?: string
          filename?: string | null
          id?: string
          mime?: string | null
          size?: number | null
          storage_path?: string | null
          unit_id: string
          url: string
        }
        Update: {
          created_at?: string
          filename?: string | null
          id?: string
          mime?: string | null
          size?: number | null
          storage_path?: string | null
          unit_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_plantas_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "crm_sales_mirror"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "unit_plantas_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
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
      crm_sales_mirror: {
        Row: {
          area_m2: number | null
          best_proposal_brl: number | null
          block: string | null
          code: string | null
          col_no: string | null
          floor_no: number | null
          interested_count: number | null
          interested_names: string | null
          mirror_status: string | null
          price_brl: number | null
          proposals_count: number | null
          unit_id: string | null
          unit_status: string | null
        }
        Insert: {
          area_m2?: number | null
          best_proposal_brl?: never
          block?: string | null
          code?: string | null
          col_no?: never
          floor_no?: never
          interested_count?: never
          interested_names?: never
          mirror_status?: never
          price_brl?: number | null
          proposals_count?: never
          unit_id?: string | null
          unit_status?: never
        }
        Update: {
          area_m2?: number | null
          best_proposal_brl?: never
          block?: string | null
          code?: string | null
          col_no?: never
          floor_no?: never
          interested_count?: never
          interested_names?: never
          mirror_status?: never
          price_brl?: number | null
          proposals_count?: never
          unit_id?: string | null
          unit_status?: never
        }
        Relationships: []
      }
    }
    Functions: {
      accept_shared_proposal: {
        Args: {
          _proposal_id: string
          _signer_cpf?: string
          _signer_email?: string
          _signer_name: string
          _token: string
          _user_agent?: string
        }
        Returns: Json
      }
      crm_apply_deal_value: { Args: { d: string }; Returns: undefined }
      crm_assign_broker: { Args: { _deal: string }; Returns: string }
      crm_dashboard: { Args: { _from?: string; _to?: string }; Returns: Json }
      crm_next_broker: { Args: never; Returns: string }
      get_shared_proposal: { Args: { _token: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "incorporadora"
      crm_activity_type:
        | "nota"
        | "ligacao"
        | "email"
        | "whatsapp"
        | "visita"
        | "mudanca_etapa"
      crm_commission_status: "prevista" | "a_pagar" | "paga" | "cancelada"
      crm_credit_status:
        | "nao_iniciada"
        | "em_analise"
        | "aprovada"
        | "aprovada_parcial"
        | "reprovada"
      crm_interest_level: "alta" | "media" | "baixa"
      crm_source:
        | "indicacao"
        | "portal"
        | "plantao"
        | "instagram"
        | "site"
        | "outro"
      crm_stage:
        | "lead"
        | "qualificado"
        | "visita"
        | "proposta"
        | "reserva"
        | "fechado"
        | "perdido"
      crm_task_kind:
        | "ligacao"
        | "whatsapp"
        | "email"
        | "visita"
        | "documentacao"
        | "follow_up"
        | "outro"
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
      crm_activity_type: [
        "nota",
        "ligacao",
        "email",
        "whatsapp",
        "visita",
        "mudanca_etapa",
      ],
      crm_commission_status: ["prevista", "a_pagar", "paga", "cancelada"],
      crm_credit_status: [
        "nao_iniciada",
        "em_analise",
        "aprovada",
        "aprovada_parcial",
        "reprovada",
      ],
      crm_interest_level: ["alta", "media", "baixa"],
      crm_source: [
        "indicacao",
        "portal",
        "plantao",
        "instagram",
        "site",
        "outro",
      ],
      crm_stage: [
        "lead",
        "qualificado",
        "visita",
        "proposta",
        "reserva",
        "fechado",
        "perdido",
      ],
      crm_task_kind: [
        "ligacao",
        "whatsapp",
        "email",
        "visita",
        "documentacao",
        "follow_up",
        "outro",
      ],
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
