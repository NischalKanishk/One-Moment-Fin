import React, { createContext, useContext, useEffect, useState } from 'react'
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react'
import { User } from '@/lib/supabase'
import { ClerkSupabaseSync } from '@/lib/clerk-supabase-sync'
import { createAuthenticatedSupabaseClient, getClerkTokenForSupabase } from '@/lib/clerk-jwt-config'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  syncUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser()
  const { isSignedIn, getToken } = useClerkAuth()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const syncUser = async () => {
    if (!clerkUser || !isSignedIn) {
      console.log('🔄 No Clerk user or not signed in, clearing user state')
      setUser(null)
      setIsLoading(false)
      return
    }

    try {
      console.log('🔄 Starting user sync process...')
      console.log('👤 Clerk user:', {
        id: clerkUser.id,
        email: clerkUser.emailAddresses?.[0]?.emailAddress,
        name: `${clerkUser.firstName} ${clerkUser.lastName}`
      })
      
      setIsLoading(true)

      // Get Clerk JWT token for Supabase
      console.log('🔑 Getting Clerk JWT token for Supabase...')
      let clerkToken: string | null = null
      
      try {
        clerkToken = await getToken({ template: 'supabase' })
        console.log('✅ Got Clerk JWT token for Supabase')
      } catch (tokenError) {
        console.error('❌ Failed to get Clerk JWT token:', tokenError)
        console.log('💡 Make sure you have a JWT template named "supabase" in Clerk Dashboard')
        throw new Error('No Clerk JWT token available')
      }
      
      if (!clerkToken) {
        console.error('❌ Clerk JWT token is null or empty')
        console.log('💡 Check your Clerk JWT template configuration')
        throw new Error('No Clerk JWT token available')
      }
      
      // Log token details for debugging (remove in production)
      try {
        const tokenParts = clerkToken.split('.')
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]))
          console.log('🔍 JWT Token payload:', {
            sub: payload.sub,
            aud: payload.aud,
            role: payload.role,
            exp: new Date(payload.exp * 1000).toISOString()
          })
        }
      } catch (decodeError) {
        console.log('⚠️ Could not decode JWT token (this is normal)')
      }

      // Create authenticated Supabase client
      const authenticatedSupabase = createAuthenticatedSupabaseClient(clerkToken)

      // Convert Clerk user to our format for sync
      const clerkUserData = {
        id: clerkUser.id,
        emailAddresses: clerkUser.emailAddresses || [],
        phoneNumbers: clerkUser.phoneNumbers || [],
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
        createdAt: new Date(clerkUser.createdAt)
      }

      console.log('📋 Converted Clerk user data:', clerkUserData)

      // Sync user with Supabase using our ClerkSupabaseSync class
      console.log('🚀 Calling ClerkSupabaseSync.syncUserToSupabase...')
      const supabaseUser = await ClerkSupabaseSync.syncUserToSupabase(clerkUserData, authenticatedSupabase)

      if (supabaseUser) {
        console.log('✅ User synced successfully with Supabase:', supabaseUser.id)
        setUser(supabaseUser)
      } else {
        console.error('❌ Failed to sync user with Supabase')
        // Fallback to Clerk data if sync fails
        console.log('🔄 Falling back to Clerk user data...')
        const fallbackUser: User = {
          id: clerkUser.id,
          clerk_id: clerkUser.id,
          full_name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
          email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
          phone: clerkUser.phoneNumbers?.[0]?.phoneNumber || '',
          profile_image_url: clerkUser.imageUrl || '',
          auth_provider: 'clerk',
          role: 'mfd',
          created_at: new Date(clerkUser.createdAt).toISOString(),
          updated_at: new Date().toISOString(),
          settings: {},
          referral_link: undefined
        }
        console.log('📋 Fallback user data:', fallbackUser)
        setUser(fallbackUser)
      }
    } catch (error) {
      console.error('❌ Error syncing user:', error)
      
      // Provide helpful error messages
      if (error instanceof Error) {
        if (error.message.includes('JWT token')) {
          console.log('💡 JWT Token Issue: Check your Clerk JWT template configuration')
          console.log('   - Template name should be "supabase"')
          console.log('   - Claims should be minimal: {"aud": "authenticated", "role": "authenticated"}')
        } else if (error.message.includes('RLS')) {
          console.log('💡 RLS Issue: Check your Supabase RLS policies')
          console.log('   - Run the fix-rls-policies.sql script')
          console.log('   - Ensure get_current_user_clerk_id() function exists')
        }
      }
      
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Sync user when Clerk user changes
  useEffect(() => {
    if (clerkLoaded) {
      if (clerkUser && isSignedIn) {
        syncUser()
      } else {
        setUser(null)
        setIsLoading(false)
      }
    }
  }, [clerkLoaded, clerkUser, isSignedIn])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user && isSignedIn,
    syncUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
