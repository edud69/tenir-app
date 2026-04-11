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
      bank_accounts: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          type: 'checking' | 'savings' | 'credit_card' | 'line_of_credit';
          institution: string | null;
          last_four: string | null;
          currency: string;
          current_balance: number;
          credit_limit: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bank_accounts']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['bank_accounts']['Insert']>;
      };
      transactions: {
        Row: {
          id: string;
          organization_id: string;
          receipt_id: string | null;
          account_id: string | null;
          linked_transaction_id: string | null;
          transfer_type: 'credit_card_payment' | 'account_advance' | 'transfer' | null;
          type: 'expense' | 'income' | 'dividend' | 'capital_gain' | 'interest' | 'transfer';
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
      entities: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          entity_type: 'corporation' | 'individual';
          neq: string | null;
          business_number: string | null;
          incorporation_date: string | null;
          province: string | null;
          corporation_type: 'ccpc' | 'general' | 'professional' | 'holding' | 'operating' | 'other' | null;
          sin_last4: string | null;
          is_shareholder: boolean;
          is_current_org: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['entities']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['entities']['Insert']>;
      };
      entity_relations: {
        Row: {
          id: string;
          organization_id: string;
          parent_entity_id: string;
          child_entity_id: string;
          ownership_percentage: number;
          share_class: string | null;
          num_shares: number | null;
          share_value: number | null;
          effective_date: string;
          end_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['entity_relations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['entity_relations']['Insert']>;
      };
      financial_flows: {
        Row: {
          id: string;
          organization_id: string;
          from_entity_id: string;
          to_entity_id: string;
          flow_type: 'dividend_eligible' | 'dividend_non_eligible' | 'dividend_capital' | 'shareholder_loan' | 'loan_repayment' | 'advance' | 'advance_repayment' | 'management_fee' | 'capital_contribution';
          amount: number;
          currency: string;
          date: string;
          fiscal_year: number | null;
          is_open_balance: boolean;
          outstanding_balance: number | null;
          interest_rate: number | null;
          due_date: string | null;
          rdtoh_refund_eligible: number | null;
          grip_impact: number | null;
          status: 'recorded' | 'confirmed' | 'overdue' | 'repaid' | 'cancelled';
          description: string | null;
          notes: string | null;
          document_ref: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['financial_flows']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['financial_flows']['Insert']>;
      };
      home_offices: {
        Row: {
          id: string;
          organization_id: string;
          label: string;
          office_type: 'registered_office' | 'secondary_establishment' | 'both';
          address: string;
          city: string;
          province: string;
          postal_code: string | null;
          tenure_type: 'tenant' | 'owner';
          total_area_sqft: number;
          office_area_sqft: number;
          start_date: string;
          end_date: string | null;
          months_used_per_year: number;
          is_active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['home_offices']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['home_offices']['Insert']>;
      };
      home_office_expenses: {
        Row: {
          id: string;
          home_office_id: string;
          organization_id: string;
          expense_type: 'rent' | 'mortgage_interest' | 'municipal_taxes' | 'school_taxes' | 'electricity' | 'gas' | 'home_insurance' | 'maintenance' | 'other';
          amount: number;
          currency: string;
          period_start: string;
          period_end: string;
          document_id: string | null;
          linked_transaction_id: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['home_office_expenses']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['home_office_expenses']['Insert']>;
      };
      home_office_documents: {
        Row: {
          id: string;
          home_office_id: string;
          organization_id: string;
          document_type: 'mortgage_statement' | 'lease_agreement' | 'sublease_agreement' | 'municipal_tax_bill' | 'school_tax_bill' | 'electricity_bill' | 'gas_bill' | 'insurance_policy' | 'floor_plan' | 'other';
          file_path: string;
          file_name: string;
          file_size: number | null;
          period_start: string | null;
          period_end: string | null;
          amount: number | null;
          description: string | null;
          uploaded_by: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['home_office_documents']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['home_office_documents']['Insert']>;
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
