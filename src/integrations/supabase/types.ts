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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      analyst_context: {
        Row: {
          context_data: Json
          created_at: string
          expires_at: string
          id: string
          session_id: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          context_data?: Json
          created_at?: string
          expires_at?: string
          id?: string
          session_id: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          context_data?: Json
          created_at?: string
          expires_at?: string
          id?: string
          session_id?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      analyst_outputs: {
        Row: {
          id: string
          input_json: Json | null
          input_kind: string | null
          model: string | null
          output_text: string | null
          retention_until: string | null
          ts: string | null
          tts_url: string | null
          workspace_id: string | null
        }
        Insert: {
          id?: string
          input_json?: Json | null
          input_kind?: string | null
          model?: string | null
          output_text?: string | null
          retention_until?: string | null
          ts?: string | null
          tts_url?: string | null
          workspace_id?: string | null
        }
        Update: {
          id?: string
          input_json?: Json | null
          input_kind?: string | null
          model?: string | null
          output_text?: string | null
          retention_until?: string | null
          ts?: string | null
          tts_url?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analyst_outputs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      analyst_prompts: {
        Row: {
          persona: string
          style_notes: string | null
          system_text: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          persona: string
          style_notes?: string | null
          system_text: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          persona?: string
          style_notes?: string | null
          system_text?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyst_prompts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      analyst_sessions: {
        Row: {
          created_at: string | null
          id: string
          summary: Json | null
          updated_at: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          summary?: Json | null
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          summary?: Json | null
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analyst_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      analyst_telemetry: {
        Row: {
          created_at: string | null
          event: string
          id: string
          payload: Json | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          event: string
          id?: string
          payload?: Json | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          event?: string
          id?: string
          payload?: Json | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analyst_telemetry_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_customers: {
        Row: {
          created_at: string | null
          stripe_customer_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          stripe_customer_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          stripe_customer_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_customers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_invoices: {
        Row: {
          amount_total: number
          created_at: string | null
          currency: string
          hosted_invoice_url: string | null
          id: string
          stripe_invoice_id: string
          workspace_id: string | null
        }
        Insert: {
          amount_total: number
          created_at?: string | null
          currency?: string
          hosted_invoice_url?: string | null
          id?: string
          stripe_invoice_id: string
          workspace_id?: string | null
        }
        Update: {
          amount_total?: number
          created_at?: string | null
          currency?: string
          hosted_invoice_url?: string | null
          id?: string
          stripe_invoice_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          id: string
          plan_code: string
          status: string
          stripe_subscription_id: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          plan_code: string
          status: string
          stripe_subscription_id: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          plan_code?: string
          status?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      blacklists: {
        Row: {
          created_at: string
          reason: string | null
          symbol: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          reason?: string | null
          symbol: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          reason?: string | null
          symbol?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blacklists_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "ref_symbols"
            referencedColumns: ["symbol"]
          },
          {
            foreignKeyName: "blacklists_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_profiles: {
        Row: {
          active: boolean
          capital_risk_pct: number
          daily_loss_halt_pct: number
          daily_return_target_pct: number
          daily_target_mode: string
          execution_mode: string
          intraday_blackout_json: Json | null
          intraday_daily_loss_halt_pct: number
          intraday_enabled: boolean
          intraday_max_trades: number
          intraday_min_volume_usd: number
          intraday_rr_min: number
          intraday_stop_style: string
          intraday_time_window: string
          last_activated: string | null
          last_deactivated: string | null
          max_concurrent_positions: number
          max_trades_per_day: number
          min_volume_usd: number
          mode: string
          name: string | null
          pdt_guard: boolean
          risk_indicator: string
          risk_per_trade_pct: number
          rr_min: number
          signal_confidence_min: number
          stop_style: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          active?: boolean
          capital_risk_pct?: number
          daily_loss_halt_pct?: number
          daily_return_target_pct?: number
          daily_target_mode?: string
          execution_mode?: string
          intraday_blackout_json?: Json | null
          intraday_daily_loss_halt_pct?: number
          intraday_enabled?: boolean
          intraday_max_trades?: number
          intraday_min_volume_usd?: number
          intraday_rr_min?: number
          intraday_stop_style?: string
          intraday_time_window?: string
          last_activated?: string | null
          last_deactivated?: string | null
          max_concurrent_positions?: number
          max_trades_per_day?: number
          min_volume_usd?: number
          mode?: string
          name?: string | null
          pdt_guard?: boolean
          risk_indicator?: string
          risk_per_trade_pct?: number
          rr_min?: number
          signal_confidence_min?: number
          stop_style?: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          active?: boolean
          capital_risk_pct?: number
          daily_loss_halt_pct?: number
          daily_return_target_pct?: number
          daily_target_mode?: string
          execution_mode?: string
          intraday_blackout_json?: Json | null
          intraday_daily_loss_halt_pct?: number
          intraday_enabled?: boolean
          intraday_max_trades?: number
          intraday_min_volume_usd?: number
          intraday_rr_min?: number
          intraday_stop_style?: string
          intraday_time_window?: string
          last_activated?: string | null
          last_deactivated?: string | null
          max_concurrent_positions?: number
          max_trades_per_day?: number
          min_volume_usd?: number
          mode?: string
          name?: string | null
          pdt_guard?: boolean
          risk_indicator?: string
          risk_per_trade_pct?: number
          rr_min?: number
          signal_confidence_min?: number
          stop_style?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_health: {
        Row: {
          broker: string
          error_message: string | null
          last_check: string | null
          last_ok: string | null
          status: string
          workspace_id: string
        }
        Insert: {
          broker: string
          error_message?: string | null
          last_check?: string | null
          last_ok?: string | null
          status?: string
          workspace_id: string
        }
        Update: {
          broker?: string
          error_message?: string | null
          last_check?: string | null
          last_ok?: string | null
          status?: string
          workspace_id?: string
        }
        Relationships: []
      }
      brokerage_dock_sites: {
        Row: {
          created_at: string | null
          id: string
          label: string
          updated_at: string | null
          url: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          updated_at?: string | null
          url: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          updated_at?: string | null
          url?: string
          user_id?: string | null
        }
        Relationships: []
      }
      candles: {
        Row: {
          c: number | null
          h: number | null
          l: number | null
          o: number | null
          symbol: string
          tf: string
          ts: string
          v: number | null
          vwap: number | null
          workspace_id: string
        }
        Insert: {
          c?: number | null
          h?: number | null
          l?: number | null
          o?: number | null
          symbol: string
          tf: string
          ts: string
          v?: number | null
          vwap?: number | null
          workspace_id: string
        }
        Update: {
          c?: number | null
          h?: number | null
          l?: number | null
          o?: number | null
          symbol?: string
          tf?: string
          ts?: string
          v?: number | null
          vwap?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candles_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "ref_symbols"
            referencedColumns: ["symbol"]
          },
          {
            foreignKeyName: "candles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_layouts: {
        Row: {
          created_at: string | null
          id: string
          layout: Json
          name: string
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          layout: Json
          name?: string
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          layout?: Json
          name?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      compliance_acknowledgments: {
        Row: {
          acknowledged_at: string | null
          document_type: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
          version: string
          workspace_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          document_type: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
          version: string
          workspace_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          document_type?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
          version?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_acknowledgments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      connections_brokerages: {
        Row: {
          account_label: string | null
          api_key_cipher: string
          api_secret_cipher: string
          created_at: string | null
          id: string
          last_sync: string | null
          nonce: string
          provider: string
          scope: Json | null
          status: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          account_label?: string | null
          api_key_cipher: string
          api_secret_cipher: string
          created_at?: string | null
          id?: string
          last_sync?: string | null
          nonce: string
          provider: string
          scope?: Json | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          account_label?: string | null
          api_key_cipher?: string
          api_secret_cipher?: string
          created_at?: string | null
          id?: string
          last_sync?: string | null
          nonce?: string
          provider?: string
          scope?: Json | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connections_brokerages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cradle_sheets: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          name: string
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json
          id?: string
          name?: string
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cradle_sheets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      div_calculations: {
        Row: {
          adps: number
          created_at: string
          current_price: number
          drip_enabled: boolean
          frequency: string
          growth_rate: number
          id: string
          months_horizon: number
          price_assumption: number | null
          shares: number
          symbol: string
          updated_at: string
          user_id: string
          withholding_pct: number
          workspace_id: string
        }
        Insert: {
          adps: number
          created_at?: string
          current_price: number
          drip_enabled?: boolean
          frequency: string
          growth_rate?: number
          id?: string
          months_horizon?: number
          price_assumption?: number | null
          shares: number
          symbol: string
          updated_at?: string
          user_id: string
          withholding_pct?: number
          workspace_id: string
        }
        Update: {
          adps?: number
          created_at?: string
          current_price?: number
          drip_enabled?: boolean
          frequency?: string
          growth_rate?: number
          id?: string
          months_horizon?: number
          price_assumption?: number | null
          shares?: number
          symbol?: string
          updated_at?: string
          user_id?: string
          withholding_pct?: number
          workspace_id?: string
        }
        Relationships: []
      }
      div_overrides: {
        Row: {
          adps: number | null
          created_at: string
          frequency: string | null
          growth_rate: number | null
          symbol: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          adps?: number | null
          created_at?: string
          frequency?: string | null
          growth_rate?: number | null
          symbol: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          adps?: number | null
          created_at?: string
          frequency?: string | null
          growth_rate?: number | null
          symbol?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      div_ref: {
        Row: {
          adps: number
          ex_date: string | null
          frequency: string
          pay_date: string | null
          symbol: string
          updated_at: string
        }
        Insert: {
          adps?: number
          ex_date?: string | null
          frequency?: string
          pay_date?: string | null
          symbol: string
          updated_at?: string
        }
        Update: {
          adps?: number
          ex_date?: string | null
          frequency?: string
          pay_date?: string | null
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          created_at: string | null
          id: string
          question: string
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          id?: string
          question: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          id?: string
          question?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          flags: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          flags?: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          flags?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      features: {
        Row: {
          code: string
          description: string
          tier_min: string
        }
        Insert: {
          code: string
          description: string
          tier_min: string
        }
        Update: {
          code?: string
          description?: string
          tier_min?: string
        }
        Relationships: []
      }
      glossary: {
        Row: {
          created_at: string | null
          definition: string
          examples: string | null
          see_also: string[] | null
          term: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          definition: string
          examples?: string | null
          see_also?: string[] | null
          term: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          definition?: string
          examples?: string | null
          see_also?: string[] | null
          term?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      indicators: {
        Row: {
          atr14: number | null
          bb_dn: number | null
          bb_up: number | null
          ma20: number | null
          ma200: number | null
          ma50: number | null
          macd: number | null
          rsi14: number | null
          symbol: string
          tf: string
          ts: string
          vwap_sess: number | null
          workspace_id: string
        }
        Insert: {
          atr14?: number | null
          bb_dn?: number | null
          bb_up?: number | null
          ma20?: number | null
          ma200?: number | null
          ma50?: number | null
          macd?: number | null
          rsi14?: number | null
          symbol: string
          tf: string
          ts: string
          vwap_sess?: number | null
          workspace_id: string
        }
        Update: {
          atr14?: number | null
          bb_dn?: number | null
          bb_up?: number | null
          ma20?: number | null
          ma200?: number | null
          ma50?: number | null
          macd?: number | null
          rsi14?: number | null
          symbol?: string
          tf?: string
          ts?: string
          vwap_sess?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicators_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "ref_symbols"
            referencedColumns: ["symbol"]
          },
          {
            foreignKeyName: "indicators_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      intraday_sessions: {
        Row: {
          close_time: string
          open_time: string
          symbol_class: string
          tz: string
          workspace_id: string
        }
        Insert: {
          close_time?: string
          open_time?: string
          symbol_class: string
          tz?: string
          workspace_id: string
        }
        Update: {
          close_time?: string
          open_time?: string
          symbol_class?: string
          tz?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intraday_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_chunks: {
        Row: {
          content: string
          created_at: string | null
          document_id: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          content: string
          created_at?: string | null
          document_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          content?: string
          created_at?: string | null
          document_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "kb_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_documents: {
        Row: {
          created_at: string | null
          doc_type: string | null
          id: string
          language: string | null
          source_id: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          doc_type?: string | null
          id?: string
          language?: string | null
          source_id?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          doc_type?: string | null
          id?: string
          language?: string | null
          source_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_documents_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "kb_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_embeddings: {
        Row: {
          chunk_id: string
          created_at: string | null
          embedding: string | null
        }
        Insert: {
          chunk_id: string
          created_at?: string | null
          embedding?: string | null
        }
        Update: {
          chunk_id?: string
          created_at?: string | null
          embedding?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_embeddings_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: true
            referencedRelation: "kb_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_sources: {
        Row: {
          created_at: string | null
          id: string
          license: string | null
          name: string
          priority: number | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          license?: string | null
          name: string
          priority?: number | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          license?: string | null
          name?: string
          priority?: number | null
          url?: string | null
        }
        Relationships: []
      }
      market_data: {
        Row: {
          change: number | null
          change_percent: number | null
          high: number | null
          low: number | null
          open: number | null
          price: number | null
          symbol: string
          updated_at: string
          volume: number | null
          workspace_id: string
        }
        Insert: {
          change?: number | null
          change_percent?: number | null
          high?: number | null
          low?: number | null
          open?: number | null
          price?: number | null
          symbol: string
          updated_at?: string
          volume?: number | null
          workspace_id: string
        }
        Update: {
          change?: number | null
          change_percent?: number | null
          high?: number | null
          low?: number | null
          open?: number | null
          price?: number | null
          symbol?: string
          updated_at?: string
          volume?: number | null
          workspace_id?: string
        }
        Relationships: []
      }
      oracle_news: {
        Row: {
          headline: string | null
          id: string
          sentiment: number | null
          source: string | null
          symbol: string | null
          topics: Json | null
          ts: string
          url: string | null
          workspace_id: string | null
        }
        Insert: {
          headline?: string | null
          id?: string
          sentiment?: number | null
          source?: string | null
          symbol?: string | null
          topics?: Json | null
          ts: string
          url?: string | null
          workspace_id?: string | null
        }
        Update: {
          headline?: string | null
          id?: string
          sentiment?: number | null
          source?: string | null
          symbol?: string | null
          topics?: Json | null
          ts?: string
          url?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oracle_news_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      oracle_scores: {
        Row: {
          drivers: Json | null
          id: string
          score: number | null
          symbol: string
          ts: string
          workspace_id: string | null
        }
        Insert: {
          drivers?: Json | null
          id?: string
          score?: number | null
          symbol: string
          ts?: string
          workspace_id?: string | null
        }
        Update: {
          drivers?: Json | null
          id?: string
          score?: number | null
          symbol?: string
          ts?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oracle_scores_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      oracle_signals: {
        Row: {
          direction: number
          id: string
          name: string
          payload: Json | null
          signal_type: string
          source: string | null
          strength: number
          summary: string | null
          symbol: string
          tf: string
          ts: string
          value: number | null
          workspace_id: string
        }
        Insert: {
          direction: number
          id?: string
          name: string
          payload?: Json | null
          signal_type: string
          source?: string | null
          strength: number
          summary?: string | null
          symbol: string
          tf?: string
          ts?: string
          value?: number | null
          workspace_id: string
        }
        Update: {
          direction?: number
          id?: string
          name?: string
          payload?: Json | null
          signal_type?: string
          source?: string | null
          strength?: number
          summary?: string | null
          symbol?: string
          tf?: string
          ts?: string
          value?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oracle_signals_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "ref_symbols"
            referencedColumns: ["symbol"]
          },
          {
            foreignKeyName: "oracle_signals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      oracle_sources: {
        Row: {
          api_key_ref: string | null
          created_at: string | null
          enabled: boolean | null
          id: string
          kind: string
          provider: string
          workspace_id: string | null
        }
        Insert: {
          api_key_ref?: string | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          kind: string
          provider: string
          workspace_id?: string | null
        }
        Update: {
          api_key_ref?: string | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          kind?: string
          provider?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oracle_sources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          broker_order_id: string | null
          created_at: string
          filled_avg_price: number | null
          filled_qty: number | null
          id: string
          order_type: string
          price: number | null
          quantity: number
          side: string
          status: string
          stop_price: number | null
          symbol: string
          time_in_force: string | null
          updated_at: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          broker_order_id?: string | null
          created_at?: string
          filled_avg_price?: number | null
          filled_qty?: number | null
          id?: string
          order_type: string
          price?: number | null
          quantity: number
          side: string
          status?: string
          stop_price?: number | null
          symbol: string
          time_in_force?: string | null
          updated_at?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          broker_order_id?: string | null
          created_at?: string
          filled_avg_price?: number | null
          filled_qty?: number | null
          id?: string
          order_type?: string
          price?: number | null
          quantity?: number
          side?: string
          status?: string
          stop_price?: number | null
          symbol?: string
          time_in_force?: string | null
          updated_at?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      portfolio_current: {
        Row: {
          cash: number | null
          equity: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cash?: number | null
          equity?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cash?: number | null
          equity?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_current_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      positions_current: {
        Row: {
          avg_cost: number
          mv: number | null
          qty: number
          r_pnl: number | null
          symbol: string
          unr_pnl: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          avg_cost: number
          mv?: number | null
          qty: number
          r_pnl?: number | null
          symbol: string
          unr_pnl?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          avg_cost?: number
          mv?: number | null
          qty?: number
          r_pnl?: number | null
          symbol?: string
          unr_pnl?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_current_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "ref_symbols"
            referencedColumns: ["symbol"]
          },
          {
            foreignKeyName: "positions_current_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          marketing_opt_in: boolean | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          marketing_opt_in?: boolean | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          marketing_opt_in?: boolean | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rec_events: {
        Row: {
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          payload_json: Json | null
          retention_until: string | null
          severity: number
          summary: string | null
          ts: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          payload_json?: Json | null
          retention_until?: string | null
          severity?: number
          summary?: string | null
          ts?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          payload_json?: Json | null
          retention_until?: string | null
          severity?: number
          summary?: string | null
          ts?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rec_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      rec_exports: {
        Row: {
          created_at: string
          file_url: string | null
          format: string
          id: string
          range_end: string | null
          range_start: string | null
          status: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          format: string
          id?: string
          range_end?: string | null
          range_start?: string | null
          status?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          format?: string
          id?: string
          range_end?: string | null
          range_start?: string | null
          status?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rec_exports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          last_update_ts: string
          reason_bullets: Json | null
          related_event_ids: string[] | null
          score: number | null
          symbol: string
          workspace_id: string
        }
        Insert: {
          last_update_ts?: string
          reason_bullets?: Json | null
          related_event_ids?: string[] | null
          score?: number | null
          symbol: string
          workspace_id: string
        }
        Update: {
          last_update_ts?: string
          reason_bullets?: Json | null
          related_event_ids?: string[] | null
          score?: number | null
          symbol?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_symbols: {
        Row: {
          active: boolean | null
          asset_class: string | null
          exchange: string | null
          industry: string | null
          sector: string | null
          symbol: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          asset_class?: string | null
          exchange?: string | null
          industry?: string | null
          sector?: string | null
          symbol: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          asset_class?: string | null
          exchange?: string | null
          industry?: string | null
          sector?: string | null
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      regulatory_reports: {
        Row: {
          created_by: string | null
          file_path: string | null
          generated_at: string | null
          id: string
          period_end: string | null
          period_start: string | null
          report_type: string
          status: string | null
          workspace_id: string | null
        }
        Insert: {
          created_by?: string | null
          file_path?: string | null
          generated_at?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          report_type: string
          status?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_by?: string | null
          file_path?: string | null
          generated_at?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          report_type?: string
          status?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_reports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_counters: {
        Row: {
          day: string
          last_loss_at: string | null
          last_trade_at: string | null
          losses: number
          total_pnl: number
          trades: number
          wins: number
          workspace_id: string
        }
        Insert: {
          day: string
          last_loss_at?: string | null
          last_trade_at?: string | null
          losses?: number
          total_pnl?: number
          trades?: number
          wins?: number
          workspace_id: string
        }
        Update: {
          day?: string
          last_loss_at?: string | null
          last_trade_at?: string | null
          losses?: number
          total_pnl?: number
          trades?: number
          wins?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_counters_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_policies: {
        Row: {
          allow_postmarket: boolean
          allow_premarket: boolean
          cooldown_after_loss_secs: number
          created_at: string
          market_data_freshness_ms: number
          max_daily_loss_pct: number
          max_notional_per_trade: number
          max_positions: number
          max_spread_pct: number
          max_trades_per_day: number
          min_liquidity_volume: number
          require_stop_loss: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          allow_postmarket?: boolean
          allow_premarket?: boolean
          cooldown_after_loss_secs?: number
          created_at?: string
          market_data_freshness_ms?: number
          max_daily_loss_pct?: number
          max_notional_per_trade?: number
          max_positions?: number
          max_spread_pct?: number
          max_trades_per_day?: number
          min_liquidity_volume?: number
          require_stop_loss?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          allow_postmarket?: boolean
          allow_premarket?: boolean
          cooldown_after_loss_secs?: number
          created_at?: string
          market_data_freshness_ms?: number
          max_daily_loss_pct?: number
          max_notional_per_trade?: number
          max_positions?: number
          max_spread_pct?: number
          max_trades_per_day?: number
          min_liquidity_volume?: number
          require_stop_loss?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_policies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_portfolio: {
        Row: {
          beta: number | null
          concentration_top: number | null
          dd_pct: number | null
          es_95: number | null
          liquidity_score: number | null
          risk_state: number | null
          ts: string
          var_95: number | null
          workspace_id: string
        }
        Insert: {
          beta?: number | null
          concentration_top?: number | null
          dd_pct?: number | null
          es_95?: number | null
          liquidity_score?: number | null
          risk_state?: number | null
          ts?: string
          var_95?: number | null
          workspace_id: string
        }
        Update: {
          beta?: number | null
          concentration_top?: number | null
          dd_pct?: number | null
          es_95?: number | null
          liquidity_score?: number | null
          risk_state?: number | null
          ts?: string
          var_95?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_portfolio_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_positions: {
        Row: {
          adv_pct: number | null
          beta_sym: number | null
          spread_est: number | null
          stop_suggest: number | null
          symbol: string
          tp_suggest: number | null
          ts: string
          workspace_id: string
        }
        Insert: {
          adv_pct?: number | null
          beta_sym?: number | null
          spread_est?: number | null
          stop_suggest?: number | null
          symbol: string
          tp_suggest?: number | null
          ts?: string
          workspace_id: string
        }
        Update: {
          adv_pct?: number | null
          beta_sym?: number | null
          spread_est?: number | null
          stop_suggest?: number | null
          symbol?: string
          tp_suggest?: number | null
          ts?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_positions_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "ref_symbols"
            referencedColumns: ["symbol"]
          },
          {
            foreignKeyName: "risk_positions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_settings: {
        Row: {
          blacklist_enforced: boolean | null
          daily_drawdown_halt_pct: number | null
          exposure_limits_enabled: boolean | null
          gains_rr_ratio: number | null
          hard_pull_enabled: boolean | null
          leverage_cap: number | null
          min_price: number | null
          min_trade_usd: number | null
          partial_exit_enabled: boolean | null
          per_trade_risk_pct: number | null
          profit_lock_trailing: boolean | null
          sector_exposure_cap_pct: number | null
          soft_pull_enabled: boolean | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          blacklist_enforced?: boolean | null
          daily_drawdown_halt_pct?: number | null
          exposure_limits_enabled?: boolean | null
          gains_rr_ratio?: number | null
          hard_pull_enabled?: boolean | null
          leverage_cap?: number | null
          min_price?: number | null
          min_trade_usd?: number | null
          partial_exit_enabled?: boolean | null
          per_trade_risk_pct?: number | null
          profit_lock_trailing?: boolean | null
          sector_exposure_cap_pct?: number | null
          soft_pull_enabled?: boolean | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          blacklist_enforced?: boolean | null
          daily_drawdown_halt_pct?: number | null
          exposure_limits_enabled?: boolean | null
          gains_rr_ratio?: number | null
          hard_pull_enabled?: boolean | null
          leverage_cap?: number | null
          min_price?: number | null
          min_trade_usd?: number | null
          partial_exit_enabled?: boolean | null
          per_trade_risk_pct?: number | null
          profit_lock_trailing?: boolean | null
          sector_exposure_cap_pct?: number | null
          soft_pull_enabled?: boolean | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      search_queries: {
        Row: {
          created_ts: string
          filters_json: Json | null
          id: string
          last_run_ts: string | null
          notify: boolean | null
          owner_id: string | null
          query_text: string | null
          workspace_id: string
        }
        Insert: {
          created_ts?: string
          filters_json?: Json | null
          id?: string
          last_run_ts?: string | null
          notify?: boolean | null
          owner_id?: string | null
          query_text?: string | null
          workspace_id: string
        }
        Update: {
          created_ts?: string
          filters_json?: Json | null
          id?: string
          last_run_ts?: string | null
          notify?: boolean | null
          owner_id?: string | null
          query_text?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_queries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      search_results: {
        Row: {
          features_json: Json | null
          id: string
          query_id: string
          relevance_score: number | null
          symbol: string
          ts: string
          workspace_id: string
        }
        Insert: {
          features_json?: Json | null
          id?: string
          query_id: string
          relevance_score?: number | null
          symbol: string
          ts?: string
          workspace_id: string
        }
        Update: {
          features_json?: Json | null
          id?: string
          query_id?: string
          relevance_score?: number | null
          symbol?: string
          ts?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_results_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "search_queries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_results_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      strategies: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          owner_user_id: string | null
          params: Json
          updated_at: string
          version: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          name: string
          owner_user_id?: string | null
          params?: Json
          updated_at?: string
          version?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          owner_user_id?: string | null
          params?: Json
          updated_at?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_runs: {
        Row: {
          cfg: Json
          error_message: string | null
          run_id: string
          started_at: string | null
          status: string
          stopped_at: string | null
          strategy_id: string | null
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          cfg?: Json
          error_message?: string | null
          run_id?: string
          started_at?: string | null
          status: string
          stopped_at?: string | null
          strategy_id?: string | null
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          cfg?: Json
          error_message?: string | null
          run_id?: string
          started_at?: string | null
          status?: string
          stopped_at?: string | null
          strategy_id?: string | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_interval: string
          plan: Database["public"]["Enums"]["plan_tier"]
          renewal_date: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          billing_interval?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          renewal_date?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          billing_interval?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          renewal_date?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      suspicious_activity: {
        Row: {
          activity_type: string | null
          description: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          severity: number | null
          status: string | null
          ts: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          activity_type?: string | null
          description?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: number | null
          status?: string | null
          ts?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          activity_type?: string | null
          description?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: number | null
          status?: string | null
          ts?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suspicious_activity_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ui_layouts: {
        Row: {
          created_at: string | null
          id: string
          layout: Json
          name: string
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          layout: Json
          name: string
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          layout?: Json
          name?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      user_bid_profiles: {
        Row: {
          created_at: string
          demo_mode: boolean
          id: string
          last_updated: string
          profile_data: Json
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          demo_mode?: boolean
          id?: string
          last_updated?: string
          profile_data?: Json
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          demo_mode?: boolean
          id?: string
          last_updated?: string
          profile_data?: Json
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          id: string
          last_seen: string | null
          platform: string | null
          push_token: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          last_seen?: string | null
          platform?: string | null
          push_token?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          last_seen?: string | null
          platform?: string | null
          push_token?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_overrides: {
        Row: {
          key: string
          user_id: string
          value: Json
          workspace_id: string
        }
        Insert: {
          key: string
          user_id: string
          value: Json
          workspace_id: string
        }
        Update: {
          key?: string
          user_id?: string
          value?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_overrides_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_prefs: {
        Row: {
          created_at: string | null
          favored_assets: string[] | null
          horizon: string | null
          risk_profile: string | null
          teach_level: string | null
          updated_at: string | null
          user_id: string
          voice_enabled: boolean | null
          voice_rate: number | null
        }
        Insert: {
          created_at?: string | null
          favored_assets?: string[] | null
          horizon?: string | null
          risk_profile?: string | null
          teach_level?: string | null
          updated_at?: string | null
          user_id: string
          voice_enabled?: boolean | null
          voice_rate?: number | null
        }
        Update: {
          created_at?: string | null
          favored_assets?: string[] | null
          horizon?: string | null
          risk_profile?: string | null
          teach_level?: string | null
          updated_at?: string | null
          user_id?: string
          voice_enabled?: boolean | null
          voice_rate?: number | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          analyst_persona: string | null
          created_at: string | null
          data_sharing_opt_in: boolean | null
          notifications_email: boolean | null
          notifications_push: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string
          voice_profile: string | null
          workspace_default: string | null
        }
        Insert: {
          analyst_persona?: string | null
          created_at?: string | null
          data_sharing_opt_in?: boolean | null
          notifications_email?: boolean | null
          notifications_push?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
          voice_profile?: string | null
          workspace_default?: string | null
        }
        Update: {
          analyst_persona?: string | null
          created_at?: string | null
          data_sharing_opt_in?: boolean | null
          notifications_email?: boolean | null
          notifications_push?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
          voice_profile?: string | null
          workspace_default?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_workspace_default_fkey"
            columns: ["workspace_default"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_verifications: {
        Row: {
          accredited_investor: boolean | null
          aml_status: string | null
          created_at: string | null
          kyc_status: string | null
          last_checked: string | null
          provider: string | null
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          accredited_investor?: boolean | null
          aml_status?: string | null
          created_at?: string | null
          kyc_status?: string | null
          last_checked?: string | null
          provider?: string | null
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          accredited_investor?: boolean | null
          aml_status?: string | null
          created_at?: string | null
          kyc_status?: string | null
          last_checked?: string | null
          provider?: string | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_verifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_profiles: {
        Row: {
          name: string
          pitch: number | null
          speaking_rate: number | null
          tts_provider: string
          tts_voice_id: string
          workspace_id: string
        }
        Insert: {
          name: string
          pitch?: number | null
          speaking_rate?: number | null
          tts_provider: string
          tts_voice_id: string
          workspace_id: string
        }
        Update: {
          name?: string
          pitch?: number | null
          speaking_rate?: number | null
          tts_provider?: string
          tts_voice_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_entitlements: {
        Row: {
          enabled: boolean
          feature_code: string
          source: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          enabled?: boolean
          feature_code: string
          source?: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          enabled?: boolean
          feature_code?: string
          source?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_entitlements_feature_code_fkey"
            columns: ["feature_code"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "workspace_entitlements_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string | null
          safe_name: string | null
          updated_at: string
          wtype: Database["public"]["Enums"]["workspace_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string | null
          safe_name?: string | null
          updated_at?: string
          wtype?: Database["public"]["Enums"]["workspace_type"]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          safe_name?: string | null
          updated_at?: string
          wtype?: Database["public"]["Enums"]["workspace_type"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      create_workspace_safely: {
        Args: {
          p_name: string
          p_wtype: Database["public"]["Enums"]["workspace_type"]
        }
        Returns: string
      }
      ensure_default_entitlements: {
        Args: { p_workspace_id: string }
        Returns: undefined
      }
      fetch_candles: {
        Args: {
          _from: string
          _symbol: string
          _tf: string
          _to: string
          _ws: string
        }
        Returns: {
          c: number
          h: number
          l: number
          o: number
          ts: string
          v: number
          vwap: number
        }[]
      }
      gen_workspace_safe_name: {
        Args: {
          p_display: string
          p_name: string
          p_wtype: Database["public"]["Enums"]["workspace_type"]
        }
        Returns: string
      }
      get_risk_counter: {
        Args: { _day: string; _workspace_id: string }
        Returns: {
          day: string
          last_loss_at: string | null
          last_trade_at: string | null
          losses: number
          total_pnl: number
          trades: number
          wins: number
          workspace_id: string
        }
      }
      get_user_subscription_tier: {
        Args: { p_workspace_id: string }
        Returns: string
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      has_entitlement: {
        Args: { p_feature: string; p_workspace: string }
        Returns: boolean
      }
      has_tab_access: {
        Args: { p_tab_code: string; p_workspace_id: string }
        Returns: boolean
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      increment_trade_counter: {
        Args: { _is_loss: boolean; _pnl: number; _workspace_id: string }
        Returns: undefined
      }
      is_member_of_workspace: {
        Args: { w_id: string }
        Returns: boolean
      }
      is_owner_of_workspace: {
        Args: { w_id: string }
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      log_sync_event: {
        Args: {
          _actor: string
          _event_type: string
          _payload: Json
          _workspace_id: string
        }
        Returns: string
      }
      match_kb_chunks: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          created_at: string
          document: Json
          document_id: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      recorder_log: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_event_type: string
          p_payload: Json
          p_severity: number
          p_summary: string
          p_workspace: string
        }
        Returns: string
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      trigger_market_data_sync: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      validate_workspace_name: {
        Args: { p_name: string }
        Returns: boolean
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      plan_tier: "lite" | "standard" | "pro" | "elite"
      workspace_role: "owner" | "admin" | "member" | "viewer"
      workspace_type: "personal" | "business" | "team"
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
      plan_tier: ["lite", "standard", "pro", "elite"],
      workspace_role: ["owner", "admin", "member", "viewer"],
      workspace_type: ["personal", "business", "team"],
    },
  },
} as const
