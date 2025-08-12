import express from 'express'
import { clerkClient, isClerkConfigured } from '../config/clerk'
import { authenticateUser } from '../middleware/auth'
import { supabase } from '../config/supabase'

const router = express.Router()

// Complete onboarding and update user metadata
router.post('/complete', authenticateUser, async (req, res) => {
  try {
    const clerkId = req.user!.clerk_id
    
    if (!clerkId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { phoneNumber, mfdRegistrationNumber, calendlyUrl, calendlyApiKey } = req.body

    // Update Clerk user metadata (only if configured)
    if (isClerkConfigured()) {
      try {
        await clerkClient.users.updateUser(clerkId, {
          publicMetadata: {
            onboardingComplete: true,
            phoneNumber: phoneNumber || null,
            mfdRegistrationNumber: mfdRegistrationNumber || null,
            calendlyUrl: calendlyUrl || null,
            calendlyApiKey: calendlyApiKey || null,
          },
        })
        console.log('✅ Clerk metadata updated successfully')
      } catch (clerkError) {
        console.error('Clerk metadata update error:', clerkError)
        // Continue with database update even if Clerk fails
      }
    } else {
      console.log('⚠️ Clerk not configured, skipping metadata update')
    }

    // Update Supabase user data
    const { data: supabaseUser, error: supabaseError } = await supabase
      .from('users')
      .update({
        phone: phoneNumber || null,
        mfd_registration_number: mfdRegistrationNumber || null,
        updated_at: new Date().toISOString()
      })
      .eq('clerk_id', clerkId)
      .select()
      .single()

    if (supabaseError) {
      console.error('Supabase update error:', supabaseError)
      return res.status(500).json({ error: 'Failed to update user data' })
    }

    // Update or create user settings
    const { error: settingsError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: supabaseUser.id,
        calendly_url: calendlyUrl || null,
        calendly_api_key: calendlyApiKey || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (settingsError) {
      console.error('Settings update error:', settingsError)
      return res.status(500).json({ error: 'Failed to update user settings' })
    }

    return res.json({ 
      success: true, 
      message: 'Onboarding completed successfully',
      user: supabaseUser
    })

  } catch (error) {
    console.error('Onboarding completion error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Get onboarding status
router.get('/status', authenticateUser, async (req, res) => {
  try {
    const clerkId = req.user!.clerk_id
    
    if (!clerkId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get user from database to check onboarding status
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('phone, mfd_registration_number')
      .eq('clerk_id', clerkId)
      .single()

    if (userError) {
      console.error('User lookup error:', userError)
      return res.status(500).json({ error: 'Failed to fetch user data' })
    }

    // Check if user has completed onboarding by looking for required fields
    // For now, we'll consider onboarding complete if they have any of the required fields
    // In the future, this could be enhanced to check Clerk metadata as well
    const onboardingComplete = !!(userData.phone || userData.mfd_registration_number)
    
    return res.json({ 
      onboardingComplete,
      metadata: {
        phoneNumber: userData.phone,
        mfdRegistrationNumber: userData.mfd_registration_number
      }
    })

  } catch (error) {
    console.error('Onboarding status error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
