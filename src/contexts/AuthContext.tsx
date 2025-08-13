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
  disableSync: () => void
  enableSync: () => void
  getToken: () => Promise<string | null>
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
  const { isSignedIn, getToken: getClerkToken } = useClerkAuth()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [syncDisabled, setSyncDisabled] = useState(false)

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
        clerkToken = await getClerkToken({ template: 'supabase' })
        console.log('🔍 AuthContext: Got JWT token with supabase template')
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
      console.log('🔍 AuthContext: Starting user sync with Supabase...')
      const supabaseUser = await ClerkSupabaseSync.syncUserToSupabase(clerkUserData, authenticatedSupabase)

      if (supabaseUser) {
        console.log('🔍 AuthContext: Sync successful, setting user from Supabase:', supabaseUser)
        setUser(supabaseUser)
      } else {
        console.log('🔍 AuthContext: Sync failed, using fallback Clerk data')
        
        // Fallback to Clerk data if sync fails
        const firstName = clerkUser.firstName || clerkUser.fullName?.split(' ')[0] || '';
        const lastName = clerkUser.lastName || clerkUser.fullName?.split(' ').slice(1).join(' ') || '';
        const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'User';
        
        const email = clerkUser.emailAddresses?.[0]?.emailAddress || 
                     clerkUser.primaryEmailAddress?.emailAddress || 
                     '';
        
        const phone = clerkUser.phoneNumbers?.[0]?.phoneNumber || 
                     clerkUser.primaryPhoneNumber?.phoneNumber || 
                     '';

        const fallbackUser: User = {
          id: clerkUser.id,
          clerk_id: clerkUser.id,
          full_name: fullName,
          email: email,
          phone: phone,
          profile_image_url: clerkUser.imageUrl || '',
          auth_provider: 'clerk',
          role: 'mfd',
          created_at: new Date(clerkUser.createdAt).toISOString(),
          updated_at: new Date().toISOString(),
          settings: {},
          referral_link: undefined
        }

        console.log('🔍 AuthContext: Using fallback user data:', fallbackUser)
        setUser(fallbackUser)
      }

    } catch (error) {
      console.error('Error syncing user:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Sync user when Clerk user changes
  useEffect(() => {
    if (clerkLoaded && !syncDisabled) {
      if (clerkUser && isSignedIn) {
        syncUser()
      } else {
        setUser(null)
        setIsLoading(false)
      }
    }
  }, [clerkLoaded, clerkUser, isSignedIn, syncDisabled])

  const disableSync = () => {
    console.log('🔍 AuthContext: Sync disabled');
    setSyncDisabled(true);
  }

  const enableSync = () => {
    console.log('🔍 AuthContext: Sync enabled');
    setSyncDisabled(false);
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user && isSignedIn,
    syncUser,
    getToken: async () => {
      try {
        if (!isSignedIn) return null;
        // Get a regular Clerk JWT token (not Supabase-specific)
        return await getClerkToken();
      } catch (error) {
        console.error('Error getting token:', error);
        return null;
      }
    }
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
