import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@/contexts/AuthContext'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

// Log environment variables (remove in production)
if (!supabaseUrl || !supabaseAnonKey) {
  }

// Create the base Supabase client (single instance)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Hook to get Supabase client with Clerk token
export const useSupabase = () => {
  const { user } = useAuth()
  
  // For now, return the base client
  // In the future, we can enhance this to use Clerk tokens
  return supabase
}

// Database types based on our schema
export interface User {
  id: string
  clerk_id: string
  full_name: string
  email: string
  phone?: string
  profile_image_url?: string
  auth_provider: string
  role: 'mfd' | 'admin'
  created_at: string
  updated_at: string

  referral_link?: string
  assessment_link?: string
}

export interface Lead {
  id: string
  user_id: string
  full_name: string
  email?: string
  phone?: string
  age?: number
  source_link?: string
  status: 'lead' | 'assessment_done' | 'meeting_scheduled' | 'converted' | 'dropped'
  created_at: string
  notes?: string
  meeting_id?: string
  risk_profile_id?: string

}

// Legacy interfaces (for backward compatibility)
export interface Assessment {
  id: string
  user_id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
}

export interface AssessmentQuestion {
  id: string
  assessment_id: string
  question_text: string
  type: 'mcq' | 'scale' | 'text'
  options?: any
  weight: number
  created_at: string
}

export interface RiskAssessment {
  id: string
  lead_id: string
  user_id: string
  assessment_id: string
  risk_score?: number
  risk_category?: 'low' | 'medium' | 'high'
  ai_used: boolean
  created_at: string
}

// New versioned JSON assessment interfaces
export interface AssessmentForm {
  id: string
  user_id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
  default_assessment_form_id?: string
}

export interface AssessmentFormVersion {
  id: string
  form_id: string
  version: number
  schema: any // JSON Schema
  ui?: any    // UI layout hints
  scoring?: any // Scoring configuration
  created_at: string
}

export interface LeadAssessmentAssignment {
  id: string
  user_id: string
  lead_id: string
  form_id: string
  version_id?: string
  created_at: string
}

export interface AssessmentSubmission {
  id: string
  user_id: string
  lead_id?: string
  form_id: string
  version_id: string
  filled_by: 'lead' | 'mfd'
  answers: any // Validated by schema
  score?: number
  risk_category?: 'low' | 'medium' | 'high'
  status: 'submitted' | 'approved' | 'rejected'
  review_reason?: string
  created_at: string
}

export interface AssessmentLink {
  id: string
  token: string
  user_id: string
  lead_id?: string
  form_id: string
  version_id?: string
  status: 'active' | 'submitted' | 'expired' | 'revoked'
  expires_at: string
  submitted_at?: string
  created_at: string
}

export interface ProductRecommendation {
  id: string
  user_id?: string
  risk_category: 'low' | 'medium' | 'high'
  title: string
  description?: string
  amc_name?: string
  product_type?: 'equity' | 'debt' | 'hybrid' | 'balanced'
  is_ai_generated: boolean
  visibility: 'public' | 'private'
  created_at: string
}

export interface Meeting {
  id: string
  user_id: string
  lead_id: string
  external_event_id?: string
  platform?: 'google'
  meeting_link?: string
  title?: string
  description?: string
  start_time?: string
  end_time?: string
  status: 'scheduled' | 'completed' | 'cancelled'
  is_synced: boolean
  created_at: string
}

export interface SubscriptionPlan {
  id: string
  name: string
  price_per_month?: number
  lead_limit?: number
  ai_enabled: boolean
  custom_form_enabled: boolean
  product_edit_enabled: boolean

  meeting_limit?: number
  created_at: string
}

export interface UserSubscription {
  id: string
  user_id: string
  subscription_plan_id: string
  start_date: string
  end_date?: string
  is_active: boolean
  payment_status: 'active' | 'trial' | 'failed'
  payment_provider?: string
  payment_ref_id?: string
  created_at: string
}

export interface AIFeedback {
  id: string;
  user_id: string;
  assessment_submission_id: string;
  product_ids?: any;
  rating: number;
  comment?: string;
  created_at: string;
}
