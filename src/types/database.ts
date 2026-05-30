export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Rel = {
  foreignKeyName: string
  columns: string[]
  isOneToOne?: boolean
  referencedRelation: string
  referencedColumns: string[]
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          role: "admin" | "concierge" | "client"
          avatar_url: string | null
          notification_preferences: Json | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          phone?: string | null
          role?: "admin" | "concierge" | "client"
          avatar_url?: string | null
          notification_preferences?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string | null
          role?: "admin" | "concierge" | "client"
          avatar_url?: string | null
          notification_preferences?: Json | null
          created_at?: string
        }
        Relationships: Rel[]
      }
      properties: {
        Row: {
          id: string
          client_id: string
          address: string
          city: string
          state: string
          zip: string
          year_built: number | null
          square_footage: number | null
          lot_size: string | null
          property_type: "single_family" | "townhome" | "condo"
          notes: string | null
          primary_concierge_id: string | null
          fee_amount: number
          billing_period: "monthly" | "quarterly" | "annually"
          latitude: number | null
          longitude: number | null
          market_data: Json | null
          contract_start_date: string | null
          status: "active" | "paused" | "cancelled"
          cover_photo_url: string | null
          health_score: number
          onboarding_status: "not_started" | "in_progress" | "complete"
          created_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          address: string
          city: string
          state?: string
          zip: string
          year_built?: number | null
          square_footage?: number | null
          lot_size?: string | null
          property_type?: "single_family" | "townhome" | "condo"
          notes?: string | null
          primary_concierge_id?: string | null
          fee_amount?: number
          billing_period?: "monthly" | "quarterly" | "annually"
          latitude?: number | null
          longitude?: number | null
          market_data?: Json | null
          contract_start_date?: string | null
          status?: "active" | "paused" | "cancelled"
          cover_photo_url?: string | null
          health_score?: number
          onboarding_status?: "not_started" | "in_progress" | "complete"
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          address?: string
          city?: string
          state?: string
          zip?: string
          year_built?: number | null
          square_footage?: number | null
          lot_size?: string | null
          property_type?: "single_family" | "townhome" | "condo"
          notes?: string | null
          primary_concierge_id?: string | null
          fee_amount?: number
          billing_period?: "monthly" | "quarterly" | "annually"
          latitude?: number | null
          longitude?: number | null
          market_data?: Json | null
          contract_start_date?: string | null
          status?: "active" | "paused" | "cancelled"
          cover_photo_url?: string | null
          health_score?: number
          onboarding_status?: "not_started" | "in_progress" | "complete"
          created_at?: string
        }
        Relationships: Rel[]
      }
      property_onboarding: {
        Row: {
          id: string
          property_id: string
          utility_providers: Json | null
          hoa_name: string | null
          hoa_contact_phone: string | null
          hoa_contact_email: string | null
          hoa_docs_url: string | null
          alarm_company: string | null
          alarm_code: string | null
          gate_code: string | null
          spare_key_location: string | null
          wifi_network: string | null
          wifi_password: string | null
          pet_info: Json | null
          emergency_contacts: Json | null
          scheduling_preferences: string | null
          special_instructions: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          property_id: string
          utility_providers?: Json | null
          hoa_name?: string | null
          hoa_contact_phone?: string | null
          hoa_contact_email?: string | null
          hoa_docs_url?: string | null
          alarm_company?: string | null
          alarm_code?: string | null
          gate_code?: string | null
          spare_key_location?: string | null
          wifi_network?: string | null
          wifi_password?: string | null
          pet_info?: Json | null
          emergency_contacts?: Json | null
          scheduling_preferences?: string | null
          special_instructions?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          utility_providers?: Json | null
          hoa_name?: string | null
          hoa_contact_phone?: string | null
          hoa_contact_email?: string | null
          hoa_docs_url?: string | null
          alarm_company?: string | null
          alarm_code?: string | null
          gate_code?: string | null
          spare_key_location?: string | null
          wifi_network?: string | null
          wifi_password?: string | null
          pet_info?: Json | null
          emergency_contacts?: Json | null
          scheduling_preferences?: string | null
          special_instructions?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Relationships: Rel[]
      }
      assets: {
        Row: {
          id: string
          property_id: string
          category: "hvac" | "plumbing" | "electrical" | "appliance" | "roofing" | "exterior" | "pool" | "landscaping" | "smart_home" | "security" | "other"
          name: string
          brand: string | null
          model: string | null
          serial_number: string | null
          manufacture_date: string | null
          install_date: string | null
          warranty_expiration: string | null
          expected_lifespan_years: number | null
          location_in_home: string | null
          notes: string | null
          manual_url: string | null
          photo_urls: string[] | null
          status: "active" | "replaced" | "needs_attention"
          last_serviced_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          property_id: string
          category: "hvac" | "plumbing" | "electrical" | "appliance" | "roofing" | "exterior" | "pool" | "landscaping" | "smart_home" | "security" | "other"
          name: string
          brand?: string | null
          model?: string | null
          serial_number?: string | null
          manufacture_date?: string | null
          install_date?: string | null
          warranty_expiration?: string | null
          expected_lifespan_years?: number | null
          location_in_home?: string | null
          notes?: string | null
          manual_url?: string | null
          photo_urls?: string[] | null
          status?: "active" | "replaced" | "needs_attention"
          last_serviced_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          category?: "hvac" | "plumbing" | "electrical" | "appliance" | "roofing" | "exterior" | "pool" | "landscaping" | "smart_home" | "security" | "other"
          name?: string
          brand?: string | null
          model?: string | null
          serial_number?: string | null
          manufacture_date?: string | null
          install_date?: string | null
          warranty_expiration?: string | null
          expected_lifespan_years?: number | null
          location_in_home?: string | null
          notes?: string | null
          manual_url?: string | null
          photo_urls?: string[] | null
          status?: "active" | "replaced" | "needs_attention"
          last_serviced_date?: string | null
          created_at?: string
        }
        Relationships: Rel[]
      }
      vendors: {
        Row: {
          id: string
          company_name: string
          contact_name: string | null
          phone: string | null
          email: string | null
          specialty_categories: string[] | null
          license_number: string | null
          insurance_expiration: string | null
          rating: number | null
          notes: string | null
          status: "preferred" | "approved" | "probationary" | "blacklisted"
          created_at: string
        }
        Insert: {
          id?: string
          company_name: string
          contact_name?: string | null
          phone?: string | null
          email?: string | null
          specialty_categories?: string[] | null
          license_number?: string | null
          insurance_expiration?: string | null
          rating?: number | null
          notes?: string | null
          status?: "preferred" | "approved" | "probationary" | "blacklisted"
          created_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          contact_name?: string | null
          phone?: string | null
          email?: string | null
          specialty_categories?: string[] | null
          license_number?: string | null
          insurance_expiration?: string | null
          rating?: number | null
          notes?: string | null
          status?: "preferred" | "approved" | "probationary" | "blacklisted"
          created_at?: string
        }
        Relationships: Rel[]
      }
      vendor_scorecards: {
        Row: {
          id: string
          vendor_id: string
          total_jobs: number
          on_time_count: number
          average_completion_hours: number | null
          callback_count: number
          average_satisfaction_rating: number | null
          last_updated: string
        }
        Insert: {
          id?: string
          vendor_id: string
          total_jobs?: number
          on_time_count?: number
          average_completion_hours?: number | null
          callback_count?: number
          average_satisfaction_rating?: number | null
          last_updated?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          total_jobs?: number
          on_time_count?: number
          average_completion_hours?: number | null
          callback_count?: number
          average_satisfaction_rating?: number | null
          last_updated?: string
        }
        Relationships: Rel[]
      }
      work_orders: {
        Row: {
          id: string
          property_id: string
          asset_id: string | null
          vendor_id: string | null
          requested_by: string
          assigned_to: string | null
          title: string
          description: string | null
          category: string
          priority: "emergency" | "high" | "normal" | "low"
          status: "submitted" | "approved" | "scheduled" | "in_progress" | "completed" | "cancelled"
          is_emergency: boolean
          scheduled_date: string | null
          completed_date: string | null
          cost_estimate: number | null
          actual_cost: number | null
          markup_percentage: number
          client_cost: number | null
          vendor_arrived_on_time: boolean | null
          client_satisfaction: number | null
          callback_required: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          property_id: string
          asset_id?: string | null
          vendor_id?: string | null
          requested_by: string
          assigned_to?: string | null
          title: string
          description?: string | null
          category: string
          priority?: "emergency" | "high" | "normal" | "low"
          status?: "submitted" | "approved" | "scheduled" | "in_progress" | "completed" | "cancelled"
          is_emergency?: boolean
          scheduled_date?: string | null
          completed_date?: string | null
          cost_estimate?: number | null
          actual_cost?: number | null
          markup_percentage?: number
          client_cost?: number | null
          vendor_arrived_on_time?: boolean | null
          client_satisfaction?: number | null
          callback_required?: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          asset_id?: string | null
          vendor_id?: string | null
          requested_by?: string
          assigned_to?: string | null
          title?: string
          description?: string | null
          category?: string
          priority?: "emergency" | "high" | "normal" | "low"
          status?: "submitted" | "approved" | "scheduled" | "in_progress" | "completed" | "cancelled"
          is_emergency?: boolean
          scheduled_date?: string | null
          completed_date?: string | null
          cost_estimate?: number | null
          actual_cost?: number | null
          markup_percentage?: number
          client_cost?: number | null
          vendor_arrived_on_time?: boolean | null
          client_satisfaction?: number | null
          callback_required?: boolean
          notes?: string | null
          created_at?: string
        }
        Relationships: Rel[]
      }
      work_order_photos: {
        Row: {
          id: string
          work_order_id: string
          url: string
          phase: "before" | "during" | "after"
          caption: string | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          work_order_id: string
          url: string
          phase: "before" | "during" | "after"
          caption?: string | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          work_order_id?: string
          url?: string
          phase?: "before" | "during" | "after"
          caption?: string | null
          uploaded_at?: string
        }
        Relationships: Rel[]
      }
      emergency_status_updates: {
        Row: {
          id: string
          work_order_id: string
          status: "notified" | "responding" | "vendor_dispatched" | "on_site" | "resolved"
          message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          work_order_id: string
          status: "notified" | "responding" | "vendor_dispatched" | "on_site" | "resolved"
          message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          work_order_id?: string
          status?: "notified" | "responding" | "vendor_dispatched" | "on_site" | "resolved"
          message?: string | null
          created_at?: string
        }
        Relationships: Rel[]
      }
      maintenance_schedules: {
        Row: {
          id: string
          property_id: string
          asset_id: string | null
          title: string
          description: string | null
          category: string
          frequency: "monthly" | "quarterly" | "semi_annual" | "annual" | "custom"
          custom_interval_days: number | null
          season: "spring" | "summer" | "fall" | "winter" | null
          last_completed: string | null
          next_due: string | null
          vendor_id: string | null
          estimated_cost: number | null
          is_active: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          property_id: string
          asset_id?: string | null
          title: string
          description?: string | null
          category: string
          frequency: "monthly" | "quarterly" | "semi_annual" | "annual" | "custom"
          custom_interval_days?: number | null
          season?: "spring" | "summer" | "fall" | "winter" | null
          last_completed?: string | null
          next_due?: string | null
          vendor_id?: string | null
          estimated_cost?: number | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          asset_id?: string | null
          title?: string
          description?: string | null
          category?: string
          frequency?: "monthly" | "quarterly" | "semi_annual" | "annual" | "custom"
          custom_interval_days?: number | null
          season?: "spring" | "summer" | "fall" | "winter" | null
          last_completed?: string | null
          next_due?: string | null
          vendor_id?: string | null
          estimated_cost?: number | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
        }
        Relationships: Rel[]
      }
      seasonal_checklist_templates: {
        Row: {
          id: string
          season: "spring" | "summer" | "fall" | "winter"
          title: string
          description: string | null
          category: string
          applicable_asset_categories: string[] | null
          default_vendor_category: string | null
          estimated_cost: number | null
          created_at: string
        }
        Insert: {
          id?: string
          season: "spring" | "summer" | "fall" | "winter"
          title: string
          description?: string | null
          category: string
          applicable_asset_categories?: string[] | null
          default_vendor_category?: string | null
          estimated_cost?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          season?: "spring" | "summer" | "fall" | "winter"
          title?: string
          description?: string | null
          category?: string
          applicable_asset_categories?: string[] | null
          default_vendor_category?: string | null
          estimated_cost?: number | null
          created_at?: string
        }
        Relationships: Rel[]
      }
      projects: {
        Row: {
          id: string
          property_id: string
          title: string
          description: string | null
          status: "planning" | "in_progress" | "on_hold" | "completed"
          start_date: string | null
          target_completion_date: string | null
          actual_completion_date: string | null
          budget: number | null
          actual_spend: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          property_id: string
          title: string
          description?: string | null
          status?: "planning" | "in_progress" | "on_hold" | "completed"
          start_date?: string | null
          target_completion_date?: string | null
          actual_completion_date?: string | null
          budget?: number | null
          actual_spend?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          title?: string
          description?: string | null
          status?: "planning" | "in_progress" | "on_hold" | "completed"
          start_date?: string | null
          target_completion_date?: string | null
          actual_completion_date?: string | null
          budget?: number | null
          actual_spend?: number
          notes?: string | null
          created_at?: string
        }
        Relationships: Rel[]
      }
      project_tasks: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          status: "pending" | "in_progress" | "completed"
          vendor_id: string | null
          cost: number | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          status?: "pending" | "in_progress" | "completed"
          vendor_id?: string | null
          cost?: number | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string | null
          status?: "pending" | "in_progress" | "completed"
          vendor_id?: string | null
          cost?: number | null
          sort_order?: number
          created_at?: string
        }
        Relationships: Rel[]
      }
      project_photos: {
        Row: {
          id: string
          project_id: string
          url: string
          caption: string | null
          phase: string | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          project_id: string
          url: string
          caption?: string | null
          phase?: string | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          url?: string
          caption?: string | null
          phase?: string | null
          uploaded_at?: string
        }
        Relationships: Rel[]
      }
      invoices: {
        Row: {
          id: string
          property_id: string
          client_id: string
          invoice_number: string
          period_start: string
          period_end: string
          fee_amount: number
          additional_charges: Json | null
          total: number
          status: "draft" | "sent" | "paid" | "overdue"
          due_date: string
          paid_date: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          property_id: string
          client_id: string
          invoice_number: string
          period_start: string
          period_end: string
          fee_amount: number
          additional_charges?: Json | null
          total: number
          status?: "draft" | "sent" | "paid" | "overdue"
          due_date: string
          paid_date?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          client_id?: string
          invoice_number?: string
          period_start?: string
          period_end?: string
          retainer_amount?: number
          additional_charges?: Json | null
          total?: number
          status?: "draft" | "sent" | "paid" | "overdue"
          due_date?: string
          paid_date?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: Rel[]
      }
      api_usage: {
        Row: {
          service: string
          period: string
          count: number
        }
        Insert: {
          service: string
          period: string
          count?: number
        }
        Update: {
          service?: string
          period?: string
          count?: number
        }
        Relationships: Rel[]
      }
      activity_logs: {
        Row: {
          id: string
          property_id: string
          user_id: string
          action_type: string
          description: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          property_id: string
          user_id: string
          action_type: string
          description: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          user_id?: string
          action_type?: string
          description?: string
          metadata?: Json | null
          created_at?: string
        }
        Relationships: Rel[]
      }
      messages: {
        Row: {
          id: string
          property_id: string
          sender_id: string
          recipient_id: string
          subject: string
          body: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          property_id: string
          sender_id: string
          recipient_id: string
          subject: string
          body: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          sender_id?: string
          recipient_id?: string
          subject?: string
          body?: string
          is_read?: boolean
          created_at?: string
        }
        Relationships: Rel[]
      }
      referrals: {
        Row: {
          id: string
          referring_client_id: string
          referral_code: string
          referred_name: string
          referred_email: string
          referred_phone: string | null
          status: "sent" | "consultation_scheduled" | "signed" | "expired"
          credit_amount: number | null
          created_at: string
          converted_at: string | null
        }
        Insert: {
          id?: string
          referring_client_id: string
          referral_code: string
          referred_name: string
          referred_email: string
          referred_phone?: string | null
          status?: "sent" | "consultation_scheduled" | "signed" | "expired"
          credit_amount?: number | null
          created_at?: string
          converted_at?: string | null
        }
        Update: {
          id?: string
          referring_client_id?: string
          referral_code?: string
          referred_name?: string
          referred_email?: string
          referred_phone?: string | null
          status?: "sent" | "consultation_scheduled" | "signed" | "expired"
          credit_amount?: number | null
          created_at?: string
          converted_at?: string | null
        }
        Relationships: Rel[]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string
          type: string
          is_read: boolean
          link: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          body: string
          type: string
          is_read?: boolean
          link?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          body?: string
          type?: string
          is_read?: boolean
          link?: string | null
          created_at?: string
        }
        Relationships: Rel[]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_api_usage: {
        Args: { p_service: string; p_period: string }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]
