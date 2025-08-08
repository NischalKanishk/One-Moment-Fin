import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with service role key for backend operations
// For now, use anon key if service role key is not available
export const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Log configuration for debugging
console.log('Supabase Configuration:');
console.log('- URL:', supabaseUrl);
console.log('- Service Role Key:', supabaseServiceKey ? 'Set' : 'Not set (using anon key)');
console.log('- Anon Key:', supabaseAnonKey ? 'Set' : 'Not set');

// Create public client for auth operations
export const supabasePublic = createClient(
  supabaseUrl,
  process.env.SUPABASE_ANON_KEY || ''
);

// Database types
export interface User {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  auth_provider: string;
  created_at: string;
  referral_link?: string;
  profile_image_url?: string;
  settings: Record<string, any>;
  role: 'mfd' | 'admin';
}

export interface Lead {
  id: string;
  user_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  age?: number;
  source_link?: string;
  status: 'lead' | 'assessment_done' | 'meeting_scheduled' | 'converted' | 'dropped';
  created_at: string;
  notes?: string;
  meeting_id?: string;
  risk_profile_id?: string;
  kyc_status: 'pending' | 'incomplete' | 'completed';
}

export interface Assessment {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface AssessmentQuestion {
  id: string;
  assessment_id: string;
  question_text: string;
  type: 'mcq' | 'scale' | 'text';
  options?: any;
  weight: number;
  created_at: string;
}

export interface RiskAssessment {
  id: string;
  lead_id: string;
  user_id: string;
  assessment_id: string;
  risk_score?: number;
  risk_category?: 'low' | 'medium' | 'high';
  ai_used: boolean;
  created_at: string;
}

export interface ProductRecommendation {
  id: string;
  user_id?: string;
  risk_category: 'low' | 'medium' | 'high';
  title: string;
  description?: string;
  amc_name?: string;
  product_type?: 'equity' | 'debt' | 'hybrid' | 'balanced';
  is_ai_generated: boolean;
  visibility: 'public' | 'private';
  created_at: string;
}

export interface Meeting {
  id: string;
  user_id: string;
  lead_id: string;
  external_event_id?: string;
  platform?: 'google' | 'calendly';
  meeting_link?: string;
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  is_synced: boolean;
  created_at: string;
}

export interface KYCStatus {
  id: string;
  lead_id: string;
  user_id: string;
  kyc_method?: 'manual_entry' | 'file_upload' | 'third_party_api';
  kyc_file_url?: string;
  form_data?: any;
  status: 'not_started' | 'in_progress' | 'submitted' | 'verified' | 'rejected';
  verified_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price_per_month?: number;
  lead_limit?: number;
  ai_enabled: boolean;
  custom_form_enabled: boolean;
  product_edit_enabled: boolean;
  kyc_enabled: boolean;
  meeting_limit?: number;
  created_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  subscription_plan_id: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  payment_status: 'active' | 'trial' | 'failed';
  payment_provider?: string;
  payment_ref_id?: string;
  created_at: string;
}

export interface AIFeedback {
  id: string;
  user_id: string;
  risk_assessment_id: string;
  product_ids?: any;
  rating: number;
  comment?: string;
  created_at: string;
}
