import React, { createContext, useContext, useEffect, useState } from 'react'
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react'
import { User } from '@/lib/supabase'

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
  const { isSignedIn } = useClerkAuth()
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
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('User sync timeout')), 10000) // 10 second timeout
      })
      


      // For now, let's use the Clerk user data directly without Supabase sync
      // This will allow the Dashboard to open while we fix the Supabase integration
      const userData: User = {
        id: clerkUser.id,
        clerk_id: clerkUser.id,
        full_name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
        email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
        phone: clerkUser.phoneNumbers?.[0]?.phoneNumber || '',
        profile_image_url: clerkUser.imageUrl || '',
        auth_provider: 'clerk',
        role: 'mfd', // Default to 'mfd' role
        created_at: new Date(clerkUser.createdAt).toISOString(),
        updated_at: new Date().toISOString(),
        settings: {},
        referral_link: undefined
      }
      
      setUser(userData)
    } catch (error) {
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
