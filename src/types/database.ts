export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          neq: string | null;
          business_number: string | null;
          fiscal_year_end_month: number;
          fiscal_year_end_day: number;
          incorporation_date: string | null;
          province: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['organizations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>;
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['organization_members']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['organization_members']['Insert']>;
      };
      receipts: {
        Row: {
          id: string;
          organization_id: string;
          uploaded_by: string;
          file_path: string;
          file_name: string;
          vendor: string | null;
          amount: number | null;
          currency: string;
          date: string | null;
          gst_amount: number | null;
          qst_amount: number | null;
          tax_number: string | null;
          category: string | null;
          description: string | null;
          status: 'pending' | 'verified' | 'rejected';
          ocr_data: Json | null;
          source: 'upload' | 'email' | 'drive';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['receipts']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['receipts']['Insert']>;
      };
      transactions: {
        Row: {
          id: string;
          organization_id: string;
          receipt_id: string | null;
          type: 'expense' | 'income' | 'dividend' | 'capital_gain' | 'interest';
          amount: number;
          currency: string;
          date: string;
          description: string;
          category: string;
          vendor: string | null;
          is_recurring: boolean;
          recurrence_frequency: 'monthly' | 'quarterly' | 'annually' | null;
          gst_amount: number | null;
          qst_amount: number | null;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>;
      };
      investments: {
        Row: {
          id: string;
          organization_id: string;
          symbol: string;
          name: string;
          type: 'stock' | 'etf' | 'bond' | 'gic' | 'mutual_fund' | 'other';
          shares: number;
          purchase_price: number;
          purchase_date: string;
          adjusted_cost_base: number;
          current_price: number | null;
          currency: string;
          account_type: string | null;
          notes: string | null;
          sold: boolean;
          sale_price: number | null;
          sale_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['investments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['investments']['Insert']>;
      };
      dividend_records: {
        Row: {
          id: string;
          organization_id: string;
          investment_id: string | null;
          amount: number;
          dividend_type: 'eligible' | 'non_eligible' | 'capital' | 'foreign';
          date: string;
          payer: string;
          currency: string;
          withholding_tax: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['dividend_records']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['dividend_records']['Insert']>;
      };
      tax_profiles: {
        Row: {
          id: string;
          organization_id: string;
          tax_year: number;
          corporation_type: 'ccpc' | 'general' | 'professional';
          small_business_limit: number;
          active_business_income: number;
          aggregate_investment_income: number;
          taxable_capital: number;
          rdtoh_eligible: number;
          rdtoh_non_eligible: number;
          grip_balance: number;
          cda_balance: number;
          federal_tax: number | null;
          provincial_tax: number | null;
          total_tax: number | null;
          installment_base: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tax_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['tax_profiles']['Insert']>;
      };
      government_forms: {
        Row: {
          id: string;
          organization_id: string;
          form_type: 't2' | 'co17' | 't5' | 'rl3' | 't5013' | 't106';
          tax_year: number;
          status: 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
          data: Json;
          file_path: string | null;
          submitted_at: string | null;
          confirmation_number: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['government_forms']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['government_forms']['Insert']>;
      };
      documents: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          file_path: string;
          file_type: string;
          size: number;
          source: 'upload' | 'drive' | 'generated';
          category: string | null;
          uploaded_by: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['documents']['Insert']>;
      };
      ai_conversations: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          messages: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ai_conversations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['ai_conversations']['Insert']>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
