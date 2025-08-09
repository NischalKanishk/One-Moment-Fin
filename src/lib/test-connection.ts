import { supabase } from './supabase'
import { createAuthenticatedSupabaseClient } from './clerk-jwt-config'

export async function testSupabaseConnection() {
  try {
    if (!supabase) {
      console.warn('Skipping Supabase test: client not configured')
      return false
    }
    
    console.log('🔍 Testing anonymous Supabase connection...')
    
    // Test basic connection by fetching subscription plans (should work with anon key)
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Supabase connection error:', error)
      return false
    }

    console.log('✅ Supabase connection successful!')
    console.log('Sample data:', data)
    
    // Test users table access (should fail with anon key due to RLS)
    console.log('🔍 Testing users table access with anon key...')
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (userError) {
      console.log('✅ Expected error with anon key (RLS working):', userError.message)
    } else {
      console.log('⚠️ Unexpected success with anon key - RLS might not be working')
    }
    
    return true
  } catch (error) {
    console.error('❌ Supabase connection failed:', error)
    return false
  }
}

export async function testAuthenticatedConnection(clerkToken: string) {
  try {
    console.log('🔍 Testing authenticated Supabase connection...')
    
    const authenticatedSupabase = createAuthenticatedSupabaseClient(clerkToken)
    
    // Test users table access with JWT token
    const { data: userData, error: userError } = await authenticatedSupabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (userError) {
      console.error('❌ Authenticated access failed:', userError)
      return false
    }
    
    console.log('✅ Authenticated access successful!')
    console.log('User data:', userData)
    return true
  } catch (error) {
    console.error('❌ Authenticated connection failed:', error)
    return false
  }
}

// Test function that can be called from browser console
export function testConnection() {
  testSupabaseConnection().then(success => {
    if (success) {
      console.log('🎉 Database is ready!')
    } else {
      console.log('💥 Database connection failed. Check your environment variables.')
    }
  })
}

// Test authenticated connection
export function testAuthConnection(token: string) {
  testAuthenticatedConnection(token).then(success => {
    if (success) {
      console.log('🎉 Authenticated connection working!')
    } else {
      console.log('💥 Authenticated connection failed. Check JWT token and RLS policies.')
    }
  })
}
