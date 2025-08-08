import { supabase } from './supabase'

export async function testSupabaseConnection() {
  try {
    // Test basic connection by fetching subscription plans
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .limit(1)

    if (error) {
      console.error('Supabase connection error:', error)
      return false
    }

    console.log('✅ Supabase connection successful!')
    console.log('Sample data:', data)
    return true
  } catch (error) {
    console.error('❌ Supabase connection failed:', error)
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
