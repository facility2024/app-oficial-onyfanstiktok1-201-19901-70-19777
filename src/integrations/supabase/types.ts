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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      active_sessions: {
        Row: {
          address: string | null
          city: string | null
          config_id: string | null
          created_at: string | null
          device_type: string
          id: string
          last_seen_at: string | null
          neighborhood: string | null
          region: string | null
          session_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          config_id?: string | null
          created_at?: string | null
          device_type?: string
          id?: string
          last_seen_at?: string | null
          neighborhood?: string | null
          region?: string | null
          session_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          config_id?: string | null
          created_at?: string | null
          device_type?: string
          id?: string
          last_seen_at?: string | null
          neighborhood?: string | null
          region?: string | null
          session_id?: string
        }
        Relationships: []
      }
      admin_media: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          media_type: string
          order_index: number
          page_id: string
          title: string | null
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          media_type: string
          order_index?: number
          page_id: string
          title?: string | null
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          media_type?: string
          order_index?: number
          page_id?: string
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_media_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "admin_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_pages: {
        Row: {
          avatar_url: string | null
          content: Json
          created_at: string
          handle: string
          id: string
          is_active: boolean
          name: string
          theme: Json
          updated_at: string
          version: number
        }
        Insert: {
          avatar_url?: string | null
          content?: Json
          created_at?: string
          handle: string
          id?: string
          is_active?: boolean
          name: string
          theme?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          avatar_url?: string | null
          content?: Json
          created_at?: string
          handle?: string
          id?: string
          is_active?: boolean
          name?: string
          theme?: Json
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_versions: {
        Row: {
          changes_summary: string | null
          content: Json
          created_at: string
          created_by: string | null
          id: string
          page_id: string
          version_number: number
        }
        Insert: {
          changes_summary?: string | null
          content: Json
          created_at?: string
          created_by?: string | null
          id?: string
          page_id: string
          version_number: number
        }
        Update: {
          changes_summary?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          page_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "admin_versions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "admin_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_garotas_top: {
        Row: {
          created_at: string
          cta_link: string | null
          cta_texto: string
          id: string
          imagem_url: string
          is_active: boolean
          nome: string
          ordem: number
          updated_at: string
          valor: number | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          cta_link?: string | null
          cta_texto?: string
          id?: string
          imagem_url: string
          is_active?: boolean
          nome: string
          ordem?: number
          updated_at?: string
          valor?: number | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          cta_link?: string | null
          cta_texto?: string
          id?: string
          imagem_url?: string
          is_active?: boolean
          nome?: string
          ordem?: number
          updated_at?: string
          valor?: number | null
          video_url?: string | null
        }
        Relationships: []
      }
      ads_latinas: {
        Row: {
          created_at: string
          cta_link: string | null
          cta_texto: string | null
          id: string
          imagem_url: string
          is_active: boolean
          nome: string
          ordem: number
          updated_at: string
          valor: number | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          cta_link?: string | null
          cta_texto?: string | null
          id?: string
          imagem_url: string
          is_active?: boolean
          nome: string
          ordem?: number
          updated_at?: string
          valor?: number | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          cta_link?: string | null
          cta_texto?: string | null
          id?: string
          imagem_url?: string
          is_active?: boolean
          nome?: string
          ordem?: number
          updated_at?: string
          valor?: number | null
          video_url?: string | null
        }
        Relationships: []
      }
      agendamento_execucoes: {
        Row: {
          created_at: string
          data_execucao: string
          erro_mensagem: string | null
          id: string
          post_agendado_id: string
          status_execucao: string
          tentativas: number
        }
        Insert: {
          created_at?: string
          data_execucao?: string
          erro_mensagem?: string | null
          id?: string
          post_agendado_id: string
          status_execucao?: string
          tentativas?: number
        }
        Update: {
          created_at?: string
          data_execucao?: string
          erro_mensagem?: string | null
          id?: string
          post_agendado_id?: string
          status_execucao?: string
          tentativas?: number
        }
        Relationships: [
          {
            foreignKeyName: "agendamento_execucoes_post_agendado_id_fkey"
            columns: ["post_agendado_id"]
            isOneToOne: false
            referencedRelation: "posts_agendados"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_messages: {
        Row: {
          agent_id: string
          content: string
          created_at: string | null
          direction: string
          id: string
          message_type: string | null
          metadata: Json | null
          status: string | null
          updated_at: string | null
          user_name: string | null
          user_phone: string
        }
        Insert: {
          agent_id: string
          content: string
          created_at?: string | null
          direction: string
          id?: string
          message_type?: string | null
          metadata?: Json | null
          status?: string | null
          updated_at?: string | null
          user_name?: string | null
          user_phone: string
        }
        Update: {
          agent_id?: string
          content?: string
          created_at?: string | null
          direction?: string
          id?: string
          message_type?: string | null
          metadata?: Json | null
          status?: string | null
          updated_at?: string | null
          user_name?: string | null
          user_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          ai_config: Json | null
          ai_provider: string | null
          avatar_url: string | null
          capabilities: Json | null
          context: string | null
          created_at: string | null
          description: string | null
          id: string
          last_activity: string | null
          name: string
          phone: string | null
          prompt: string | null
          response_delay_max: number | null
          response_delay_min: number | null
          status: string | null
          total_messages: number | null
          typing_speed: number | null
          updated_at: string | null
          user_id: string | null
          whatsapp_instance: string | null
        }
        Insert: {
          ai_config?: Json | null
          ai_provider?: string | null
          avatar_url?: string | null
          capabilities?: Json | null
          context?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_activity?: string | null
          name: string
          phone?: string | null
          prompt?: string | null
          response_delay_max?: number | null
          response_delay_min?: number | null
          status?: string | null
          total_messages?: number | null
          typing_speed?: number | null
          updated_at?: string | null
          user_id?: string | null
          whatsapp_instance?: string | null
        }
        Update: {
          ai_config?: Json | null
          ai_provider?: string | null
          avatar_url?: string | null
          capabilities?: Json | null
          context?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_activity?: string | null
          name?: string
          phone?: string | null
          prompt?: string | null
          response_delay_max?: number | null
          response_delay_min?: number | null
          status?: string | null
          total_messages?: number | null
          typing_speed?: number | null
          updated_at?: string | null
          user_id?: string | null
          whatsapp_instance?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          browser_name: string | null
          city: string | null
          country: string | null
          created_at: string | null
          creator_id: string | null
          device_type: string | null
          event_category: string | null
          event_data: Json | null
          event_name: string
          id: string
          ip_address: string | null
          model_id: string | null
          os_name: string | null
          page_url: string | null
          referrer_url: string | null
          region: string | null
          screen_resolution: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          video_id: string | null
        }
        Insert: {
          browser_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          creator_id?: string | null
          device_type?: string | null
          event_category?: string | null
          event_data?: Json | null
          event_name: string
          id?: string
          ip_address?: string | null
          model_id?: string | null
          os_name?: string | null
          page_url?: string | null
          referrer_url?: string | null
          region?: string | null
          screen_resolution?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Update: {
          browser_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          creator_id?: string | null
          device_type?: string | null
          event_category?: string | null
          event_data?: Json | null
          event_name?: string
          id?: string
          ip_address?: string | null
          model_id?: string | null
          os_name?: string | null
          page_url?: string | null
          referrer_url?: string | null
          region?: string | null
          screen_resolution?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "popular_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "top_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      app_statistics: {
        Row: {
          additional_data: Json | null
          created_at: string | null
          date_recorded: string | null
          id: string
          metric_name: string
          metric_type: string
          metric_value: string
        }
        Insert: {
          additional_data?: Json | null
          created_at?: string | null
          date_recorded?: string | null
          id?: string
          metric_name: string
          metric_type: string
          metric_value: string
        }
        Update: {
          additional_data?: Json | null
          created_at?: string | null
          date_recorded?: string | null
          id?: string
          metric_name?: string
          metric_type?: string
          metric_value?: string
        }
        Relationships: []
      }
      app_users: {
        Row: {
          created_at: string
          email: string
          id: string
          maior_idade: boolean
          nome: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          maior_idade?: boolean
          nome: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          maior_idade?: boolean
          nome?: string
          whatsapp?: string
        }
        Relationships: []
      }
      audience_snapshots: {
        Row: {
          config_id: string
          id: string
          snapshot_at: string | null
          viewer_count: number
        }
        Insert: {
          config_id: string
          id?: string
          snapshot_at?: string | null
          viewer_count?: number
        }
        Update: {
          config_id?: string
          id?: string
          snapshot_at?: string | null
          viewer_count?: number
        }
        Relationships: []
      }
      audio_library_urls: {
        Row: {
          created_at: string
          id: string
          name: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "top_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_user_actions: {
        Row: {
          action_type: string
          bonus_user_id: string | null
          created_at: string | null
          id: string
          model_id: string | null
          points_earned: number | null
          video_id: string | null
        }
        Insert: {
          action_type: string
          bonus_user_id?: string | null
          created_at?: string | null
          id?: string
          model_id?: string | null
          points_earned?: number | null
          video_id?: string | null
        }
        Update: {
          action_type?: string
          bonus_user_id?: string | null
          created_at?: string | null
          id?: string
          model_id?: string | null
          points_earned?: number | null
          video_id?: string | null
        }
        Relationships: []
      }
      cadastro_empresas: {
        Row: {
          cnpj: string | null
          created_at: string
          email: string
          id: string
          nome_negocio: string
          nome_responsavel: string
          notas: string | null
          status: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          email: string
          id?: string
          nome_negocio: string
          nome_responsavel: string
          notas?: string | null
          status?: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          email?: string
          id?: string
          nome_negocio?: string
          nome_responsavel?: string
          notas?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      cadastro_modelos: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string
          notas: string | null
          status: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          nome: string
          notas?: string | null
          status?: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string
          notas?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      campaign_participations: {
        Row: {
          campaign_id: string | null
          completion_date: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          participation_data: Json | null
          points_earned: number | null
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          completion_date?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          participation_data?: Json | null
          points_earned?: number | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          completion_date?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          participation_data?: Json | null
          points_earned?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_participations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_participations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "top_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_participations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          bonus_multiplier: number | null
          bonus_points: number | null
          campaign_type: string | null
          created_at: string | null
          current_participants: number | null
          description: string | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          is_automatic: boolean | null
          max_participants: number | null
          max_uses_per_user: number | null
          name: string
          notification_config: Json | null
          popup_config: Json | null
          starts_at: string | null
          target_audience: Json | null
          total_conversions: number | null
          total_points_awarded: number | null
          updated_at: string | null
        }
        Insert: {
          bonus_multiplier?: number | null
          bonus_points?: number | null
          campaign_type?: string | null
          created_at?: string | null
          current_participants?: number | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          is_automatic?: boolean | null
          max_participants?: number | null
          max_uses_per_user?: number | null
          name: string
          notification_config?: Json | null
          popup_config?: Json | null
          starts_at?: string | null
          target_audience?: Json | null
          total_conversions?: number | null
          total_points_awarded?: number | null
          updated_at?: string | null
        }
        Update: {
          bonus_multiplier?: number | null
          bonus_points?: number | null
          campaign_type?: string | null
          created_at?: string | null
          current_participants?: number | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          is_automatic?: boolean | null
          max_participants?: number | null
          max_uses_per_user?: number | null
          name?: string
          notification_config?: Json | null
          popup_config?: Json | null
          starts_at?: string | null
          target_audience?: Json | null
          total_conversions?: number | null
          total_points_awarded?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_logs: {
        Row: {
          agent_id: string
          agent_response: string
          created_at: string | null
          id: string
          session_id: string | null
          user_id: string | null
          user_message: string
        }
        Insert: {
          agent_id: string
          agent_response: string
          created_at?: string | null
          id?: string
          session_id?: string | null
          user_id?: string | null
          user_message: string
        }
        Update: {
          agent_id?: string
          agent_response?: string
          created_at?: string | null
          id?: string
          session_id?: string | null
          user_id?: string | null
          user_message?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      chat_messages_backup: {
        Row: {
          agent_id: string
          agent_response: string
          backed_up_at: string
          created_at: string
          id: string
          links_extracted: string[] | null
          media_urls: string[] | null
          message_metadata: Json | null
          original_timestamp: string
          session_id: string
          updated_at: string
          user_id: string | null
          user_message: string
        }
        Insert: {
          agent_id: string
          agent_response: string
          backed_up_at?: string
          created_at?: string
          id?: string
          links_extracted?: string[] | null
          media_urls?: string[] | null
          message_metadata?: Json | null
          original_timestamp?: string
          session_id: string
          updated_at?: string
          user_id?: string | null
          user_message: string
        }
        Update: {
          agent_id?: string
          agent_response?: string
          backed_up_at?: string
          created_at?: string
          id?: string
          links_extracted?: string[] | null
          media_urls?: string[] | null
          message_metadata?: Json | null
          original_timestamp?: string
          session_id?: string
          updated_at?: string
          user_id?: string | null
          user_message?: string
        }
        Relationships: []
      }
      checkins_locais: {
        Row: {
          atividades_realizadas: string[] | null
          automatico: boolean | null
          avaliacao_local: number | null
          categoria_local: string | null
          comentario_checkin: string | null
          companhias: string[] | null
          compartilhado: boolean | null
          data_checkin: string | null
          data_checkout: string | null
          duracao_permanencia: number | null
          endereco: string | null
          fotos_checkin: string[] | null
          gastos_estimados: number | null
          humor_usuario: string | null
          id: string
          latitude: number | null
          local_id: string | null
          longitude: number | null
          nome_local: string | null
          tags_checkin: string[] | null
          usuario_id: string | null
          visibilidade: string | null
        }
        Insert: {
          atividades_realizadas?: string[] | null
          automatico?: boolean | null
          avaliacao_local?: number | null
          categoria_local?: string | null
          comentario_checkin?: string | null
          companhias?: string[] | null
          compartilhado?: boolean | null
          data_checkin?: string | null
          data_checkout?: string | null
          duracao_permanencia?: number | null
          endereco?: string | null
          fotos_checkin?: string[] | null
          gastos_estimados?: number | null
          humor_usuario?: string | null
          id?: string
          latitude?: number | null
          local_id?: string | null
          longitude?: number | null
          nome_local?: string | null
          tags_checkin?: string[] | null
          usuario_id?: string | null
          visibilidade?: string | null
        }
        Update: {
          atividades_realizadas?: string[] | null
          automatico?: boolean | null
          avaliacao_local?: number | null
          categoria_local?: string | null
          comentario_checkin?: string | null
          companhias?: string[] | null
          compartilhado?: boolean | null
          data_checkin?: string | null
          data_checkout?: string | null
          duracao_permanencia?: number | null
          endereco?: string | null
          fotos_checkin?: string[] | null
          gastos_estimados?: number | null
          humor_usuario?: string | null
          id?: string
          latitude?: number | null
          local_id?: string | null
          longitude?: number | null
          nome_local?: string | null
          tags_checkin?: string[] | null
          usuario_id?: string | null
          visibilidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkins_locais_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "locais_favoritos"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_order_bumps: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          imagem_url: string | null
          ordem: number
          titulo: string
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          ordem?: number
          titulo: string
          updated_at?: string
          valor?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          ordem?: number
          titulo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      cocoflix_content: {
        Row: {
          category: string
          created_at: string
          creator_id: string | null
          description: string | null
          id: string
          is_active: boolean
          model_id: string | null
          preview_video_url: string | null
          price: number
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          creator_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          model_id?: string | null
          preview_video_url?: string | null
          price?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          creator_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          model_id?: string | null
          preview_video_url?: string | null
          price?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cocoflix_content_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cocoflix_content_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cocoflix_content_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "popular_models"
            referencedColumns: ["id"]
          },
        ]
      }
      comentarios_evento_vivo: {
        Row: {
          comentario_texto: string
          curtidas: number | null
          data_criacao: string | null
          evento_id: string | null
          id: string
          moderado: boolean | null
          reportado: boolean | null
          resposta_para: string | null
          timestamp_video: number | null
          tipo_comentario: string | null
          usuario_id: string | null
          visivel: boolean | null
        }
        Insert: {
          comentario_texto: string
          curtidas?: number | null
          data_criacao?: string | null
          evento_id?: string | null
          id?: string
          moderado?: boolean | null
          reportado?: boolean | null
          resposta_para?: string | null
          timestamp_video?: number | null
          tipo_comentario?: string | null
          usuario_id?: string | null
          visivel?: boolean | null
        }
        Update: {
          comentario_texto?: string
          curtidas?: number | null
          data_criacao?: string | null
          evento_id?: string | null
          id?: string
          moderado?: boolean | null
          reportado?: boolean | null
          resposta_para?: string | null
          timestamp_video?: number | null
          tipo_comentario?: string | null
          usuario_id?: string | null
          visivel?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_evento_vivo_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_ao_vivo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_evento_vivo_resposta_para_fkey"
            columns: ["resposta_para"]
            isOneToOne: false
            referencedRelation: "comentarios_evento_vivo"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          is_approved: boolean | null
          is_edited: boolean | null
          is_pinned: boolean | null
          is_reported: boolean | null
          likes_count: number | null
          media_type: string | null
          media_url: string | null
          model_id: string | null
          moderation_status: string | null
          parent_comment_id: string | null
          replies_count: number | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
          video_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          is_approved?: boolean | null
          is_edited?: boolean | null
          is_pinned?: boolean | null
          is_reported?: boolean | null
          likes_count?: number | null
          media_type?: string | null
          media_url?: string | null
          model_id?: string | null
          moderation_status?: string | null
          parent_comment_id?: string | null
          replies_count?: number | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          is_approved?: boolean | null
          is_edited?: boolean | null
          is_pinned?: boolean | null
          is_reported?: boolean | null
          likes_count?: number | null
          media_type?: string | null
          media_url?: string | null
          model_id?: string | null
          moderation_status?: string | null
          parent_comment_id?: string | null
          replies_count?: number | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "popular_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      compartilhamentos: {
        Row: {
          cliques_compartilhamento: number | null
          comentario_id: string | null
          configuracoes_privacidade: Json | null
          conteudo_id: string | null
          conversoes_compartilhamento: number | null
          data_criacao: string | null
          data_expiracao: string | null
          evento_id: string | null
          id: string
          mensagem_personalizada: string | null
          metodo_compartilhamento: string | null
          plataforma_destino: string
          tipo_conteudo: string
          usuario_id: string | null
          visualizacoes_compartilhamento: number | null
        }
        Insert: {
          cliques_compartilhamento?: number | null
          comentario_id?: string | null
          configuracoes_privacidade?: Json | null
          conteudo_id?: string | null
          conversoes_compartilhamento?: number | null
          data_criacao?: string | null
          data_expiracao?: string | null
          evento_id?: string | null
          id?: string
          mensagem_personalizada?: string | null
          metodo_compartilhamento?: string | null
          plataforma_destino: string
          tipo_conteudo: string
          usuario_id?: string | null
          visualizacoes_compartilhamento?: number | null
        }
        Update: {
          cliques_compartilhamento?: number | null
          comentario_id?: string | null
          configuracoes_privacidade?: Json | null
          conteudo_id?: string | null
          conversoes_compartilhamento?: number | null
          data_criacao?: string | null
          data_expiracao?: string | null
          evento_id?: string | null
          id?: string
          mensagem_personalizada?: string | null
          metodo_compartilhamento?: string | null
          plataforma_destino?: string
          tipo_conteudo?: string
          usuario_id?: string | null
          visualizacoes_compartilhamento?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compartilhamentos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_ao_vivo"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_localizacao: {
        Row: {
          alertas_mudanca_local: boolean | null
          atualizacao_automatica: boolean | null
          backup_localizacoes: boolean | null
          compartilhar_com_amigos: boolean | null
          compartilhar_em_eventos: boolean | null
          data_atualizacao: string | null
          data_criacao: string | null
          detectar_locais_favoritos: boolean | null
          frequencia_atualizacao: number | null
          id: string
          localizacao_ativada: boolean | null
          modo_privado: boolean | null
          mostrar_cidade_perfil: boolean | null
          precisao_preferida: string | null
          salvar_historico: boolean | null
          sincronizar_dispositivos: boolean | null
          tempo_retencao_historico: number | null
          usuario_id: string | null
        }
        Insert: {
          alertas_mudanca_local?: boolean | null
          atualizacao_automatica?: boolean | null
          backup_localizacoes?: boolean | null
          compartilhar_com_amigos?: boolean | null
          compartilhar_em_eventos?: boolean | null
          data_atualizacao?: string | null
          data_criacao?: string | null
          detectar_locais_favoritos?: boolean | null
          frequencia_atualizacao?: number | null
          id?: string
          localizacao_ativada?: boolean | null
          modo_privado?: boolean | null
          mostrar_cidade_perfil?: boolean | null
          precisao_preferida?: string | null
          salvar_historico?: boolean | null
          sincronizar_dispositivos?: boolean | null
          tempo_retencao_historico?: number | null
          usuario_id?: string | null
        }
        Update: {
          alertas_mudanca_local?: boolean | null
          atualizacao_automatica?: boolean | null
          backup_localizacoes?: boolean | null
          compartilhar_com_amigos?: boolean | null
          compartilhar_em_eventos?: boolean | null
          data_atualizacao?: string | null
          data_criacao?: string | null
          detectar_locais_favoritos?: boolean | null
          frequencia_atualizacao?: number | null
          id?: string
          localizacao_ativada?: boolean | null
          modo_privado?: boolean | null
          mostrar_cidade_perfil?: boolean | null
          precisao_preferida?: string | null
          salvar_historico?: boolean | null
          sincronizar_dispositivos?: boolean | null
          tempo_retencao_historico?: number | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      configuracoes_usuario: {
        Row: {
          autenticacao_dois_fatores: boolean | null
          data_atualizacao: string | null
          data_criacao: string | null
          fuso_horario: string | null
          id: string
          idioma: string | null
          notificacoes_ativadas: boolean | null
          notificacoes_email: boolean | null
          notificacoes_push: boolean | null
          tema: string | null
          usuario_id: string | null
        }
        Insert: {
          autenticacao_dois_fatores?: boolean | null
          data_atualizacao?: string | null
          data_criacao?: string | null
          fuso_horario?: string | null
          id?: string
          idioma?: string | null
          notificacoes_ativadas?: boolean | null
          notificacoes_email?: boolean | null
          notificacoes_push?: boolean | null
          tema?: string | null
          usuario_id?: string | null
        }
        Update: {
          autenticacao_dois_fatores?: boolean | null
          data_atualizacao?: string | null
          data_criacao?: string | null
          fuso_horario?: string | null
          id?: string
          idioma?: string | null
          notificacoes_ativadas?: boolean | null
          notificacoes_email?: boolean | null
          notificacoes_push?: boolean | null
          tema?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      conteudo_paginas: {
        Row: {
          arquivos_urls: string[] | null
          categoria: string | null
          curtidas: number | null
          data_atualizacao: string | null
          data_publicacao: string | null
          id: string
          imagens_urls: string[] | null
          pagina_id: string | null
          status_conteudo: string | null
          tags: string[] | null
          texto_conteudo: string | null
          titulo_conteudo: string | null
          usuario_id: string | null
          videos_urls: string[] | null
        }
        Insert: {
          arquivos_urls?: string[] | null
          categoria?: string | null
          curtidas?: number | null
          data_atualizacao?: string | null
          data_publicacao?: string | null
          id?: string
          imagens_urls?: string[] | null
          pagina_id?: string | null
          status_conteudo?: string | null
          tags?: string[] | null
          texto_conteudo?: string | null
          titulo_conteudo?: string | null
          usuario_id?: string | null
          videos_urls?: string[] | null
        }
        Update: {
          arquivos_urls?: string[] | null
          categoria?: string | null
          curtidas?: number | null
          data_atualizacao?: string | null
          data_publicacao?: string | null
          id?: string
          imagens_urls?: string[] | null
          pagina_id?: string | null
          status_conteudo?: string | null
          tags?: string[] | null
          texto_conteudo?: string | null
          titulo_conteudo?: string | null
          usuario_id?: string | null
          videos_urls?: string[] | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          contract_content: string
          created_at: string | null
          fields: Json
          id: string
          signature_data: Json | null
          signed_at: string | null
          signer_name: string
          signer_slug: string
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          contract_content: string
          created_at?: string | null
          fields?: Json
          id?: string
          signature_data?: Json | null
          signed_at?: string | null
          signer_name: string
          signer_slug: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          contract_content?: string
          created_at?: string | null
          fields?: Json
          id?: string
          signature_data?: Json | null
          signed_at?: string | null
          signer_name?: string
          signer_slug?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      creator_applications: {
        Row: {
          accepted_image_rights: boolean
          accepted_terms: boolean
          bio: string
          created_at: string
          email: string
          full_name: string
          gender: string
          id: string
          nickname: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
          whatsapp: string
        }
        Insert: {
          accepted_image_rights?: boolean
          accepted_terms?: boolean
          bio: string
          created_at?: string
          email: string
          full_name: string
          gender: string
          id?: string
          nickname: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          whatsapp: string
        }
        Update: {
          accepted_image_rights?: boolean
          accepted_terms?: boolean
          bio?: string
          created_at?: string
          email?: string
          full_name?: string
          gender?: string
          id?: string
          nickname?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string
        }
        Relationships: []
      }
      cta_clicks: {
        Row: {
          clicked_at: string | null
          config_id: string
          device_type: string
          id: string
          session_id: string
        }
        Insert: {
          clicked_at?: string | null
          config_id: string
          device_type?: string
          id?: string
          session_id: string
        }
        Update: {
          clicked_at?: string | null
          config_id?: string
          device_type?: string
          id?: string
          session_id?: string
        }
        Relationships: []
      }
      curtidas_reacoes: {
        Row: {
          comentario_id: string | null
          conteudo_id: string | null
          data_criacao: string | null
          id: string
          tipo_reacao: string | null
          usuario_id: string | null
        }
        Insert: {
          comentario_id?: string | null
          conteudo_id?: string | null
          data_criacao?: string | null
          id?: string
          tipo_reacao?: string | null
          usuario_id?: string | null
        }
        Update: {
          comentario_id?: string | null
          conteudo_id?: string | null
          data_criacao?: string | null
          id?: string
          tipo_reacao?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      dados_sem_senha: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          nome: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      daily_actions: {
        Row: {
          action_date: string | null
          action_type: string
          comment_id: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          is_completed: boolean | null
          model_id: string | null
          points_earned: number | null
          share_id: string | null
          user_agent: string | null
          user_id: string | null
          video_id: string | null
        }
        Insert: {
          action_date?: string | null
          action_type: string
          comment_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          is_completed?: boolean | null
          model_id?: string | null
          points_earned?: number | null
          share_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Update: {
          action_date?: string | null
          action_type?: string
          comment_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          is_completed?: boolean | null
          model_id?: string | null
          points_earned?: number | null
          share_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_actions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_actions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_actions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "popular_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "top_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_actions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_missions: {
        Row: {
          action_type: string
          category: string | null
          created_at: string
          description: string | null
          difficulty: string
          icon: string | null
          id: string
          is_active: boolean
          max_completions_per_day: number | null
          points_reward: number
          priority: number
          requirements: Json | null
          reward_description: string | null
          target_count: number
          time_limit_hours: number | null
          title: string
          updated_at: string
        }
        Insert: {
          action_type: string
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          max_completions_per_day?: number | null
          points_reward?: number
          priority?: number
          requirements?: Json | null
          reward_description?: string | null
          target_count?: number
          time_limit_hours?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          max_completions_per_day?: number | null
          points_reward?: number
          priority?: number
          requirements?: Json | null
          reward_description?: string | null
          target_count?: number
          time_limit_hours?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_tasks: {
        Row: {
          completed_tasks: number | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          last_action_at: string | null
          points_earned_today: number | null
          reset_at: string | null
          task_date: string | null
          total_actions: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_tasks?: number | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          last_action_at?: string | null
          points_earned_today?: number | null
          reset_at?: string | null
          task_date?: string | null
          total_actions?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_tasks?: number | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          last_action_at?: string | null
          points_earned_today?: number | null
          reset_at?: string | null
          task_date?: string | null
          total_actions?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      deteccao_movimento: {
        Row: {
          calorias_estimadas: number | null
          condicoes_clima: string | null
          confianca_deteccao: number | null
          dados_sensores: Json | null
          data_fim: string | null
          data_inicio: string | null
          data_registro: string | null
          distancia_percorrida: number | null
          duracao_movimento: number | null
          id: string
          local_destino: string | null
          local_inicio: string | null
          modo_transporte_detectado: string | null
          passos_estimados: number | null
          qualidade_gps: string | null
          rota_percorrida: Json | null
          tipo_movimento: string
          usuario_id: string | null
          velocidade_media: number | null
        }
        Insert: {
          calorias_estimadas?: number | null
          condicoes_clima?: string | null
          confianca_deteccao?: number | null
          dados_sensores?: Json | null
          data_fim?: string | null
          data_inicio?: string | null
          data_registro?: string | null
          distancia_percorrida?: number | null
          duracao_movimento?: number | null
          id?: string
          local_destino?: string | null
          local_inicio?: string | null
          modo_transporte_detectado?: string | null
          passos_estimados?: number | null
          qualidade_gps?: string | null
          rota_percorrida?: Json | null
          tipo_movimento: string
          usuario_id?: string | null
          velocidade_media?: number | null
        }
        Update: {
          calorias_estimadas?: number | null
          condicoes_clima?: string | null
          confianca_deteccao?: number | null
          dados_sensores?: Json | null
          data_fim?: string | null
          data_inicio?: string | null
          data_registro?: string | null
          distancia_percorrida?: number | null
          duracao_movimento?: number | null
          id?: string
          local_destino?: string | null
          local_inicio?: string | null
          modo_transporte_detectado?: string | null
          passos_estimados?: number | null
          qualidade_gps?: string | null
          rota_percorrida?: Json | null
          tipo_movimento?: string
          usuario_id?: string | null
          velocidade_media?: number | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string | null
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          status: string | null
          storage_path: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          status?: string | null
          storage_path: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          status?: string | null
          storage_path?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      email_events: {
        Row: {
          bounce_type: string | null
          click_url: string | null
          created_at: string | null
          error_message: string | null
          event_data: Json | null
          event_type: string
          from_email: string | null
          id: string
          recipient_email: string | null
          resend_email_id: string | null
          subject: string | null
        }
        Insert: {
          bounce_type?: string | null
          click_url?: string | null
          created_at?: string | null
          error_message?: string | null
          event_data?: Json | null
          event_type: string
          from_email?: string | null
          id?: string
          recipient_email?: string | null
          resend_email_id?: string | null
          subject?: string | null
        }
        Update: {
          bounce_type?: string | null
          click_url?: string | null
          created_at?: string | null
          error_message?: string | null
          event_data?: Json | null
          event_type?: string
          from_email?: string | null
          id?: string
          recipient_email?: string | null
          resend_email_id?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          body: string | null
          created_at: string | null
          error_message: string | null
          external_id: string | null
          id: string
          integration_id: string | null
          provider: string
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          integration_id?: string | null
          provider: string
          recipient_email: string
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          integration_id?: string | null
          provider?: string
          recipient_email?: string
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_analytics: {
        Row: {
          id: string
          nome_evento: string | null
          propriedades_evento: Json | null
          tempo_evento: string | null
          tipo_evento: string | null
          usuario_id: string | null
        }
        Insert: {
          id?: string
          nome_evento?: string | null
          propriedades_evento?: Json | null
          tempo_evento?: string | null
          tipo_evento?: string | null
          usuario_id?: string | null
        }
        Update: {
          id?: string
          nome_evento?: string | null
          propriedades_evento?: Json | null
          tempo_evento?: string | null
          tipo_evento?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      eventos_ao_vivo: {
        Row: {
          capacidade_maxima: number | null
          categoria_evento: string | null
          chat_ativado: boolean | null
          configuracoes_stream: Json | null
          criador_id: string | null
          curtidas_evento: number | null
          data_atualizacao: string | null
          data_criacao: string | null
          data_fim: string | null
          data_inicio: string | null
          descricao_evento: string | null
          duracao_prevista: number | null
          gravacao_ativada: boolean | null
          id: string
          imagem_capa: string | null
          moderadores_evento: string[] | null
          participantes_atuais: number | null
          preco_acesso: number | null
          status_evento: string | null
          tags_evento: string[] | null
          tipo_evento: string | null
          titulo_evento: string
          url_gravacao: string | null
          url_stream: string | null
          visualizacoes_totais: number | null
        }
        Insert: {
          capacidade_maxima?: number | null
          categoria_evento?: string | null
          chat_ativado?: boolean | null
          configuracoes_stream?: Json | null
          criador_id?: string | null
          curtidas_evento?: number | null
          data_atualizacao?: string | null
          data_criacao?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao_evento?: string | null
          duracao_prevista?: number | null
          gravacao_ativada?: boolean | null
          id?: string
          imagem_capa?: string | null
          moderadores_evento?: string[] | null
          participantes_atuais?: number | null
          preco_acesso?: number | null
          status_evento?: string | null
          tags_evento?: string[] | null
          tipo_evento?: string | null
          titulo_evento: string
          url_gravacao?: string | null
          url_stream?: string | null
          visualizacoes_totais?: number | null
        }
        Update: {
          capacidade_maxima?: number | null
          categoria_evento?: string | null
          chat_ativado?: boolean | null
          configuracoes_stream?: Json | null
          criador_id?: string | null
          curtidas_evento?: number | null
          data_atualizacao?: string | null
          data_criacao?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao_evento?: string | null
          duracao_prevista?: number | null
          gravacao_ativada?: boolean | null
          id?: string
          imagem_capa?: string | null
          moderadores_evento?: string[] | null
          participantes_atuais?: number | null
          preco_acesso?: number | null
          status_evento?: string | null
          tags_evento?: string[] | null
          tipo_evento?: string | null
          titulo_evento?: string
          url_gravacao?: string | null
          url_stream?: string | null
          visualizacoes_totais?: number | null
        }
        Relationships: []
      }
      feed_promotions: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          clicks_count: number | null
          created_at: string | null
          cta_link: string | null
          cta_mode: string
          cta_text: string | null
          daily_frequency: number | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          media_type: string
          media_url: string
          model_id: string | null
          popup_cta_link: string | null
          popup_cta_text: string | null
          popup_media_type: string | null
          popup_media_url: string | null
          position_interval: number | null
          priority: number | null
          schedule_date: string | null
          schedule_status: string | null
          shareable_link: string | null
          title: string
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          clicks_count?: number | null
          created_at?: string | null
          cta_link?: string | null
          cta_mode?: string
          cta_text?: string | null
          daily_frequency?: number | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          media_type?: string
          media_url: string
          model_id?: string | null
          popup_cta_link?: string | null
          popup_cta_text?: string | null
          popup_media_type?: string | null
          popup_media_url?: string | null
          position_interval?: number | null
          priority?: number | null
          schedule_date?: string | null
          schedule_status?: string | null
          shareable_link?: string | null
          title: string
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          clicks_count?: number | null
          created_at?: string | null
          cta_link?: string | null
          cta_mode?: string
          cta_text?: string | null
          daily_frequency?: number | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          media_type?: string
          media_url?: string
          model_id?: string | null
          popup_cta_link?: string | null
          popup_cta_text?: string | null
          popup_media_type?: string | null
          popup_media_url?: string | null
          position_interval?: number | null
          priority?: number | null
          schedule_date?: string | null
          schedule_status?: string | null
          shareable_link?: string | null
          title?: string
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: []
      }
      gamification_actions: {
        Row: {
          action_type: string
          created_at: string | null
          date_performed: string | null
          id: string
          ip_address: string | null
          model_id: string | null
          points_earned: number | null
          user_agent: string | null
          user_id: string
          video_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          date_performed?: string | null
          id?: string
          ip_address?: string | null
          model_id?: string | null
          points_earned?: number | null
          user_agent?: string | null
          user_id: string
          video_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          date_performed?: string | null
          id?: string
          ip_address?: string | null
          model_id?: string | null
          points_earned?: number | null
          user_agent?: string | null
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gamification_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gamification_users"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_daily_tasks: {
        Row: {
          completed_tasks: number | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          last_action_at: string | null
          points_earned_today: number | null
          reset_at: string | null
          task_date: string | null
          total_actions: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_tasks?: number | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          last_action_at?: string | null
          points_earned_today?: number | null
          reset_at?: string | null
          task_date?: string | null
          total_actions?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_tasks?: number | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          last_action_at?: string | null
          points_earned_today?: number | null
          reset_at?: string | null
          task_date?: string | null
          total_actions?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_daily_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gamification_users"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_rankings: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_activity_at: string | null
          level_name: string | null
          max_streak: number | null
          position: number | null
          total_points: number | null
          total_tasks_completed: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_at?: string | null
          level_name?: string | null
          max_streak?: number | null
          position?: number | null
          total_points?: number | null
          total_tasks_completed?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_at?: string | null
          level_name?: string | null
          max_streak?: number | null
          position?: number | null
          total_points?: number | null
          total_tasks_completed?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_rankings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "gamification_users"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_users: {
        Row: {
          created_at: string | null
          current_streak: number | null
          email: string
          id: string
          is_premium: boolean | null
          level_name: string | null
          max_streak: number | null
          name: string
          registered_from: string | null
          status: string | null
          total_points: number | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          email: string
          id?: string
          is_premium?: boolean | null
          level_name?: string | null
          max_streak?: number | null
          name: string
          registered_from?: string | null
          status?: string | null
          total_points?: number | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          email?: string
          id?: string
          is_premium?: boolean | null
          level_name?: string | null
          max_streak?: number | null
          name?: string
          registered_from?: string | null
          status?: string | null
          total_points?: number | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      hero_video: {
        Row: {
          id: string
          subtitle: string | null
          title: string | null
          updated_at: string | null
          video_url: string
        }
        Insert: {
          id?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
          video_url: string
        }
        Update: {
          id?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
          video_url?: string
        }
        Relationships: []
      }
      historico_localizacoes: {
        Row: {
          altitude: number | null
          atividade_detectada: string | null
          bateria_dispositivo: number | null
          cidade: string | null
          conectividade_qualidade: string | null
          contexto_uso: string | null
          data_registro: string | null
          distancia_anterior: number | null
          endereco_obtido: string | null
          estado: string | null
          id: string
          latitude: number | null
          longitude: number | null
          pais: string | null
          precisao: number | null
          sessao_id: string | null
          tempo_permanencia: number | null
          tipo_movimento: string | null
          usuario_id: string | null
          velocidade_detectada: number | null
        }
        Insert: {
          altitude?: number | null
          atividade_detectada?: string | null
          bateria_dispositivo?: number | null
          cidade?: string | null
          conectividade_qualidade?: string | null
          contexto_uso?: string | null
          data_registro?: string | null
          distancia_anterior?: number | null
          endereco_obtido?: string | null
          estado?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          pais?: string | null
          precisao?: number | null
          sessao_id?: string | null
          tempo_permanencia?: number | null
          tipo_movimento?: string | null
          usuario_id?: string | null
          velocidade_detectada?: number | null
        }
        Update: {
          altitude?: number | null
          atividade_detectada?: string | null
          bateria_dispositivo?: number | null
          cidade?: string | null
          conectividade_qualidade?: string | null
          contexto_uso?: string | null
          data_registro?: string | null
          distancia_anterior?: number | null
          endereco_obtido?: string | null
          estado?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          pais?: string | null
          precisao?: number | null
          sessao_id?: string | null
          tempo_permanencia?: number | null
          tipo_movimento?: string | null
          usuario_id?: string | null
          velocidade_detectada?: number | null
        }
        Relationships: []
      }
      historico_visualizacao: {
        Row: {
          id: string
          user_id: string
          video_id: string
          watch_duration_seconds: number | null
          watched_at: string
        }
        Insert: {
          id?: string
          user_id: string
          video_id: string
          watch_duration_seconds?: number | null
          watched_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          video_id?: string
          watch_duration_seconds?: number | null
          watched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_visualizacao_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          configuration: Json
          created_at: string | null
          id: string
          integration_type: string
          is_active: boolean | null
          last_used_at: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          configuration?: Json
          created_at?: string | null
          id?: string
          integration_type: string
          is_active?: boolean | null
          last_used_at?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          configuration?: Json
          created_at?: string | null
          id?: string
          integration_type?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      interesses_fortes: {
        Row: {
          created_at: string
          id: string
          interest_type: string
          modelo_id: string
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interest_type?: string
          modelo_id: string
          score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interest_type?: string
          modelo_id?: string
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          model_id: string | null
          user_agent: string | null
          user_id: string | null
          video_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          model_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          model_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "likes_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "popular_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      links_backup: {
        Row: {
          backed_up_at: string | null
          chat_message_id: string | null
          content_type: string | null
          created_at: string
          description: string | null
          error_message: string | null
          file_size: number | null
          id: string
          image_url: string | null
          metadata: Json | null
          mirrored_image_path: string | null
          mirrored_url: string | null
          original_url: string
          session_id: string | null
          status: string
          storage_path: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          backed_up_at?: string | null
          chat_message_id?: string | null
          content_type?: string | null
          created_at?: string
          description?: string | null
          error_message?: string | null
          file_size?: number | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          mirrored_image_path?: string | null
          mirrored_url?: string | null
          original_url: string
          session_id?: string | null
          status?: string
          storage_path?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          backed_up_at?: string | null
          chat_message_id?: string | null
          content_type?: string | null
          created_at?: string
          description?: string | null
          error_message?: string | null
          file_size?: number | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          mirrored_image_path?: string | null
          mirrored_url?: string | null
          original_url?: string
          session_id?: string | null
          status?: string
          storage_path?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      links_compartilhamento: {
        Row: {
          ativo: boolean | null
          codigo_unico: string
          compartilhamento_id: string | null
          contador_acessos: number | null
          data_criacao: string | null
          data_expiracao: string | null
          descricao_preview: string | null
          id: string
          imagem_preview: string | null
          limite_visualizacoes: number | null
          protegido_senha: boolean | null
          senha_acesso: string | null
          titulo_preview: string | null
          url_completa: string
          url_encurtada: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo_unico: string
          compartilhamento_id?: string | null
          contador_acessos?: number | null
          data_criacao?: string | null
          data_expiracao?: string | null
          descricao_preview?: string | null
          id?: string
          imagem_preview?: string | null
          limite_visualizacoes?: number | null
          protegido_senha?: boolean | null
          senha_acesso?: string | null
          titulo_preview?: string | null
          url_completa: string
          url_encurtada?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo_unico?: string
          compartilhamento_id?: string | null
          contador_acessos?: number | null
          data_criacao?: string | null
          data_expiracao?: string | null
          descricao_preview?: string | null
          id?: string
          imagem_preview?: string | null
          limite_visualizacoes?: number | null
          protegido_senha?: boolean | null
          senha_acesso?: string | null
          titulo_preview?: string | null
          url_completa?: string
          url_encurtada?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "links_compartilhamento_compartilhamento_id_fkey"
            columns: ["compartilhamento_id"]
            isOneToOne: false
            referencedRelation: "compartilhamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      locais_favoritos: {
        Row: {
          cor_marcador: string | null
          data_atualizacao: string | null
          data_criacao: string | null
          descricao: string | null
          endereco: string | null
          icone_local: string | null
          id: string
          latitude: number | null
          longitude: number | null
          nome_local: string
          notificar_chegada: boolean | null
          notificar_saida: boolean | null
          privado: boolean | null
          raio_deteccao: number | null
          tempo_permanencia_minimo: number | null
          tempo_total_permanencia: number | null
          tipo_local: string | null
          total_visitas: number | null
          ultima_visita: string | null
          usuario_id: string | null
          visitado_recentemente: boolean | null
        }
        Insert: {
          cor_marcador?: string | null
          data_atualizacao?: string | null
          data_criacao?: string | null
          descricao?: string | null
          endereco?: string | null
          icone_local?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome_local: string
          notificar_chegada?: boolean | null
          notificar_saida?: boolean | null
          privado?: boolean | null
          raio_deteccao?: number | null
          tempo_permanencia_minimo?: number | null
          tempo_total_permanencia?: number | null
          tipo_local?: string | null
          total_visitas?: number | null
          ultima_visita?: string | null
          usuario_id?: string | null
          visitado_recentemente?: boolean | null
        }
        Update: {
          cor_marcador?: string | null
          data_atualizacao?: string | null
          data_criacao?: string | null
          descricao?: string | null
          endereco?: string | null
          icone_local?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome_local?: string
          notificar_chegada?: boolean | null
          notificar_saida?: boolean | null
          privado?: boolean | null
          raio_deteccao?: number | null
          tempo_permanencia_minimo?: number | null
          tempo_total_permanencia?: number | null
          tipo_local?: string | null
          total_visitas?: number | null
          ultima_visita?: string | null
          usuario_id?: string | null
          visitado_recentemente?: boolean | null
        }
        Relationships: []
      }
      local_businesses: {
        Row: {
          address: string
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          google_maps_url: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_sponsored: boolean
          latitude: number
          longitude: number
          name: string
          phone: string | null
          rating: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address: string
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          google_maps_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_sponsored?: boolean
          latitude: number
          longitude: number
          name: string
          phone?: string | null
          rating?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          google_maps_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_sponsored?: boolean
          latitude?: number
          longitude?: number
          name?: string
          phone?: string | null
          rating?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      loja_product_videos: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          product_id: number
          sort_order: number | null
          title: string | null
          updated_at: string | null
          video_url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          product_id: number
          sort_order?: number | null
          title?: string | null
          updated_at?: string | null
          video_url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          product_id?: number
          sort_order?: number | null
          title?: string | null
          updated_at?: string | null
          video_url?: string
        }
        Relationships: []
      }
      loja_products: {
        Row: {
          cover_url: string | null
          created_at: string
          id: number
          is_active: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          id?: number
          is_active?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          id?: number
          is_active?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      magazine_saved_links: {
        Row: {
          created_at: string
          id: string
          magazine_id: string
          public_url: string
          remix_url: string
          short_code: string
          thumbnail_url: string | null
          title: string
          total_pages: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          magazine_id: string
          public_url: string
          remix_url: string
          short_code: string
          thumbnail_url?: string | null
          title: string
          total_pages?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          magazine_id?: string
          public_url?: string
          remix_url?: string
          short_code?: string
          thumbnail_url?: string | null
          title?: string
          total_pages?: number
          updated_at?: string
        }
        Relationships: []
      }
      magazines: {
        Row: {
          access_password: string | null
          accessPassword: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          display_order: number
          google_analytics_id: string | null
          id: string
          image_url: string
          is_active: boolean
          link: string
          pages_data: Json
          password_protected: boolean
          passwordProtected: boolean
          public_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          access_password?: string | null
          accessPassword?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number
          google_analytics_id?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          link: string
          pages_data?: Json
          password_protected?: boolean
          passwordProtected?: boolean
          public_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          access_password?: string | null
          accessPassword?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number
          google_analytics_id?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          link?: string
          pages_data?: Json
          password_protected?: boolean
          passwordProtected?: boolean
          public_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      marketplace_categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number | null
        }
        Relationships: []
      }
      marketplace_feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      marketplace_orders: {
        Row: {
          created_at: string | null
          id: string
          payment_id: string | null
          product_id: string | null
          quantity: number
          shipping_address: Json | null
          status: string
          total_price: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          payment_id?: string | null
          product_id?: string | null
          quantity?: number
          shipping_address?: Json | null
          status?: string
          total_price: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          payment_id?: string | null
          product_id?: string | null
          quantity?: number
          shipping_address?: Json | null
          status?: string
          total_price?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_products: {
        Row: {
          average_rating: number | null
          category: string
          created_at: string | null
          description: string | null
          hoopay_sales_url: string | null
          id: string
          image_url: string
          is_active: boolean | null
          name: string
          price: number
          stock: number
          store_id: string | null
          total_reviews: number | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          average_rating?: number | null
          category?: string
          created_at?: string | null
          description?: string | null
          hoopay_sales_url?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          name: string
          price: number
          stock?: number
          store_id?: string | null
          total_reviews?: number | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          average_rating?: number | null
          category?: string
          created_at?: string | null
          description?: string | null
          hoopay_sales_url?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          name?: string
          price?: number
          stock?: number
          store_id?: string | null
          total_reviews?: number | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "marketplace_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          order_id: string | null
          product_id: string | null
          rating: number
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          rating: number
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          rating?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_stores: {
        Row: {
          banner_url: string | null
          commission_rate: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_verified: boolean
          logo_url: string | null
          name: string
          owner_id: string
          slug: string
          total_revenue: number
          total_sales: number
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          commission_rate?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          logo_url?: string | null
          name: string
          owner_id: string
          slug: string
          total_revenue?: number
          total_sales?: number
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          commission_rate?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string
          slug?: string
          total_revenue?: number
          total_sales?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_stores_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mirrored_files: {
        Row: {
          chat_message_id: string | null
          checksum: string | null
          content_type: string | null
          created_at: string
          download_status: string
          error_message: string | null
          file_name: string
          file_size: number | null
          id: string
          link_backup_id: string | null
          metadata: Json | null
          original_url: string
          storage_bucket: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          chat_message_id?: string | null
          checksum?: string | null
          content_type?: string | null
          created_at?: string
          download_status?: string
          error_message?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          link_backup_id?: string | null
          metadata?: Json | null
          original_url: string
          storage_bucket?: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          chat_message_id?: string | null
          checksum?: string | null
          content_type?: string | null
          created_at?: string
          download_status?: string
          error_message?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          link_backup_id?: string | null
          metadata?: Json | null
          original_url?: string
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      missoes_desafios: {
        Row: {
          ativa: boolean | null
          categoria_missao: string | null
          data_criacao: string | null
          data_fim: string | null
          data_inicio: string | null
          descricao_missao: string | null
          dificuldade: string | null
          id: string
          limite_participantes: number | null
          objetivos: Json | null
          participantes_atual: number | null
          progresso_necessario: number | null
          recompensas: Json | null
          repetivel: boolean | null
          tipo_missao: string | null
          titulo_missao: string
        }
        Insert: {
          ativa?: boolean | null
          categoria_missao?: string | null
          data_criacao?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao_missao?: string | null
          dificuldade?: string | null
          id?: string
          limite_participantes?: number | null
          objetivos?: Json | null
          participantes_atual?: number | null
          progresso_necessario?: number | null
          recompensas?: Json | null
          repetivel?: boolean | null
          tipo_missao?: string | null
          titulo_missao: string
        }
        Update: {
          ativa?: boolean | null
          categoria_missao?: string | null
          data_criacao?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao_missao?: string | null
          dificuldade?: string | null
          id?: string
          limite_participantes?: number | null
          objetivos?: Json | null
          participantes_atual?: number | null
          progresso_necessario?: number | null
          recompensas?: Json | null
          repetivel?: boolean | null
          tipo_missao?: string | null
          titulo_missao?: string
        }
        Relationships: []
      }
      model_chat_panels: {
        Row: {
          ai_provider: string | null
          api_key_encrypted: string | null
          audio_url: string | null
          can_read_images: boolean | null
          can_send_audio: boolean | null
          can_send_images: boolean | null
          can_send_links: boolean | null
          created_at: string | null
          creator_id: string | null
          custom_link: string | null
          greeting_description: string | null
          greeting_image_url: string | null
          greeting_link: string | null
          greeting_message: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_online: boolean | null
          message_delay_seconds: number | null
          model_id: string | null
          prompt: string | null
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          ai_provider?: string | null
          api_key_encrypted?: string | null
          audio_url?: string | null
          can_read_images?: boolean | null
          can_send_audio?: boolean | null
          can_send_images?: boolean | null
          can_send_links?: boolean | null
          created_at?: string | null
          creator_id?: string | null
          custom_link?: string | null
          greeting_description?: string | null
          greeting_image_url?: string | null
          greeting_link?: string | null
          greeting_message?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_online?: boolean | null
          message_delay_seconds?: number | null
          model_id?: string | null
          prompt?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          ai_provider?: string | null
          api_key_encrypted?: string | null
          audio_url?: string | null
          can_read_images?: boolean | null
          can_send_audio?: boolean | null
          can_send_images?: boolean | null
          can_send_links?: boolean | null
          created_at?: string | null
          creator_id?: string | null
          custom_link?: string | null
          greeting_description?: string | null
          greeting_image_url?: string | null
          greeting_link?: string | null
          greeting_message?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_online?: boolean | null
          message_delay_seconds?: number | null
          model_id?: string | null
          prompt?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_chat_panels_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_chat_panels_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "popular_models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_followers: {
        Row: {
          followed_at: string
          id: string
          is_active: boolean
          model_id: string
          user_email: string
          user_id: string
          user_name: string
        }
        Insert: {
          followed_at?: string
          id?: string
          is_active?: boolean
          model_id: string
          user_email: string
          user_id: string
          user_name: string
        }
        Update: {
          followed_at?: string
          id?: string
          is_active?: boolean
          model_id?: string
          user_email?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_followers_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_followers_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "popular_models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          model_id: string
          model_username: string
          user_id: string | null
          viewer_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          model_id: string
          model_username: string
          user_id?: string | null
          viewer_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          model_id?: string
          model_username?: string
          user_id?: string | null
          viewer_name?: string | null
        }
        Relationships: []
      }
      model_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          is_active: boolean | null
          last_activity: string | null
          model_id: string
          session_token: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          is_active?: boolean | null
          last_activity?: string | null
          model_id: string
          session_token: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          last_activity?: string | null
          model_id?: string
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_sessions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_sessions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "popular_models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_subscription_plans: {
        Row: {
          benefits: string[] | null
          created_at: string | null
          discount_label: string | null
          id: string
          is_active: boolean | null
          model_id: string
          model_type: string
          payment_url: string | null
          plan_type: string
          price: number
          updated_at: string | null
        }
        Insert: {
          benefits?: string[] | null
          created_at?: string | null
          discount_label?: string | null
          id?: string
          is_active?: boolean | null
          model_id: string
          model_type?: string
          payment_url?: string | null
          plan_type: string
          price: number
          updated_at?: string | null
        }
        Update: {
          benefits?: string[] | null
          created_at?: string | null
          discount_label?: string | null
          id?: string
          is_active?: boolean | null
          model_id?: string
          model_type?: string
          payment_url?: string | null
          plan_type?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      model_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          model_id: string
          model_type: string
          payment_id: string | null
          price_paid: number | null
          subscriber_email: string
          subscriber_id: string | null
          subscriber_phone: string | null
          subscription_end: string
          subscription_start: string | null
          subscription_status: string
          subscription_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          model_id: string
          model_type?: string
          payment_id?: string | null
          price_paid?: number | null
          subscriber_email: string
          subscriber_id?: string | null
          subscriber_phone?: string | null
          subscription_end: string
          subscription_start?: string | null
          subscription_status?: string
          subscription_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          model_id?: string
          model_type?: string
          payment_id?: string | null
          price_paid?: number | null
          subscriber_email?: string
          subscriber_id?: string | null
          subscriber_phone?: string | null
          subscription_end?: string
          subscription_start?: string | null
          subscription_status?: string
          subscription_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      models: {
        Row: {
          access_code: string | null
          avatar_url: string | null
          bio: string | null
          category: string
          created_at: string | null
          custom_link: string | null
          display_order: number
          followers_count: number
          hide_subscription_button: boolean | null
          id: string
          is_active: boolean
          is_live: boolean
          is_premium: boolean
          is_promo_creator: boolean | null
          is_verified: boolean
          likes_count: number
          name: string
          onlyfans_link: string | null
          posting_panel_url: string | null
          profile_link: string | null
          social_links: Json | null
          tags: string[] | null
          total_comments: number
          total_likes: number
          total_shares: number
          total_views: number
          updated_at: string | null
          username: string
          videos_count: number
          whatsapp: string | null
        }
        Insert: {
          access_code?: string | null
          avatar_url?: string | null
          bio?: string | null
          category?: string
          created_at?: string | null
          custom_link?: string | null
          display_order?: number
          followers_count?: number
          hide_subscription_button?: boolean | null
          id?: string
          is_active?: boolean
          is_live?: boolean
          is_premium?: boolean
          is_promo_creator?: boolean | null
          is_verified?: boolean
          likes_count?: number
          name: string
          onlyfans_link?: string | null
          posting_panel_url?: string | null
          profile_link?: string | null
          social_links?: Json | null
          tags?: string[] | null
          total_comments?: number
          total_likes?: number
          total_shares?: number
          total_views?: number
          updated_at?: string | null
          username: string
          videos_count?: number
          whatsapp?: string | null
        }
        Update: {
          access_code?: string | null
          avatar_url?: string | null
          bio?: string | null
          category?: string
          created_at?: string | null
          custom_link?: string | null
          display_order?: number
          followers_count?: number
          hide_subscription_button?: boolean | null
          id?: string
          is_active?: boolean
          is_live?: boolean
          is_premium?: boolean
          is_promo_creator?: boolean | null
          is_verified?: boolean
          likes_count?: number
          name?: string
          onlyfans_link?: string | null
          posting_panel_url?: string | null
          profile_link?: string | null
          social_links?: Json | null
          tags?: string[] | null
          total_comments?: number
          total_likes?: number
          total_shares?: number
          total_views?: number
          updated_at?: string | null
          username?: string
          videos_count?: number
          whatsapp?: string | null
        }
        Relationships: []
      }
      monthly_revenue: {
        Row: {
          created_at: string | null
          id: string
          month_year: string
          page_id: string | null
          real_revenue: number | null
          total_revenue: number | null
          total_sales_count: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          month_year: string
          page_id?: string | null
          real_revenue?: number | null
          total_revenue?: number | null
          total_sales_count?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          month_year?: string
          page_id?: string | null
          real_revenue?: number | null
          total_revenue?: number | null
          total_sales_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_revenue_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "admin_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes_localizacao: {
        Row: {
          ativa: boolean | null
          condicoes_trigger: Json | null
          conteudo_notificacao: string | null
          data_criacao: string | null
          data_expiracao: string | null
          id: string
          latitude_trigger: number | null
          limite_vezes: number | null
          local_referencia: string | null
          longitude_trigger: number | null
          prioridade: string | null
          raio_trigger: number | null
          repetir: boolean | null
          sons_ativados: boolean | null
          tipo_notificacao: string | null
          titulo_notificacao: string
          ultima_ativacao: string | null
          usuario_id: string | null
          vezes_disparada: number | null
          vibracao_ativada: boolean | null
        }
        Insert: {
          ativa?: boolean | null
          condicoes_trigger?: Json | null
          conteudo_notificacao?: string | null
          data_criacao?: string | null
          data_expiracao?: string | null
          id?: string
          latitude_trigger?: number | null
          limite_vezes?: number | null
          local_referencia?: string | null
          longitude_trigger?: number | null
          prioridade?: string | null
          raio_trigger?: number | null
          repetir?: boolean | null
          sons_ativados?: boolean | null
          tipo_notificacao?: string | null
          titulo_notificacao: string
          ultima_ativacao?: string | null
          usuario_id?: string | null
          vezes_disparada?: number | null
          vibracao_ativada?: boolean | null
        }
        Update: {
          ativa?: boolean | null
          condicoes_trigger?: Json | null
          conteudo_notificacao?: string | null
          data_criacao?: string | null
          data_expiracao?: string | null
          id?: string
          latitude_trigger?: number | null
          limite_vezes?: number | null
          local_referencia?: string | null
          longitude_trigger?: number | null
          prioridade?: string | null
          raio_trigger?: number | null
          repetir?: boolean | null
          sons_ativados?: boolean | null
          tipo_notificacao?: string | null
          titulo_notificacao?: string
          ultima_ativacao?: string | null
          usuario_id?: string | null
          vezes_disparada?: number | null
          vibracao_ativada?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          bonus_info: Json | null
          created_at: string | null
          email_sent_at: string | null
          id: string
          is_read: boolean | null
          is_sent: boolean | null
          message: string
          model_id: string | null
          points_awarded: number | null
          push_sent_at: string | null
          read_at: string | null
          scheduled_for: string | null
          send_email: boolean | null
          send_push: boolean | null
          send_sms: boolean | null
          sent_at: string | null
          sms_sent_at: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string | null
          video_id: string | null
        }
        Insert: {
          bonus_info?: Json | null
          created_at?: string | null
          email_sent_at?: string | null
          id?: string
          is_read?: boolean | null
          is_sent?: boolean | null
          message: string
          model_id?: string | null
          points_awarded?: number | null
          push_sent_at?: string | null
          read_at?: string | null
          scheduled_for?: string | null
          send_email?: boolean | null
          send_push?: boolean | null
          send_sms?: boolean | null
          sent_at?: string | null
          sms_sent_at?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Update: {
          bonus_info?: Json | null
          created_at?: string | null
          email_sent_at?: string | null
          id?: string
          is_read?: boolean | null
          is_sent?: boolean | null
          message?: string
          model_id?: string | null
          points_awarded?: number | null
          push_sent_at?: string | null
          read_at?: string | null
          scheduled_for?: string | null
          send_email?: boolean | null
          send_push?: boolean | null
          send_sms?: boolean | null
          sent_at?: string | null
          sms_sent_at?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "popular_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "top_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_clicks: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          model_id: string | null
          offer_id: string
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          video_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          model_id?: string | null
          offer_id: string
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          model_id?: string | null
          offer_id?: string
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_clicks_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          ad_text: string | null
          ad_text_link: string | null
          button_color: string | null
          button_effect: string
          button_link: string
          button_text: string
          created_at: string
          description: string | null
          duration_seconds: number
          end_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          model_id: string
          show_times: number
          start_at: string | null
          title: string
          updated_at: string
          video_id: string | null
        }
        Insert: {
          ad_text?: string | null
          ad_text_link?: string | null
          button_color?: string | null
          button_effect?: string
          button_link: string
          button_text: string
          created_at?: string
          description?: string | null
          duration_seconds?: number
          end_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          model_id: string
          show_times?: number
          start_at?: string | null
          title: string
          updated_at?: string
          video_id?: string | null
        }
        Update: {
          ad_text?: string | null
          ad_text_link?: string | null
          button_color?: string | null
          button_effect?: string
          button_link?: string
          button_text?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number
          end_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          model_id?: string
          show_times?: number
          start_at?: string | null
          title?: string
          updated_at?: string
          video_id?: string | null
        }
        Relationships: []
      }
      online_users: {
        Row: {
          created_at: string | null
          current_page: string | null
          current_video_id: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          is_online: boolean | null
          last_seen_at: string | null
          linktree_profile_id: string | null
          location_address: string | null
          location_city: string | null
          location_country: string | null
          location_neighborhood: string | null
          location_state: string | null
          session_id: string | null
          socket_id: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_page?: string | null
          current_video_id?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_online?: boolean | null
          last_seen_at?: string | null
          linktree_profile_id?: string | null
          location_address?: string | null
          location_city?: string | null
          location_country?: string | null
          location_neighborhood?: string | null
          location_state?: string | null
          session_id?: string | null
          socket_id?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_page?: string | null
          current_video_id?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_online?: boolean | null
          last_seen_at?: string | null
          linktree_profile_id?: string | null
          location_address?: string | null
          location_city?: string | null
          location_country?: string | null
          location_neighborhood?: string | null
          location_state?: string | null
          session_id?: string | null
          socket_id?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "online_users_current_video_id_fkey"
            columns: ["current_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      onlyfans_content: {
        Row: {
          ad_text: string | null
          avatar_url: string | null
          button_color: string | null
          button_link: string | null
          button_text: string | null
          created_at: string | null
          display_name: string
          effect: string | null
          end_date: string | null
          id: string
          link_text: string | null
          model_id: string | null
          name: string
          offer_description: string | null
          offer_image_url: string | null
          offer_title: string | null
          seconds: number | null
          start_date: string | null
          times: number | null
          unique_id: string
          updated_at: string | null
          user_id: string | null
          video_url: string
        }
        Insert: {
          ad_text?: string | null
          avatar_url?: string | null
          button_color?: string | null
          button_link?: string | null
          button_text?: string | null
          created_at?: string | null
          display_name: string
          effect?: string | null
          end_date?: string | null
          id?: string
          link_text?: string | null
          model_id?: string | null
          name: string
          offer_description?: string | null
          offer_image_url?: string | null
          offer_title?: string | null
          seconds?: number | null
          start_date?: string | null
          times?: number | null
          unique_id: string
          updated_at?: string | null
          user_id?: string | null
          video_url: string
        }
        Update: {
          ad_text?: string | null
          avatar_url?: string | null
          button_color?: string | null
          button_link?: string | null
          button_text?: string | null
          created_at?: string | null
          display_name?: string
          effect?: string | null
          end_date?: string | null
          id?: string
          link_text?: string | null
          model_id?: string | null
          name?: string
          offer_description?: string | null
          offer_image_url?: string | null
          offer_title?: string | null
          seconds?: number | null
          start_date?: string | null
          times?: number | null
          unique_id?: string
          updated_at?: string | null
          user_id?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "onlyfans_content_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onlyfans_content_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "popular_models"
            referencedColumns: ["id"]
          },
        ]
      }
      page_configs: {
        Row: {
          avatar_url: string | null
          color_palette: Json | null
          content_config: Json | null
          created_at: string | null
          display_name: string
          handle: string
          hero_bg_url: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          is_active: boolean | null
          media_urls: Json | null
          page_name: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          avatar_url?: string | null
          color_palette?: Json | null
          content_config?: Json | null
          created_at?: string | null
          display_name: string
          handle: string
          hero_bg_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          is_active?: boolean | null
          media_urls?: Json | null
          page_name: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          avatar_url?: string | null
          color_palette?: Json | null
          content_config?: Json | null
          created_at?: string | null
          display_name?: string
          handle?: string
          hero_bg_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          is_active?: boolean | null
          media_urls?: Json | null
          page_name?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      page_versions: {
        Row: {
          changes_summary: string | null
          config_snapshot: Json
          created_at: string | null
          id: string
          page_config_id: string | null
          version_number: number
        }
        Insert: {
          changes_summary?: string | null
          config_snapshot: Json
          created_at?: string | null
          id?: string
          page_config_id?: string | null
          version_number: number
        }
        Update: {
          changes_summary?: string | null
          config_snapshot?: Json
          created_at?: string | null
          id?: string
          page_config_id?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "page_versions_page_config_id_fkey"
            columns: ["page_config_id"]
            isOneToOne: false
            referencedRelation: "page_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      paginas_aplicativo: {
        Row: {
          ativa: boolean | null
          cor_tema: string | null
          data_atualizacao: string | null
          data_criacao: string | null
          descricao: string | null
          icone_pagina: string | null
          id: string
          nivel_acesso: string | null
          nome_pagina: string | null
          posicao_menu: number | null
          requer_login: boolean | null
          tipo_pagina: string | null
          titulo_pagina: string | null
          url_pagina: string | null
        }
        Insert: {
          ativa?: boolean | null
          cor_tema?: string | null
          data_atualizacao?: string | null
          data_criacao?: string | null
          descricao?: string | null
          icone_pagina?: string | null
          id?: string
          nivel_acesso?: string | null
          nome_pagina?: string | null
          posicao_menu?: number | null
          requer_login?: boolean | null
          tipo_pagina?: string | null
          titulo_pagina?: string | null
          url_pagina?: string | null
        }
        Update: {
          ativa?: boolean | null
          cor_tema?: string | null
          data_atualizacao?: string | null
          data_criacao?: string | null
          descricao?: string | null
          icone_pagina?: string | null
          id?: string
          nivel_acesso?: string | null
          nome_pagina?: string | null
          posicao_menu?: number | null
          requer_login?: boolean | null
          tipo_pagina?: string | null
          titulo_pagina?: string | null
          url_pagina?: string | null
        }
        Relationships: []
      }
      participantes_evento: {
        Row: {
          banido: boolean | null
          data_entrada: string | null
          data_saida: string | null
          evento_id: string | null
          id: string
          interacoes_realizadas: number | null
          permissoes_especiais: Json | null
          presente: boolean | null
          tempo_assistido: number | null
          tipo_participacao: string | null
          usuario_id: string | null
        }
        Insert: {
          banido?: boolean | null
          data_entrada?: string | null
          data_saida?: string | null
          evento_id?: string | null
          id?: string
          interacoes_realizadas?: number | null
          permissoes_especiais?: Json | null
          presente?: boolean | null
          tempo_assistido?: number | null
          tipo_participacao?: string | null
          usuario_id?: string | null
        }
        Update: {
          banido?: boolean | null
          data_entrada?: string | null
          data_saida?: string | null
          evento_id?: string | null
          id?: string
          interacoes_realizadas?: number | null
          permissoes_especiais?: Json | null
          presente?: boolean | null
          tempo_assistido?: number | null
          tipo_participacao?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participantes_evento_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_ao_vivo"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_config: {
        Row: {
          api_url: string | null
          config: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          provider: string
          updated_at: string | null
        }
        Insert: {
          api_url?: string | null
          config: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider: string
          updated_at?: string | null
        }
        Update: {
          api_url?: string | null
          config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          customer_email: string | null
          customer_name: string | null
          event_type: string
          external_id: string
          id: string
          processed_at: string | null
          provider: string
          raw_payload: Json
          status: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          event_type: string
          external_id: string
          id?: string
          processed_at?: string | null
          provider: string
          raw_payload: Json
          status: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          event_type?: string
          external_id?: string
          id?: string
          processed_at?: string | null
          provider?: string
          raw_payload?: Json
          status?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          asaas_subscription_id: string | null
          checkout_url: string | null
          commission_percentage: number | null
          confirmed_at: string | null
          created_at: string
          creator_amount: number | null
          creator_net_amount: number | null
          creator_producer_id: string | null
          id: string
          neonpay_fee: number | null
          plan_type: string
          platform_amount: number | null
          private_model_id: string | null
          private_model_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          asaas_subscription_id?: string | null
          checkout_url?: string | null
          commission_percentage?: number | null
          confirmed_at?: string | null
          created_at?: string
          creator_amount?: number | null
          creator_net_amount?: number | null
          creator_producer_id?: string | null
          id?: string
          neonpay_fee?: number | null
          plan_type?: string
          platform_amount?: number | null
          private_model_id?: string | null
          private_model_type?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          asaas_subscription_id?: string | null
          checkout_url?: string | null
          commission_percentage?: number | null
          confirmed_at?: string | null
          created_at?: string
          creator_amount?: number | null
          creator_net_amount?: number | null
          creator_producer_id?: string | null
          id?: string
          neonpay_fee?: number | null
          plan_type?: string
          platform_amount?: number | null
          private_model_id?: string | null
          private_model_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          asaas_payment_id: string | null
          asaas_subscription_id: string | null
          created_at: string | null
          id: string
          paid_at: string | null
          plan: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          asaas_payment_id?: string | null
          asaas_subscription_id?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          plan?: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          asaas_payment_id?: string | null
          asaas_subscription_id?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          plan?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      perfil_preferencias: {
        Row: {
          created_at: string
          id: string
          interactions_count: number
          score: number
          tag: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interactions_count?: number
          score?: number
          tag: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interactions_count?: number
          score?: number
          tag?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      physical_products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_urls: string[]
          is_active: boolean
          name: string
          order_index: number
          price: number | null
          purchase_url: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[]
          is_active?: boolean
          name: string
          order_index?: number
          price?: number | null
          purchase_url?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[]
          is_active?: boolean
          name?: string
          order_index?: number
          price?: number | null
          purchase_url?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      pix_payments: {
        Row: {
          amount: number
          created_at: string
          email: string
          expires_at: string
          hoopay_charge_uuid: string | null
          hoopay_order_uuid: string | null
          id: string
          name: string
          paid_at: string | null
          payment_method: string | null
          pix_code: string
          plan_days: number | null
          plan_id: string | null
          plan_type: string | null
          qr_code: string | null
          qr_code_base64: string | null
          status: string
          txid: string
          updated_at: string
          user_id: string | null
          whatsapp: string
        }
        Insert: {
          amount?: number
          created_at?: string
          email: string
          expires_at?: string
          hoopay_charge_uuid?: string | null
          hoopay_order_uuid?: string | null
          id?: string
          name: string
          paid_at?: string | null
          payment_method?: string | null
          pix_code: string
          plan_days?: number | null
          plan_id?: string | null
          plan_type?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: string
          txid: string
          updated_at?: string
          user_id?: string | null
          whatsapp: string
        }
        Update: {
          amount?: number
          created_at?: string
          email?: string
          expires_at?: string
          hoopay_charge_uuid?: string | null
          hoopay_order_uuid?: string | null
          id?: string
          name?: string
          paid_at?: string | null
          payment_method?: string | null
          pix_code?: string
          plan_days?: number | null
          plan_id?: string | null
          plan_type?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: string
          txid?: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      pix_transactions: {
        Row: {
          created_at: string | null
          customer_country: string | null
          customer_cpf: string
          customer_email: string
          customer_name: string
          customer_phone: string
          id: string
          lxpay_response: Json | null
          paid_at: string | null
          pix_code: string | null
          pix_expiration: string | null
          pix_qr_code: string | null
          product_name: string
          product_value: number
          status: string | null
          transaction_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_country?: string | null
          customer_cpf: string
          customer_email: string
          customer_name: string
          customer_phone: string
          id?: string
          lxpay_response?: Json | null
          paid_at?: string | null
          pix_code?: string | null
          pix_expiration?: string | null
          pix_qr_code?: string | null
          product_name: string
          product_value: number
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_country?: string | null
          customer_cpf?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          lxpay_response?: Json | null
          paid_at?: string | null
          pix_code?: string | null
          pix_expiration?: string | null
          pix_qr_code?: string | null
          product_name?: string
          product_value?: number
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string | null
          description: string | null
          has_premium_features: boolean | null
          id: string
          is_active: boolean | null
          max_linktrees: number | null
          name: string
          price: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          has_premium_features?: boolean | null
          id?: string
          is_active?: boolean | null
          max_linktrees?: number | null
          name: string
          price?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          has_premium_features?: boolean | null
          id?: string
          is_active?: boolean | null
          max_linktrees?: number | null
          name?: string
          price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_connections: {
        Row: {
          access_token: string | null
          api_key: string | null
          api_secret: string | null
          configuration: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          monthly_revenue: number | null
          platform_name: string
          refresh_token: string | null
          status: string
          total_users: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          configuration?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          monthly_revenue?: number | null
          platform_name: string
          refresh_token?: string | null
          status?: string
          total_users?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          configuration?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          monthly_revenue?: number | null
          platform_name?: string
          refresh_token?: string | null
          status?: string
          total_users?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      platform_terms: {
        Row: {
          content: string
          created_at: string | null
          effective_date: string
          id: string
          is_active: boolean | null
          title: string
          version: string
        }
        Insert: {
          content: string
          created_at?: string | null
          effective_date: string
          id?: string
          is_active?: boolean | null
          title: string
          version: string
        }
        Update: {
          content?: string
          created_at?: string | null
          effective_date?: string
          id?: string
          is_active?: boolean | null
          title?: string
          version?: string
        }
        Relationships: []
      }
      points_history: {
        Row: {
          admin_user_id: string | null
          created_at: string | null
          daily_action_id: string | null
          description: string | null
          id: string
          ip_address: string | null
          model_id: string | null
          points_after: number
          points_before: number
          points_change: number
          reason: string
          user_id: string | null
          video_id: string | null
        }
        Insert: {
          admin_user_id?: string | null
          created_at?: string | null
          daily_action_id?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          model_id?: string | null
          points_after: number
          points_before: number
          points_change: number
          reason: string
          user_id?: string | null
          video_id?: string | null
        }
        Update: {
          admin_user_id?: string | null
          created_at?: string | null
          daily_action_id?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          model_id?: string | null
          points_after?: number
          points_before?: number
          points_change?: number
          reason?: string
          user_id?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "points_history_daily_action_id_fkey"
            columns: ["daily_action_id"]
            isOneToOne: false
            referencedRelation: "daily_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_history_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_history_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "popular_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "top_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_history_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number | null
          content: string
          created_at: string | null
          id: string
          is_locked: boolean | null
          likes_count: number | null
          media_type: string | null
          media_url: string | null
          shares_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          likes_count?: number | null
          media_type?: string | null
          media_url?: string | null
          shares_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          likes_count?: number | null
          media_type?: string | null
          media_url?: string | null
          shares_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      posts_agendados: {
        Row: {
          audio_url: string | null
          botoes: Json | null
          conteudo_url: string
          created_at: string
          data_agendamento: string
          data_publicacao: string | null
          descricao: string | null
          enviar_perfil_modelo: boolean
          enviar_tela_principal: boolean
          id: string
          imagens: string[] | null
          modelo_id: string
          modelo_username: string
          profile_link: string | null
          status: string
          tipo_conteudo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          botoes?: Json | null
          conteudo_url: string
          created_at?: string
          data_agendamento: string
          data_publicacao?: string | null
          descricao?: string | null
          enviar_perfil_modelo?: boolean
          enviar_tela_principal?: boolean
          id?: string
          imagens?: string[] | null
          modelo_id: string
          modelo_username: string
          profile_link?: string | null
          status?: string
          tipo_conteudo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          botoes?: Json | null
          conteudo_url?: string
          created_at?: string
          data_agendamento?: string
          data_publicacao?: string | null
          descricao?: string | null
          enviar_perfil_modelo?: boolean
          enviar_tela_principal?: boolean
          id?: string
          imagens?: string[] | null
          modelo_id?: string
          modelo_username?: string
          profile_link?: string | null
          status?: string
          tipo_conteudo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_agendados_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_agendados_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "popular_models"
            referencedColumns: ["id"]
          },
        ]
      }
      posts_principais: {
        Row: {
          botoes: Json | null
          conteudo_url: string
          created_at: string
          descricao: string | null
          id: string
          is_active: boolean
          modelo_id: string
          modelo_username: string
          post_agendado_id: string | null
          tipo_conteudo: string
          titulo: string
          updated_at: string
          video_id: string | null
        }
        Insert: {
          botoes?: Json | null
          conteudo_url: string
          created_at?: string
          descricao?: string | null
          id?: string
          is_active?: boolean
          modelo_id: string
          modelo_username: string
          post_agendado_id?: string | null
          tipo_conteudo?: string
          titulo: string
          updated_at?: string
          video_id?: string | null
        }
        Update: {
          botoes?: Json | null
          conteudo_url?: string
          created_at?: string
          descricao?: string | null
          id?: string
          is_active?: boolean
          modelo_id?: string
          modelo_username?: string
          post_agendado_id?: string | null
          tipo_conteudo?: string
          titulo?: string
          updated_at?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_principais_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_principais_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "popular_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_principais_post_agendado_id_fkey"
            columns: ["post_agendado_id"]
            isOneToOne: false
            referencedRelation: "posts_agendados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_principais_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      premios_usuarios: {
        Row: {
          contexto_origem: string | null
          data_expiracao: string | null
          data_obtencao: string | null
          evento_origem: string | null
          exibir_perfil: boolean | null
          id: string
          metadata_adicional: Json | null
          nivel_obtido: number | null
          notificado: boolean | null
          progresso_atual: number | null
          progresso_total: number | null
          tipo_premio_id: string | null
          usuario_id: string | null
        }
        Insert: {
          contexto_origem?: string | null
          data_expiracao?: string | null
          data_obtencao?: string | null
          evento_origem?: string | null
          exibir_perfil?: boolean | null
          id?: string
          metadata_adicional?: Json | null
          nivel_obtido?: number | null
          notificado?: boolean | null
          progresso_atual?: number | null
          progresso_total?: number | null
          tipo_premio_id?: string | null
          usuario_id?: string | null
        }
        Update: {
          contexto_origem?: string | null
          data_expiracao?: string | null
          data_obtencao?: string | null
          evento_origem?: string | null
          exibir_perfil?: boolean | null
          id?: string
          metadata_adicional?: Json | null
          nivel_obtido?: number | null
          notificado?: boolean | null
          progresso_atual?: number | null
          progresso_total?: number | null
          tipo_premio_id?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "premios_usuarios_tipo_premio_id_fkey"
            columns: ["tipo_premio_id"]
            isOneToOne: false
            referencedRelation: "tipos_premios"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_access: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: string | null
          model_id: string | null
          name: string
          phone: string
          updated_at: string
          user_agent: string | null
          user_id: string | null
          video_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          model_id?: string | null
          name: string
          phone: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          model_id?: string | null
          name?: string
          phone?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Relationships: []
      }
      premium_content: {
        Row: {
          access_level: string | null
          content_type: string
          content_url: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          model_id: string | null
          price: number
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          access_level?: string | null
          content_type?: string
          content_url: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          model_id?: string | null
          price?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          access_level?: string | null
          content_type?: string
          content_url?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          model_id?: string | null
          price?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "premium_content_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_content_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "popular_models"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_members: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          monthly_fee: number | null
          plan_type: string | null
          signup_date: string | null
          user_email: string
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          monthly_fee?: number | null
          plan_type?: string | null
          signup_date?: string | null
          user_email: string
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          monthly_fee?: number | null
          plan_type?: string | null
          signup_date?: string | null
          user_email?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      premium_users: {
        Row: {
          cpf: string | null
          created_at: string
          email: string
          id: string
          name: string
          payment_id: string | null
          plan_id: string | null
          subscription_end: string
          subscription_start: string
          subscription_status: string
          subscription_type: string
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          payment_id?: string | null
          plan_id?: string | null
          subscription_end?: string
          subscription_start?: string
          subscription_status?: string
          subscription_type?: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          payment_id?: string | null
          plan_id?: string | null
          subscription_end?: string
          subscription_start?: string
          subscription_status?: string
          subscription_type?: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "premium_users_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "pix_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          asaas_customer_id: string | null
          avatar_url: string | null
          bairro: string | null
          billing_name: string | null
          bio: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          first_name: string | null
          followers_count: number | null
          id: string
          is_referrer_only: boolean | null
          last_name: string | null
          live_active: boolean | null
          live_url: string | null
          name: string | null
          neonpay_producer_id: string | null
          numero: string | null
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          role: string | null
          updated_at: string | null
          username: string | null
          video_call_active: boolean | null
          video_call_url: string | null
        }
        Insert: {
          asaas_customer_id?: string | null
          avatar_url?: string | null
          bairro?: string | null
          billing_name?: string | null
          bio?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          first_name?: string | null
          followers_count?: number | null
          id: string
          is_referrer_only?: boolean | null
          last_name?: string | null
          live_active?: boolean | null
          live_url?: string | null
          name?: string | null
          neonpay_producer_id?: string | null
          numero?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
          video_call_active?: boolean | null
          video_call_url?: string | null
        }
        Update: {
          asaas_customer_id?: string | null
          avatar_url?: string | null
          bairro?: string | null
          billing_name?: string | null
          bio?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          first_name?: string | null
          followers_count?: number | null
          id?: string
          is_referrer_only?: boolean | null
          last_name?: string | null
          live_active?: boolean | null
          live_url?: string | null
          name?: string | null
          neonpay_producer_id?: string | null
          numero?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
          video_call_active?: boolean | null
          video_call_url?: string | null
        }
        Relationships: []
      }
      progresso_missoes: {
        Row: {
          completada: boolean | null
          data_completacao: string | null
          data_inicio: string | null
          id: string
          metadata_progresso: Json | null
          missao_id: string | null
          progresso_atual: number | null
          progresso_total: number | null
          recompensa_coletada: boolean | null
          tentativas_realizadas: number | null
          usuario_id: string | null
        }
        Insert: {
          completada?: boolean | null
          data_completacao?: string | null
          data_inicio?: string | null
          id?: string
          metadata_progresso?: Json | null
          missao_id?: string | null
          progresso_atual?: number | null
          progresso_total?: number | null
          recompensa_coletada?: boolean | null
          tentativas_realizadas?: number | null
          usuario_id?: string | null
        }
        Update: {
          completada?: boolean | null
          data_completacao?: string | null
          data_inicio?: string | null
          id?: string
          metadata_progresso?: Json | null
          missao_id?: string | null
          progresso_atual?: number | null
          progresso_total?: number | null
          recompensa_coletada?: boolean | null
          tentativas_realizadas?: number | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progresso_missoes_missao_id_fkey"
            columns: ["missao_id"]
            isOneToOne: false
            referencedRelation: "missoes_desafios"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_ads: {
        Row: {
          active: boolean
          created_at: string
          daily_end_time: string | null
          daily_start_time: string | null
          description: string
          end_date: string
          id: string
          model_avatar: string | null
          model_id: string
          model_name: string
          model_username: string
          shows_per_day: number | null
          start_date: string
          timer_minutes: number
          type: string
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          daily_end_time?: string | null
          daily_start_time?: string | null
          description: string
          end_date: string
          id?: string
          model_avatar?: string | null
          model_id: string
          model_name: string
          model_username: string
          shows_per_day?: number | null
          start_date: string
          timer_minutes: number
          type: string
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          daily_end_time?: string | null
          daily_start_time?: string | null
          description?: string
          end_date?: string
          id?: string
          model_avatar?: string | null
          model_id?: string
          model_name?: string
          model_username?: string
          shows_per_day?: number | null
          start_date?: string
          timer_minutes?: number
          type?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      promo_click_tracking: {
        Row: {
          button_type: string
          city: string | null
          created_at: string
          device_type: string | null
          id: string
          promo_id: string
          region: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          button_type: string
          city?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          promo_id: string
          region?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          button_type?: string
          city?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          promo_id?: string
          region?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number
          commission_percentage: number | null
          created_at: string
          id: string
          item_id: string
          item_type: string
          neonpay_fee: number | null
          payment_method: string | null
          platform_amount: number | null
          seller_amount: number | null
          seller_id: string | null
          seller_net: number | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          commission_percentage?: number | null
          created_at?: string
          id?: string
          item_id: string
          item_type?: string
          neonpay_fee?: number | null
          payment_method?: string | null
          platform_amount?: number | null
          seller_amount?: number | null
          seller_id?: string | null
          seller_net?: number | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          commission_percentage?: number | null
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          neonpay_fee?: number | null
          payment_method?: string | null
          platform_amount?: number | null
          seller_amount?: number | null
          seller_id?: string | null
          seller_net?: number | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ranking_usuarios: {
        Row: {
          categoria_ranking: string | null
          conquistas_total: number | null
          data_atualizacao: string | null
          data_ultima_atividade: string | null
          experiencia_atual: number | null
          experiencia_proximo_nivel: number | null
          id: string
          melhor_streak: number | null
          nivel_usuario: number | null
          periodo_referencia: string | null
          pontos_totais: number | null
          posicao_anterior: number | null
          posicao_atual: number | null
          streak_dias: number | null
          usuario_id: string | null
        }
        Insert: {
          categoria_ranking?: string | null
          conquistas_total?: number | null
          data_atualizacao?: string | null
          data_ultima_atividade?: string | null
          experiencia_atual?: number | null
          experiencia_proximo_nivel?: number | null
          id?: string
          melhor_streak?: number | null
          nivel_usuario?: number | null
          periodo_referencia?: string | null
          pontos_totais?: number | null
          posicao_anterior?: number | null
          posicao_atual?: number | null
          streak_dias?: number | null
          usuario_id?: string | null
        }
        Update: {
          categoria_ranking?: string | null
          conquistas_total?: number | null
          data_atualizacao?: string | null
          data_ultima_atividade?: string | null
          experiencia_atual?: number | null
          experiencia_proximo_nivel?: number | null
          id?: string
          melhor_streak?: number | null
          nivel_usuario?: number | null
          periodo_referencia?: string | null
          pontos_totais?: number | null
          posicao_anterior?: number | null
          posicao_atual?: number | null
          streak_dias?: number | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action_type: string
          count: number | null
          created_at: string | null
          id: string
          identifier: string
          window_start: string | null
        }
        Insert: {
          action_type: string
          count?: number | null
          created_at?: string | null
          id?: string
          identifier: string
          window_start?: string | null
        }
        Update: {
          action_type?: string
          count?: number | null
          created_at?: string | null
          id?: string
          identifier?: string
          window_start?: string | null
        }
        Relationships: []
      }
      reacoes_evento: {
        Row: {
          data_criacao: string | null
          evento_id: string | null
          id: string
          timestamp_video: number | null
          tipo_reacao: string
          usuario_id: string | null
        }
        Insert: {
          data_criacao?: string | null
          evento_id?: string | null
          id?: string
          timestamp_video?: number | null
          tipo_reacao: string
          usuario_id?: string | null
        }
        Update: {
          data_criacao?: string | null
          evento_id?: string | null
          id?: string
          timestamp_video?: number | null
          tipo_reacao?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reacoes_evento_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_ao_vivo"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_link_clicks: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          referral_code: string | null
          referrer_id: string | null
          source: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          referral_code?: string | null
          referrer_id?: string | null
          source?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          referral_code?: string | null
          referrer_id?: string | null
          source?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      referral_program_config: {
        Row: {
          bonus_percentage: number
          cocon_value_brl: number
          cocons_per_referral: number
          created_at: string
          id: string
          neon_official_link: string | null
          program_active: boolean
          singleton: boolean
          updated_at: string
        }
        Insert: {
          bonus_percentage?: number
          cocon_value_brl?: number
          cocons_per_referral?: number
          created_at?: string
          id?: string
          neon_official_link?: string | null
          program_active?: boolean
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          bonus_percentage?: number
          cocon_value_brl?: number
          cocons_per_referral?: number
          created_at?: string
          id?: string
          neon_official_link?: string | null
          program_active?: boolean
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          bonus_amount: number | null
          bonus_paid: boolean | null
          cancelled_at: string | null
          cocons_awarded: number | null
          completed_at: string | null
          created_at: string | null
          id: string
          referral_code: string | null
          referred_email: string | null
          referred_id: string | null
          referrer_id: string
          status: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          bonus_amount?: number | null
          bonus_paid?: boolean | null
          cancelled_at?: string | null
          cocons_awarded?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          referral_code?: string | null
          referred_email?: string | null
          referred_id?: string | null
          referrer_id: string
          status?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          bonus_amount?: number | null
          bonus_paid?: boolean | null
          cancelled_at?: string | null
          cocons_awarded?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          referral_code?: string | null
          referred_email?: string | null
          referred_id?: string | null
          referrer_id?: string
          status?: string | null
        }
        Relationships: []
      }
      referrer_payout_info: {
        Row: {
          bank_account: string | null
          bank_agency: string | null
          bank_name: string | null
          cpf: string | null
          created_at: string
          full_name: string | null
          id: string
          neon_id: string | null
          pix_key: string | null
          pix_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          neon_id?: string | null
          pix_key?: string | null
          pix_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          neon_id?: string | null
          pix_key?: string | null
          pix_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      registration_limits: {
        Row: {
          created_at: string | null
          id: string
          ip_address: unknown
          profile_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address: unknown
          profile_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: unknown
          profile_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      registrations: {
        Row: {
          created_at: string | null
          id: string
          ip_address: string | null
          location_city: string | null
          location_country: string | null
          location_state: string | null
          name: string
          whatsapp: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          location_city?: string | null
          location_country?: string | null
          location_state?: string | null
          name: string
          whatsapp: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          location_city?: string | null
          location_country?: string | null
          location_state?: string | null
          name?: string
          whatsapp?: string
        }
        Relationships: []
      }
      registrations_data: {
        Row: {
          address: string
          agreement: boolean
          cpf: string
          created_at: string | null
          email: string
          full_name: string
          id: string
          ip_address: unknown
          notes: string | null
          phone: string
          selfie_data_url: string | null
          signature_data_url: string
          user_agent: string | null
        }
        Insert: {
          address: string
          agreement?: boolean
          cpf: string
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          ip_address?: unknown
          notes?: string | null
          phone: string
          selfie_data_url?: string | null
          signature_data_url: string
          user_agent?: string | null
        }
        Update: {
          address?: string
          agreement?: boolean
          cpf?: string
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          ip_address?: unknown
          notes?: string | null
          phone?: string
          selfie_data_url?: string | null
          signature_data_url?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          id: string
          is_active: boolean | null
          model_id: string
          model_name: string
          product_name: string
          sale_date: string | null
          sale_value: number
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          is_active?: boolean | null
          model_id: string
          model_name: string
          product_name: string
          sale_date?: string | null
          sale_value: number
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          is_active?: boolean | null
          model_id?: string
          model_name?: string
          product_name?: string
          sale_date?: string | null
          sale_value?: number
        }
        Relationships: []
      }
      sales_records: {
        Row: {
          created_at: string | null
          customer_whatsapp: string
          external_transaction_id: string | null
          hoopay_response: Json | null
          id: string
          page_id: string | null
          payment_platform: string | null
          payment_status: string | null
          real_amount: number | null
          sale_amount: number
          sale_date: string | null
          updated_at: string | null
          webhook_sent: boolean | null
        }
        Insert: {
          created_at?: string | null
          customer_whatsapp: string
          external_transaction_id?: string | null
          hoopay_response?: Json | null
          id?: string
          page_id?: string | null
          payment_platform?: string | null
          payment_status?: string | null
          real_amount?: number | null
          sale_amount: number
          sale_date?: string | null
          updated_at?: string | null
          webhook_sent?: boolean | null
        }
        Update: {
          created_at?: string | null
          customer_whatsapp?: string
          external_transaction_id?: string | null
          hoopay_response?: Json | null
          id?: string
          page_id?: string | null
          payment_platform?: string | null
          payment_status?: string | null
          real_amount?: number | null
          sale_amount?: number
          sale_date?: string | null
          updated_at?: string | null
          webhook_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_records_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "admin_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          created_at: string | null
          event_description: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_description?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_description?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shares: {
        Row: {
          created_at: string
          id: string
          ip_address: unknown
          model_id: string | null
          platform: string
          shared_at: string
          updated_at: string
          user_agent: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: unknown
          model_id?: string | null
          platform?: string
          shared_at?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: unknown
          model_id?: string | null
          platform?: string
          shared_at?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shares_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shares_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "popular_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shares_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      simple_registrations: {
        Row: {
          amount: number
          created_at: string
          id: string
          model_id: string
          model_username: string
          page_id: string
          paid_at: string | null
          status: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          model_id: string
          model_username: string
          page_id: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          model_id?: string
          model_username?: string
          page_id?: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      sistema_pontos: {
        Row: {
          acao_realizada: string
          aprovado: boolean | null
          bonus_aplicado: number | null
          data_criacao: string | null
          descricao_acao: string | null
          id: string
          moderado: boolean | null
          multiplicador: number | null
          pontos_ganhos: number | null
          pontos_perdidos: number | null
          referencia_id: string | null
          tipo_referencia: string | null
          usuario_id: string | null
          validado_automaticamente: boolean | null
        }
        Insert: {
          acao_realizada: string
          aprovado?: boolean | null
          bonus_aplicado?: number | null
          data_criacao?: string | null
          descricao_acao?: string | null
          id?: string
          moderado?: boolean | null
          multiplicador?: number | null
          pontos_ganhos?: number | null
          pontos_perdidos?: number | null
          referencia_id?: string | null
          tipo_referencia?: string | null
          usuario_id?: string | null
          validado_automaticamente?: boolean | null
        }
        Update: {
          acao_realizada?: string
          aprovado?: boolean | null
          bonus_aplicado?: number | null
          data_criacao?: string | null
          descricao_acao?: string | null
          id?: string
          moderado?: boolean | null
          multiplicador?: number | null
          pontos_ganhos?: number | null
          pontos_perdidos?: number | null
          referencia_id?: string | null
          tipo_referencia?: string | null
          usuario_id?: string | null
          validado_automaticamente?: boolean | null
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          external_id: string | null
          id: string
          integration_id: string | null
          message: string
          provider: string
          recipient_phone: string
          sent_at: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          integration_id?: string | null
          message: string
          provider: string
          recipient_phone: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          integration_id?: string | null
          message?: string
          provider?: string
          recipient_phone?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      store_payouts: {
        Row: {
          created_at: string
          id: string
          order_reference: string | null
          paid_at: string | null
          platform_fee: number
          status: string
          store_amount: number
          store_id: string
          total_amount: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_reference?: string | null
          paid_at?: string | null
          platform_fee?: number
          status?: string
          store_amount?: number
          store_id: string
          total_amount?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_reference?: string | null
          paid_at?: string | null
          platform_fee?: number
          status?: string
          store_amount?: number
          store_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_payouts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "marketplace_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          previous_value: Json | null
          setting_key: string
          setting_type: string | null
          setting_value: Json | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          previous_value?: Json | null
          setting_key: string
          setting_type?: string | null
          setting_value?: Json | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          previous_value?: Json | null
          setting_key?: string
          setting_type?: string | null
          setting_value?: Json | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      system_status: {
        Row: {
          additional_info: Json | null
          created_at: string | null
          id: string
          last_check_at: string | null
          response_time: number | null
          service_name: string
          status: string
          updated_at: string | null
          uptime_percentage: number | null
        }
        Insert: {
          additional_info?: Json | null
          created_at?: string | null
          id?: string
          last_check_at?: string | null
          response_time?: number | null
          service_name: string
          status: string
          updated_at?: string | null
          uptime_percentage?: number | null
        }
        Update: {
          additional_info?: Json | null
          created_at?: string | null
          id?: string
          last_check_at?: string | null
          response_time?: number | null
          service_name?: string
          status?: string
          updated_at?: string | null
          uptime_percentage?: number | null
        }
        Relationships: []
      }
      tipos_premios: {
        Row: {
          ativo: boolean | null
          categoria_premio: string | null
          cor_premio: string | null
          criterios_obtencao: Json | null
          data_criacao: string | null
          data_fim_disponibilidade: string | null
          data_inicio_disponibilidade: string | null
          descricao_premio: string | null
          icone_premio: string | null
          id: string
          limitado: boolean | null
          nome_premio: string
          quantidade_disponivel: number | null
          raridade: string | null
          valor_monetario: number | null
          valor_pontos: number | null
        }
        Insert: {
          ativo?: boolean | null
          categoria_premio?: string | null
          cor_premio?: string | null
          criterios_obtencao?: Json | null
          data_criacao?: string | null
          data_fim_disponibilidade?: string | null
          data_inicio_disponibilidade?: string | null
          descricao_premio?: string | null
          icone_premio?: string | null
          id?: string
          limitado?: boolean | null
          nome_premio: string
          quantidade_disponivel?: number | null
          raridade?: string | null
          valor_monetario?: number | null
          valor_pontos?: number | null
        }
        Update: {
          ativo?: boolean | null
          categoria_premio?: string | null
          cor_premio?: string | null
          criterios_obtencao?: Json | null
          data_criacao?: string | null
          data_fim_disponibilidade?: string | null
          data_inicio_disponibilidade?: string | null
          descricao_premio?: string | null
          icone_premio?: string | null
          id?: string
          limitado?: boolean | null
          nome_premio?: string
          quantidade_disponivel?: number | null
          raridade?: string | null
          valor_monetario?: number | null
          valor_pontos?: number | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string
          external_transaction_id: string | null
          fees: number | null
          gateway_provider: string | null
          gateway_response: Json | null
          id: string
          metadata: Json | null
          model_id: string | null
          net_amount: number | null
          payment_method: string
          processed_at: string | null
          status: string
          transaction_type: string
          updated_at: string
          webhook_received_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name: string
          external_transaction_id?: string | null
          fees?: number | null
          gateway_provider?: string | null
          gateway_response?: Json | null
          id?: string
          metadata?: Json | null
          model_id?: string | null
          net_amount?: number | null
          payment_method: string
          processed_at?: string | null
          status?: string
          transaction_type: string
          updated_at?: string
          webhook_received_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string
          external_transaction_id?: string | null
          fees?: number | null
          gateway_provider?: string | null
          gateway_response?: Json | null
          id?: string
          metadata?: Json | null
          model_id?: string | null
          net_amount?: number | null
          payment_method?: string
          processed_at?: string | null
          status?: string
          transaction_type?: string
          updated_at?: string
          webhook_received_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "popular_models"
            referencedColumns: ["id"]
          },
        ]
      }
      user_actions: {
        Row: {
          action_type: string
          created_at: string | null
          date_performed: string | null
          id: string
          ip_address: unknown
          model_id: string | null
          points_earned: number | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          video_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          date_performed?: string | null
          id?: string
          ip_address?: unknown
          model_id?: string | null
          points_earned?: number | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          date_performed?: string | null
          id?: string
          ip_address?: unknown
          model_id?: string | null
          points_earned?: number | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_actions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_actions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "popular_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_actions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ad_history: {
        Row: {
          ad_id: string
          id: string
          user_id: string
          visualizado_em: string
        }
        Insert: {
          ad_id: string
          id?: string
          user_id: string
          visualizado_em?: string
        }
        Update: {
          ad_id?: string
          id?: string
          user_id?: string
          visualizado_em?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      user_feed_progress: {
        Row: {
          id: string
          last_seen_at: string
          last_seen_video_id: string | null
          model_id: string
          user_id: string
          videos_seen_count: number
        }
        Insert: {
          id?: string
          last_seen_at?: string
          last_seen_video_id?: string | null
          model_id: string
          user_id: string
          videos_seen_count?: number
        }
        Update: {
          id?: string
          last_seen_at?: string
          last_seen_video_id?: string | null
          model_id?: string
          user_id?: string
          videos_seen_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_feed_progress_last_seen_video_id_fkey"
            columns: ["last_seen_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feed_progress_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feed_progress_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "popular_models"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follow_models: {
        Row: {
          created_at: string
          id: string
          model_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          followed_at: string
          follower_email: string
          follower_id: string
          follower_name: string
          following_id: string
          id: string
          is_active: boolean
        }
        Insert: {
          followed_at?: string
          follower_email: string
          follower_id: string
          follower_name: string
          following_id: string
          id?: string
          is_active?: boolean
        }
        Update: {
          followed_at?: string
          follower_email?: string
          follower_id?: string
          follower_name?: string
          following_id?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      user_mission_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          date_started: string
          id: string
          is_completed: boolean
          mission_id: string
          points_earned: number | null
          progress_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          date_started?: string
          id?: string
          is_completed?: boolean
          mission_id: string
          points_earned?: number | null
          progress_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          date_started?: string
          id?: string
          is_completed?: boolean
          mission_id?: string
          points_earned?: number | null
          progress_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_mission_progress_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "daily_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          sent_at: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          sent_at?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          sent_at?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      user_rankings: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_activity_at: string | null
          level_name: string | null
          max_streak: number | null
          total_points: number | null
          total_tasks_completed: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_at?: string | null
          level_name?: string | null
          max_streak?: number | null
          total_points?: number | null
          total_tasks_completed?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_at?: string | null
          level_name?: string | null
          max_streak?: number | null
          total_points?: number | null
          total_tasks_completed?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          browser_info: Json | null
          created_at: string | null
          device_info: Json | null
          device_type: string | null
          ended_at: string | null
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_activity_at: string | null
          last_seen_at: string | null
          location_city: string | null
          location_country: string | null
          location_data: Json | null
          location_state: string | null
          logged_out_at: string | null
          session_token: string
          started_at: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          browser_info?: Json | null
          created_at?: string | null
          device_info?: Json | null
          device_type?: string | null
          ended_at?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity_at?: string | null
          last_seen_at?: string | null
          location_city?: string | null
          location_country?: string | null
          location_data?: Json | null
          location_state?: string | null
          logged_out_at?: string | null
          session_token: string
          started_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          browser_info?: Json | null
          created_at?: string | null
          device_info?: Json | null
          device_type?: string | null
          ended_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity_at?: string | null
          last_seen_at?: string | null
          location_city?: string | null
          location_country?: string | null
          location_data?: Json | null
          location_state?: string | null
          logged_out_at?: string | null
          session_token?: string
          started_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          plan_id: string
          start_date: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          plan_id: string
          start_date?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          plan_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_video_history: {
        Row: {
          id: string
          session_seed: string | null
          user_id: string
          video_id: string
          visualizado_em: string
        }
        Insert: {
          id?: string
          session_seed?: string | null
          user_id: string
          video_id: string
          visualizado_em?: string
        }
        Update: {
          id?: string
          session_seed?: string | null
          user_id?: string
          video_id?: string
          visualizado_em?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          created_at: string | null
          id: string
          nudix_balance: number | null
          total_earned: number | null
          total_spent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nudix_balance?: number | null
          total_earned?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nudix_balance?: number | null
          total_earned?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          browser_info: Json | null
          created_at: string | null
          current_points: number | null
          device_info: Json | null
          email: string
          email_verified_at: string | null
          id: string
          is_active: boolean | null
          is_muted: boolean | null
          is_top10_member: boolean | null
          language: string | null
          last_activity_at: string | null
          last_login_at: string | null
          level_points: number | null
          location_city: string | null
          location_country: string | null
          location_ip: string | null
          location_state: string | null
          name: string
          password_hash: string | null
          registration_source: string | null
          timezone: string | null
          top10_registered_at: string | null
          total_points: number | null
          updated_at: string | null
          user_level: number | null
          whatsapp: string | null
          whatsapp_verified_at: string | null
        }
        Insert: {
          browser_info?: Json | null
          created_at?: string | null
          current_points?: number | null
          device_info?: Json | null
          email: string
          email_verified_at?: string | null
          id?: string
          is_active?: boolean | null
          is_muted?: boolean | null
          is_top10_member?: boolean | null
          language?: string | null
          last_activity_at?: string | null
          last_login_at?: string | null
          level_points?: number | null
          location_city?: string | null
          location_country?: string | null
          location_ip?: string | null
          location_state?: string | null
          name: string
          password_hash?: string | null
          registration_source?: string | null
          timezone?: string | null
          top10_registered_at?: string | null
          total_points?: number | null
          updated_at?: string | null
          user_level?: number | null
          whatsapp?: string | null
          whatsapp_verified_at?: string | null
        }
        Update: {
          browser_info?: Json | null
          created_at?: string | null
          current_points?: number | null
          device_info?: Json | null
          email?: string
          email_verified_at?: string | null
          id?: string
          is_active?: boolean | null
          is_muted?: boolean | null
          is_top10_member?: boolean | null
          language?: string | null
          last_activity_at?: string | null
          last_login_at?: string | null
          level_points?: number | null
          location_city?: string | null
          location_country?: string | null
          location_ip?: string | null
          location_state?: string | null
          name?: string
          password_hash?: string | null
          registration_source?: string | null
          timezone?: string | null
          top10_registered_at?: string | null
          total_points?: number | null
          updated_at?: string | null
          user_level?: number | null
          whatsapp?: string | null
          whatsapp_verified_at?: string | null
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          biografia: string | null
          data_atualizacao: string | null
          data_criacao: string | null
          data_nascimento: string | null
          email: string | null
          foto_perfil: string | null
          genero: string | null
          id: string
          localizacao: string | null
          nivel_privacidade: string | null
          nome_completo: string | null
          nome_usuario: string | null
          senha: string | null
          site: string | null
          status: string | null
          telefone: string | null
          verificado: boolean | null
        }
        Insert: {
          biografia?: string | null
          data_atualizacao?: string | null
          data_criacao?: string | null
          data_nascimento?: string | null
          email?: string | null
          foto_perfil?: string | null
          genero?: string | null
          id?: string
          localizacao?: string | null
          nivel_privacidade?: string | null
          nome_completo?: string | null
          nome_usuario?: string | null
          senha?: string | null
          site?: string | null
          status?: string | null
          telefone?: string | null
          verificado?: boolean | null
        }
        Update: {
          biografia?: string | null
          data_atualizacao?: string | null
          data_criacao?: string | null
          data_nascimento?: string | null
          email?: string | null
          foto_perfil?: string | null
          genero?: string | null
          id?: string
          localizacao?: string | null
          nivel_privacidade?: string | null
          nome_completo?: string | null
          nome_usuario?: string | null
          senha?: string | null
          site?: string | null
          status?: string | null
          telefone?: string | null
          verificado?: boolean | null
        }
        Relationships: []
      }
      video_call_models: {
        Row: {
          buy_link: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          model_avatar: string | null
          model_name: string
          preview_video_url: string | null
          price: string | null
          redirect_url: string
          selected_model_id: string | null
          show_in_menu: boolean | null
          updated_at: string | null
        }
        Insert: {
          buy_link?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          model_avatar?: string | null
          model_name: string
          preview_video_url?: string | null
          price?: string | null
          redirect_url: string
          selected_model_id?: string | null
          show_in_menu?: boolean | null
          updated_at?: string | null
        }
        Update: {
          buy_link?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          model_avatar?: string | null
          model_name?: string
          preview_video_url?: string | null
          price?: string | null
          redirect_url?: string
          selected_model_id?: string | null
          show_in_menu?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_call_models_selected_model_id_fkey"
            columns: ["selected_model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_call_models_selected_model_id_fkey"
            columns: ["selected_model_id"]
            isOneToOne: false
            referencedRelation: "popular_models"
            referencedColumns: ["id"]
          },
        ]
      }
      video_genres: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      video_shares: {
        Row: {
          created_at: string | null
          device_type: string | null
          error_message: string | null
          id: string
          ip_address: unknown
          is_active: boolean | null
          model_id: string | null
          platform: string
          session_id: string | null
          share_method: string | null
          shared_url: string | null
          success: boolean | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
          video_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_type?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          model_id?: string | null
          platform?: string
          session_id?: string | null
          share_method?: string | null
          shared_url?: string | null
          success?: boolean | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_type?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          model_id?: string | null
          platform?: string
          session_id?: string | null
          share_method?: string | null
          shared_url?: string | null
          success?: boolean | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_shares_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_shares_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "popular_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_shares_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_views: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          is_complete_view: boolean | null
          is_completed: boolean | null
          model_id: string | null
          referrer_url: string | null
          region: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          video_id: string | null
          watch_duration: number | null
          watch_percentage: number | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_complete_view?: boolean | null
          is_completed?: boolean | null
          model_id?: string | null
          referrer_url?: string | null
          region?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          video_id?: string | null
          watch_duration?: number | null
          watch_percentage?: number | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_complete_view?: boolean | null
          is_completed?: boolean | null
          model_id?: string | null
          referrer_url?: string | null
          region?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          video_id?: string | null
          watch_duration?: number | null
          watch_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_views_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_views_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "popular_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_views_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          aspect_ratio: string | null
          button_color: string
          button_text: string
          category: string | null
          comments_count: number | null
          created_at: string | null
          creator_id: string | null
          description: string | null
          display_order: number
          duration: string
          file_size: number | null
          genres: string[] | null
          id: string
          is_active: boolean | null
          is_blocked: boolean | null
          is_featured: boolean
          is_image_post: boolean | null
          is_live: boolean | null
          is_premium: boolean | null
          likes_count: number | null
          live_video_url: string | null
          model_id: string | null
          profile_link_url: string | null
          quality: string | null
          redirect_link: string | null
          shares_count: number | null
          show_in_feed: boolean
          show_redirect_button: boolean
          tags: string[] | null
          thumbnail_url: string
          title: string
          updated_at: string | null
          upload_source: string | null
          video_url: string
          views_count: number | null
          visibility: string
        }
        Insert: {
          aspect_ratio?: string | null
          button_color?: string
          button_text?: string
          category?: string | null
          comments_count?: number | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          display_order?: number
          duration: string
          file_size?: number | null
          genres?: string[] | null
          id?: string
          is_active?: boolean | null
          is_blocked?: boolean | null
          is_featured?: boolean
          is_image_post?: boolean | null
          is_live?: boolean | null
          is_premium?: boolean | null
          likes_count?: number | null
          live_video_url?: string | null
          model_id?: string | null
          profile_link_url?: string | null
          quality?: string | null
          redirect_link?: string | null
          shares_count?: number | null
          show_in_feed?: boolean
          show_redirect_button?: boolean
          tags?: string[] | null
          thumbnail_url: string
          title: string
          updated_at?: string | null
          upload_source?: string | null
          video_url: string
          views_count?: number | null
          visibility?: string
        }
        Update: {
          aspect_ratio?: string | null
          button_color?: string
          button_text?: string
          category?: string | null
          comments_count?: number | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          display_order?: number
          duration?: string
          file_size?: number | null
          genres?: string[] | null
          id?: string
          is_active?: boolean | null
          is_blocked?: boolean | null
          is_featured?: boolean
          is_image_post?: boolean | null
          is_live?: boolean | null
          is_premium?: boolean | null
          likes_count?: number | null
          live_video_url?: string | null
          model_id?: string | null
          profile_link_url?: string | null
          quality?: string | null
          redirect_link?: string | null
          shares_count?: number | null
          show_in_feed?: boolean
          show_redirect_button?: boolean
          tags?: string[] | null
          thumbnail_url?: string
          title?: string
          updated_at?: string | null
          upload_source?: string | null
          video_url?: string
          views_count?: number | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "popular_models"
            referencedColumns: ["id"]
          },
        ]
      }
      videos_posts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          model_id: string | null
          published_at: string | null
          scheduled_at: string | null
          status: string
          title: string
          video_url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          model_id?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          title: string
          video_url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          model_id?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string
          video_url?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          response_body: string | null
          response_status: number | null
          retry_count: number | null
          status: string
          webhook_url: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          response_body?: string | null
          response_status?: number | null
          retry_count?: number | null
          status?: string
          webhook_url: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          response_body?: string | null
          response_status?: number | null
          retry_count?: number | null
          status?: string
          webhook_url?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          email: string | null
          error_message: string | null
          event_type: string | null
          id: string
          ip_address: string | null
          payload: Json | null
          plan_type: string | null
          processed: boolean | null
          processed_at: string | null
          source: string
          webhook_type: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          ip_address?: string | null
          payload?: Json | null
          plan_type?: string | null
          processed?: boolean | null
          processed_at?: string | null
          source: string
          webhook_type?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          ip_address?: string | null
          payload?: Json | null
          plan_type?: string | null
          processed?: boolean | null
          processed_at?: string | null
          source?: string
          webhook_type?: string | null
        }
        Relationships: []
      }
      webhook_settings: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          webhook_events: string[] | null
          webhook_url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          webhook_events?: string[] | null
          webhook_url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          webhook_events?: string[] | null
          webhook_url?: string
        }
        Relationships: []
      }
      whatsapp_logs: {
        Row: {
          agent_id: string
          created_at: string
          details: Json | null
          event_type: string
          id: string
          message: string | null
          session_id: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          message?: string | null
          session_id?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          message?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          agent_id: string
          contact_name: string | null
          content: string | null
          from_number: string
          group_name: string | null
          id: string
          is_from_bot: boolean
          is_read: boolean | null
          media_caption: string | null
          media_url: string | null
          message_id: string | null
          message_type: string
          raw_data: Json | null
          reply_to_message_id: string | null
          session_id: string | null
          timestamp: string
          to_number: string | null
          whatsapp_timestamp: number | null
        }
        Insert: {
          agent_id: string
          contact_name?: string | null
          content?: string | null
          from_number: string
          group_name?: string | null
          id?: string
          is_from_bot?: boolean
          is_read?: boolean | null
          media_caption?: string | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string
          raw_data?: Json | null
          reply_to_message_id?: string | null
          session_id?: string | null
          timestamp?: string
          to_number?: string | null
          whatsapp_timestamp?: number | null
        }
        Update: {
          agent_id?: string
          contact_name?: string | null
          content?: string | null
          from_number?: string
          group_name?: string | null
          id?: string
          is_from_bot?: boolean
          is_read?: boolean | null
          media_caption?: string | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string
          raw_data?: Json | null
          reply_to_message_id?: string | null
          session_id?: string | null
          timestamp?: string
          to_number?: string | null
          whatsapp_timestamp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_registrations: {
        Row: {
          amount: number | null
          created_at: string
          email: string | null
          expires_at: string | null
          hoopay_payment_id: string | null
          hoopay_transaction_data: Json | null
          id: string
          model_id: string | null
          model_username: string | null
          name: string | null
          page_id: string | null
          paid_at: string | null
          payment_method: string | null
          phone: string
          pix_code: string | null
          status: string
          txid: string | null
          updated_at: string
          whatsapp: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          email?: string | null
          expires_at?: string | null
          hoopay_payment_id?: string | null
          hoopay_transaction_data?: Json | null
          id?: string
          model_id?: string | null
          model_username?: string | null
          name?: string | null
          page_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          phone: string
          pix_code?: string | null
          status?: string
          txid?: string | null
          updated_at?: string
          whatsapp: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          email?: string | null
          expires_at?: string | null
          hoopay_payment_id?: string | null
          hoopay_transaction_data?: Json | null
          id?: string
          model_id?: string | null
          model_username?: string | null
          name?: string | null
          page_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          phone?: string
          pix_code?: string | null
          status?: string
          txid?: string | null
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      whatsapp_sessions: {
        Row: {
          agent_id: string
          auto_reject_calls: boolean | null
          created_at: string
          device_name: string | null
          expires_at: string | null
          id: string
          instance_id: string | null
          last_seen_at: string | null
          phone_number: string | null
          qr_code: string | null
          reject_call_message: string | null
          session_token: string | null
          status: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          agent_id: string
          auto_reject_calls?: boolean | null
          created_at?: string
          device_name?: string | null
          expires_at?: string | null
          id?: string
          instance_id?: string | null
          last_seen_at?: string | null
          phone_number?: string | null
          qr_code?: string | null
          reject_call_message?: string | null
          session_token?: string | null
          status?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          agent_id?: string
          auto_reject_calls?: boolean | null
          created_at?: string
          device_name?: string | null
          expires_at?: string | null
          id?: string
          instance_id?: string | null
          last_seen_at?: string | null
          phone_number?: string | null
          qr_code?: string | null
          reject_call_message?: string | null
          session_token?: string | null
          status?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      zonas_geograficas: {
        Row: {
          ativa: boolean | null
          caracteristicas: Json | null
          centro_latitude: number | null
          centro_longitude: number | null
          cidade: string | null
          codigo_postal: string | null
          data_criacao: string | null
          densidade_populacional: number | null
          estado: string | null
          geometria: Json | null
          id: string
          idioma_predominante: string | null
          moeda_local: string | null
          nome_zona: string
          pais: string | null
          populacao: number | null
          raio_cobertura: number | null
          timezone: string | null
          tipo_zona: string | null
        }
        Insert: {
          ativa?: boolean | null
          caracteristicas?: Json | null
          centro_latitude?: number | null
          centro_longitude?: number | null
          cidade?: string | null
          codigo_postal?: string | null
          data_criacao?: string | null
          densidade_populacional?: number | null
          estado?: string | null
          geometria?: Json | null
          id?: string
          idioma_predominante?: string | null
          moeda_local?: string | null
          nome_zona: string
          pais?: string | null
          populacao?: number | null
          raio_cobertura?: number | null
          timezone?: string | null
          tipo_zona?: string | null
        }
        Update: {
          ativa?: boolean | null
          caracteristicas?: Json | null
          centro_latitude?: number | null
          centro_longitude?: number | null
          cidade?: string | null
          codigo_postal?: string | null
          data_criacao?: string | null
          densidade_populacional?: number | null
          estado?: string | null
          geometria?: Json | null
          id?: string
          idioma_predominante?: string | null
          moeda_local?: string | null
          nome_zona?: string
          pais?: string | null
          populacao?: number | null
          raio_cobertura?: number | null
          timezone?: string | null
          tipo_zona?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      daily_stats: {
        Row: {
          active_users: number | null
          date: string | null
          total_comments: number | null
          total_likes: number | null
          total_points_awarded: number | null
          total_shares: number | null
        }
        Relationships: []
      }
      popular_models: {
        Row: {
          followers_count: number | null
          id: string | null
          is_live: boolean | null
          likes_count: number | null
          name: string | null
          total_comments: number | null
          total_video_likes: number | null
          total_views: number | null
          username: string | null
          videos_count: number | null
        }
        Relationships: []
      }
      top_users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
          is_top10_member: boolean | null
          name: string | null
          ranking: number | null
          top10_registered_at: string | null
          total_points: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_creator_role_safe: {
        Args: { p_granted_by: string; p_user_email: string }
        Returns: string
      }
      admin_delete_model: { Args: { p_model_id: string }; Returns: undefined }
      admin_delete_user: { Args: { p_user_id: string }; Returns: undefined }
      approve_referral: { Args: { p_referral_id: string }; Returns: boolean }
      atualizar_localizacao_usuario: {
        Args: {
          endereco?: string
          id_usuario: string
          lat: number
          lng: number
          precisao?: number
          tipo_disp?: string
        }
        Returns: string
      }
      atualizar_pontuacao_usuario: {
        Args: {
          acao: string
          id_usuario: string
          pontos: number
          referencia_id?: string
        }
        Returns: boolean
      }
      auto_cleanup_chat_data: { Args: never; Returns: undefined }
      auto_cleanup_sensitive_data: { Args: never; Returns: undefined }
      auto_confirm_payment: { Args: { p_whatsapp: string }; Returns: Json }
      calcular_distancia: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      cancel_referral: { Args: { p_referral_id: string }; Returns: boolean }
      check_empresa_exists: {
        Args: { check_email: string; check_whatsapp: string }
        Returns: Json
      }
      check_modelo_exists: {
        Args: { check_email: string; check_whatsapp: string }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          action_type: string
          identifier: string
          max_requests?: number
          window_minutes?: number
        }
        Returns: boolean
      }
      check_security_status: { Args: never; Returns: Json }
      check_whatsapp_registration_status: {
        Args: { p_pix_code?: string; p_whatsapp: string }
        Returns: Json
      }
      cleanup_expired_model_sessions: { Args: never; Returns: undefined }
      cleanup_offline_users: { Args: never; Returns: undefined }
      cleanup_old_active_sessions: { Args: never; Returns: undefined }
      cleanup_old_comments: { Args: never; Returns: undefined }
      cleanup_old_marketplace_feedback: { Args: never; Returns: undefined }
      cleanup_old_online_users: { Args: never; Returns: undefined }
      cleanup_old_sessions: { Args: never; Returns: undefined }
      cleanup_registration_limits: { Args: never; Returns: undefined }
      cleanup_security_data: { Args: never; Returns: undefined }
      cleanup_sensitive_data: { Args: never; Returns: undefined }
      cleanup_sensitive_data_auto: { Args: never; Returns: undefined }
      cleanup_sensitive_data_enhanced: { Args: never; Returns: undefined }
      cleanup_user_sessions: { Args: never; Returns: string }
      create_lxpay_pix: {
        Args: {
          p_amount: number
          p_client_email: string
          p_client_name: string
          p_identifier: string
          p_product_title: string
        }
        Returns: Json
      }
      create_pix_charge: {
        Args: {
          p_amount: number
          p_email: string
          p_name: string
          p_plan_days: number
          p_plan_type: string
          p_user_id: string
          p_whatsapp: string
        }
        Returns: Json
      }
      debug_admin_status: {
        Args: never
        Returns: {
          current_user_id: string
          has_admin_role: boolean
          is_authenticated: boolean
          user_metadata: Json
        }[]
      }
      detectar_movimento: {
        Args: { coordenadas: Json; id_usuario: string; velocidade: number }
        Returns: string
      }
      emergency_security_lockdown: { Args: never; Returns: string }
      ensure_admin_user: {
        Args: { p_email: string; p_password: string }
        Returns: string
      }
      ensure_guest_user: { Args: { guest_user_id: string }; Returns: string }
      fazer_checkin_automatico: {
        Args: {
          id_usuario: string
          lat: number
          lng: number
          nome_local?: string
        }
        Returns: string
      }
      follow_model_anonymous: {
        Args: { p_is_active?: boolean; p_model_id: string; p_user_id: string }
        Returns: Json
      }
      generate_unique_referral_code: { Args: never; Returns: string }
      get_chat_panel_config: {
        Args: { p_entity_id: string; p_entity_type?: string }
        Returns: Json
      }
      get_commission_percentage: { Args: never; Returns: number }
      get_current_user_role: { Args: never; Returns: string }
      get_daily_points_status: {
        Args: { p_action_type: string; p_user_id: string }
        Returns: Json
      }
      get_live_online_counts: {
        Args: { p_config_id: string }
        Returns: {
          desktop_count: number
          mobile_count: number
          total_count: number
        }[]
      }
      get_live_views_48h: { Args: { p_config_id: string }; Returns: number }
      get_payment_credentials: { Args: { p_provider: string }; Returns: Json }
      get_referrer_by_code: { Args: { p_code: string }; Returns: string }
      get_smart_ads: {
        Args: { p_exclude_ids?: string[]; p_limit?: number; p_user_id: string }
        Returns: {
          avatar_url: string | null
          banner_url: string | null
          clicks_count: number | null
          created_at: string | null
          cta_link: string | null
          cta_mode: string
          cta_text: string | null
          daily_frequency: number | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          media_type: string
          media_url: string
          model_id: string | null
          popup_cta_link: string | null
          popup_cta_text: string | null
          popup_media_type: string | null
          popup_media_url: string | null
          position_interval: number | null
          priority: number | null
          schedule_date: string | null
          schedule_status: string | null
          shareable_link: string | null
          title: string
          updated_at: string | null
          views_count: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "feed_promotions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_smart_feed: {
        Args: { p_exclude_ids?: string[]; p_limit?: number; p_user_id: string }
        Returns: {
          aspect_ratio: string | null
          button_color: string
          button_text: string
          category: string | null
          comments_count: number | null
          created_at: string | null
          creator_id: string | null
          description: string | null
          display_order: number
          duration: string
          file_size: number | null
          genres: string[] | null
          id: string
          is_active: boolean | null
          is_blocked: boolean | null
          is_featured: boolean
          is_image_post: boolean | null
          is_live: boolean | null
          is_premium: boolean | null
          likes_count: number | null
          live_video_url: string | null
          model_id: string | null
          profile_link_url: string | null
          quality: string | null
          redirect_link: string | null
          shares_count: number | null
          show_in_feed: boolean
          show_redirect_button: boolean
          tags: string[] | null
          thumbnail_url: string
          title: string
          updated_at: string | null
          upload_source: string | null
          video_url: string
          views_count: number | null
          visibility: string
        }[]
        SetofOptions: {
          from: "*"
          to: "videos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_by_email: {
        Args: { email_input: string }
        Returns: {
          created_at: string
          email: string
          id: string
          name: string
        }[]
      }
      get_user_feed: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          created_at: string
          duration: string
          likes_count: number
          model_avatar: string
          model_id: string
          model_name: string
          model_username: string
          thumbnail_url: string
          title: string
          video_id: string
          video_url: string
          views_count: number
        }[]
      }
      has_model_subscription: {
        Args: { _model_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_sensitive_data: { Args: { data: string }; Returns: string }
      increment_agent_messages: {
        Args: { agent_id: string }
        Returns: undefined
      }
      increment_video_views: { Args: { video_id: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      log_security_event: {
        Args: { event_type: string; metadata?: Json }
        Returns: undefined
      }
      mark_feed_video_seen: {
        Args: { p_model_id: string; p_user_id: string; p_video_id: string }
        Returns: Json
      }
      monitor_suspicious_activity: { Args: never; Returns: undefined }
      normalize_phone: { Args: { phone_input: string }; Returns: string }
      process_referral_completion: {
        Args: {
          p_referred_email?: string
          p_referred_id: string
          p_referrer_id: string
        }
        Returns: boolean
      }
      processar_posts_agendados: { Args: never; Returns: string }
      processar_posts_agendados_manual: { Args: never; Returns: string }
      register_anonymous_creation: {
        Args: { p_profile_id: string; p_user_id?: string }
        Returns: undefined
      }
      register_daily_action: {
        Args: {
          p_action_type: string
          p_model_id?: string
          p_points?: number
          p_user_id: string
          p_video_id?: string
        }
        Returns: Json
      }
      register_gamification_action: {
        Args: {
          p_action_type: string
          p_ip_address?: string
          p_model_id?: string
          p_user_agent?: string
          p_user_id: string
          p_video_id?: string
        }
        Returns: Json
      }
      register_online_user: {
        Args: {
          p_device_type?: string
          p_ip_address?: string
          p_location_city?: string
          p_location_country?: string
          p_location_state?: string
          p_session_id: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: undefined
      }
      register_sale: {
        Args: {
          p_amount: number
          p_hoopay_data?: Json
          p_page_id: string
          p_real_amount?: number
          p_transaction_id?: string
          p_whatsapp: string
        }
        Returns: string
      }
      register_whatsapp: {
        Args: {
          p_model_id?: string
          p_model_username?: string
          p_whatsapp: string
        }
        Returns: Json
      }
      secure_confirm_whatsapp_payment: {
        Args: { p_txid?: string; p_whatsapp: string }
        Returns: Json
      }
      sync_real_time_data: { Args: never; Returns: undefined }
      testar_sistema: { Args: never; Returns: string }
      track_user_activity: { Args: never; Returns: undefined }
      update_mission_progress: {
        Args: { p_action_type: string; p_increment?: number; p_user_id: string }
        Returns: Json
      }
      upsert_model_from_dashboard: {
        Args: {
          p_avatar_url: string
          p_id: string
          p_name: string
          p_posting_panel_url?: string
          p_profile_link?: string
          p_username: string
        }
        Returns: Json
      }
      validate_gmail: { Args: { email_input: string }; Returns: boolean }
      validate_model_access: {
        Args: { p_access_code: string; p_username: string }
        Returns: Json
      }
      validate_model_session: {
        Args: { p_session_token: string }
        Returns: Json
      }
      verificar_notificacoes_localizacao: {
        Args: { id_usuario: string; lat: number; lng: number }
        Returns: number
      }
      verify_lxpay_payment: {
        Args: { p_external_id?: string; p_transaction_id?: string }
        Returns: Json
      }
      verify_pix_payment: { Args: { p_payment_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "user" | "admin" | "moderator" | "creator" | "shopkeeper"
      payment_frequency: "monthly" | "quarterly" | "yearly"
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
      app_role: ["user", "admin", "moderator", "creator", "shopkeeper"],
      payment_frequency: ["monthly", "quarterly", "yearly"],
    },
  },
} as const
