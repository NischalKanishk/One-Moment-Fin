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
      setUser(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)

      // Get Clerk JWT token for Supabase
      let clerkToken: string | null = null
      
      try {
        clerkToken = await getToken({ template: 'supabase' })
      } catch (tokenError) {
        console.error('Failed to get Clerk JWT token:', tokenError)
        throw new Error('No Clerk JWT token available')
      }
      
      if (!clerkToken) {
        console.error('Clerk JWT token is null or empty')
        throw new Error('No Clerk JWT token available')
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

      // Sync user with Supabase using our ClerkSupabaseSync class
      const supabaseUser = await ClerkSupabaseSync.syncUserToSupabase(clerkUserData, authenticatedSupabase)

      if (supabaseUser) {
        setUser(supabaseUser)
      } else {
        // Fallback to Clerk data if sync fails
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
        setUser(fallbackUser)
      }
    } catch (error) {
      console.error('Error syncing user:', error)
      
      // Provide helpful error messages
      if (error instanceof Error) {
        if (error.message.includes('JWT token')) {
          console.log('JWT Token Issue: Check your Clerk JWT template configuration')
        } else if (error.message.includes('RLS')) {
          console.log('RLS Issue: Check your Supabase RLS policies')
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
