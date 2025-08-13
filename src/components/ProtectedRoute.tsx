import React, { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth as useClerkAuth } from '@clerk/clerk-react'
import { useAuth as useCustomAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isSignedIn, isLoaded } = useClerkAuth() // Using renamed Clerk hook
  const { user, isLoading } = useCustomAuth()
  const [loadingTimeout, setLoadingTimeout] = useState(false)

  // Add timeout to prevent infinite loading
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true)
      }, 15000) // 15 second timeout

      return () => clearTimeout(timer)
    } else {
      setLoadingTimeout(false)
    }
  }, [isLoading])

  // Show loading while Clerk and our auth context are loading
  if (!isLoaded || (isLoading && !loadingTimeout)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Show timeout message if loading takes too long
  if (loadingTimeout && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <div className="text-xl font-semibold text-gray-700">Loading is taking longer than expected</div>
        <div className="text-gray-500">Please check your connection and try refreshing the page</div>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh Page
        </button>
      </div>
    )
  }

  // Redirect to sign-in if not authenticated
  if (!isSignedIn || !user) {
    return <Navigate to="/auth" replace />
  }

  // User is authenticated and synced, render the protected content
  return <>{children}</>
}
