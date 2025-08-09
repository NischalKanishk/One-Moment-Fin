import React from 'react'
import { SignUp } from '@clerk/clerk-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from 'react-router-dom'

export default function Signup() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Join OneMFin
            </CardTitle>
            <CardDescription className="text-gray-600">
              Create your account to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SignUp 
              appearance={{
                elements: {
                  formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
                  card: 'shadow-none',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  socialButtonsBlockButton: 'bg-white border border-gray-300 hover:bg-gray-50',
                  formFieldInput: 'border border-gray-300 focus:border-blue-500 focus:ring-blue-500',
                  footerActionLink: 'text-blue-600 hover:text-blue-700'
                }
              }}
            />
            
            <div className="text-center pt-4">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/auth" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


