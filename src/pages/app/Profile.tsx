import { Helmet } from "react-helmet-async";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useAuth as useCustomAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { authAPI } from "@/lib/api";


export default function Profile() {
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const { isLoading } = useCustomAuth(); // Only use isLoading, not user
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    phone: '',
    mfd_registration_number: '',
    referral_link: ''
  });
  const [originalData, setOriginalData] = useState({
    full_name: '',
    phone: '',
    mfd_registration_number: ''
  });
  const [countryCode, setCountryCode] = useState('+91');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Fetch profile data from database when component mounts
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!clerkUser) return;
      
      try {
        setIsLoadingProfile(true);
        const token = await getToken();
        if (!token) {
          console.log('🔍 No token available yet, waiting...');
          return; // Don't throw error, just wait for token
        }
        
        // Fetch current profile data from database
        const result = await authAPI.getProfileWithToken(token);
        const dbUser = result.user;
        
        console.log('🔍 Fetched profile data from database:', dbUser);
        
        // Store the user ID to prevent unnecessary re-fetches
        setCurrentUserId(dbUser.clerk_id);
        
        // Extract country code and phone number from stored phone
        let phoneNumber = dbUser.phone || '';
        let extractedCountryCode = '+91';
        
        if (phoneNumber && phoneNumber.startsWith('+91')) {
          phoneNumber = phoneNumber.substring(3);
          extractedCountryCode = '+91';
        } else if (phoneNumber && phoneNumber.startsWith('+')) {
          // Handle other country codes if they exist
          const match = phoneNumber.match(/^\+(\d+)/);
          if (match) {
            extractedCountryCode = `+${match[1]}`;
            phoneNumber = phoneNumber.substring(match[0].length);
          }
        }
        
        setCountryCode(extractedCountryCode);
        const newProfileData = {
          full_name: dbUser.full_name || '',
          email: dbUser.email || '',
          phone: phoneNumber,
          mfd_registration_number: dbUser.mfd_registration_number || '',
          referral_link: dbUser.referral_link || ''
        };
        
        setProfileData(newProfileData);
        setOriginalData({
          full_name: dbUser.full_name || '',
          phone: phoneNumber,
          mfd_registration_number: dbUser.mfd_registration_number || ''
        });
        
        console.log('🔍 Profile data loaded from database:', newProfileData);
      } catch (error) {
        console.error('Failed to fetch profile data:', error);
        toast.error('Failed to load profile data. Please refresh the page.');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    // Only fetch once when clerkUser is available
    if (clerkUser && !currentUserId) {
      fetchProfileData();
    }
  }, [clerkUser, getToken, currentUserId]);



  // Check if form has changes
  const hasChanges = () => {
    return profileData.full_name !== originalData.full_name || 
           profileData.phone !== originalData.phone ||
           profileData.mfd_registration_number !== originalData.mfd_registration_number;
  };



  // Validate form data
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    // Full name validation
    if (!profileData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    } else if (profileData.full_name.length > 200) {
      newErrors.full_name = 'Full name cannot exceed 200 characters';
    }
    
    // Phone validation
    if (profileData.phone && profileData.phone.length !== 10) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSave = async () => {
    if (!validateForm()) return;
    
    setIsSaving(true);
    try {
      console.log('🔍 Starting profile update...');
      console.log('Profile data to update:', profileData);
      
      // Get phone number
      const fullPhoneNumber = profileData.phone ? `${countryCode}${profileData.phone}` : '';
      console.log('Full phone number:', fullPhoneNumber);
      
      // Get JWT token - use default token since supabase template may not be configured
      let token = null;
      
      try {
        // Try to get the default Clerk token
        token = await getToken();
        console.log('✅ Got default Clerk token');
      } catch (tokenError) {
        console.error('❌ Failed to get Clerk token:', tokenError);
        throw new Error('Failed to generate authentication token. Please try signing out and signing back in.');
      }
      
      if (!token) {
        throw new Error('Failed to generate authentication token');
      }
      
      console.log('✅ JWT token obtained, length:', token.length);
      
      // Call the API to update the profile
      const result = await authAPI.updateProfileWithToken(token, {
        full_name: profileData.full_name.trim(),
        phone: fullPhoneNumber,
        mfd_registration_number: profileData.mfd_registration_number.trim()
      });
      
      console.log('✅ Profile update API call successful');
      
      // Update local state with the response data
      const updatedUser = result.user;
      
      // Extract phone number without country code for display
      let displayPhone = '';
      if (updatedUser.phone && updatedUser.phone !== null) {
        if (updatedUser.phone.startsWith('+91')) {
          displayPhone = updatedUser.phone.substring(3);
        } else if (updatedUser.phone.startsWith('+')) {
          const match = updatedUser.phone.match(/^\+(\d+)/);
          if (match) {
            displayPhone = updatedUser.phone.substring(match[0].length);
          }
        } else {
          displayPhone = updatedUser.phone;
        }
      } else {
        // Phone is null or undefined, set to empty string for display
        displayPhone = '';
      }
      
      // Update profile data with the response from backend
      const newProfileData = {
        ...profileData,
        full_name: updatedUser.full_name || '',
        phone: displayPhone,
        mfd_registration_number: updatedUser.mfd_registration_number || ''
      };
      
      // Update profileData with the response from backend
      setProfileData(newProfileData);
      
      // Refresh the profile data from database to ensure we have the latest data
      try {
        const refreshedResult = await authAPI.getProfileWithToken(token);
        const refreshedUser = refreshedResult.user;
        
        console.log('🔍 Refreshed profile data from database:', refreshedUser);
        
        // Extract phone number without country code for display
        let refreshedDisplayPhone = '';
        if (refreshedUser.phone && refreshedUser.phone !== null) {
          if (refreshedUser.phone.startsWith('+91')) {
            refreshedDisplayPhone = refreshedUser.phone.substring(3);
          } else if (refreshedUser.phone.startsWith('+')) {
            const match = refreshedUser.phone.match(/^\+(\d+)/);
            if (match) {
              refreshedDisplayPhone = refreshedUser.phone.substring(match[0].length);
            }
          } else {
            refreshedDisplayPhone = refreshedUser.phone;
          }
        }
        
        // Update both profile data and original data with the refreshed data
        const refreshedProfileData = {
          ...profileData,
          full_name: refreshedUser.full_name || '',
          phone: refreshedDisplayPhone
        };
        
        setProfileData(refreshedProfileData);
        setOriginalData({
          full_name: refreshedUser.full_name || '',
          phone: refreshedDisplayPhone
        });
        
        console.log('🔍 Profile data refreshed and updated:', refreshedProfileData);
      } catch (refreshError) {
        console.error('Failed to refresh profile data:', refreshError);
        // If refresh fails, still show success but log the error
      }
      
      toast.success('Profile updated successfully!');
      
    } catch (error) {
      console.error('Profile update error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Update failed';
      if (error instanceof Error) {
        if (error.message.includes('authentication')) {
          errorMessage = 'Authentication failed. Please try signing out and signing back in.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('validation')) {
          errorMessage = 'Please check your input and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(profileData.referral_link);
    toast.success("Referral link copied to clipboard!");
  };

  if (isLoading || isLoadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Helmet>
        <title>Profile – OneMFin</title>
        <meta name="description" content="Manage your profile information and personal details." />
        <link rel="canonical" href="/app/profile" />
      </Helmet>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

              {/* Profile Form */}
        <div className="space-y-6">
          {hasChanges() && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <p className="text-sm text-blue-700 font-medium">You have unsaved changes</p>
              </div>
            </div>
          )}
        
        <div className="space-y-6">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name" className="text-base font-medium">Full Name</Label>
            <Input 
              id="full_name"
              placeholder="Enter your full name" 
              value={profileData.full_name}
              onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
              maxLength={200}
              className="h-11 text-base"
            />
            <div className="flex justify-between items-center">
              {errors.full_name && <p className="text-sm text-red-500">{errors.full_name}</p>}
              <p className="text-sm text-muted-foreground ml-auto">
                {profileData.full_name.length}/200
              </p>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base font-medium">Email</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Input 
                    id="email"
                    placeholder="Email address" 
                    value={profileData.email}
                    readOnly
                    className="bg-muted cursor-not-allowed opacity-75 hover:opacity-100 transition-opacity h-11 text-base"
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-center">Cannot change email. To use different mail, sign up with different mail</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <p className="text-sm text-muted-foreground">Email address cannot be modified</p>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-base font-medium">Phone</Label>
            <div className="flex gap-3">
              <div className="w-24">
                <Input 
                  value={countryCode}
                  readOnly
                  className="bg-muted text-center font-medium h-11 text-base"
                />
              </div>
              <Input 
                id="phone"
                placeholder="Enter phone number" 
                value={profileData.phone}
                onChange={(e) => {
                  // Only allow numbers
                  const value = e.target.value.replace(/\D/g, '');
                  // Limit to 10 digits (typical for Indian phone numbers)
                  if (value.length <= 10) {
                    setProfileData(prev => ({ ...prev, phone: value }));
                  }
                }}
                className="flex-1 h-11 text-base"
                maxLength={10}
              />
            </div>
            <div className="flex justify-between items-center">
              {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
              <p className="text-sm text-muted-foreground ml-auto">
                {profileData.phone.length}/10 digits
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Enter 10-digit phone number without country code</p>
          </div>

          {/* MFD Registration Number */}
          <div className="space-y-2">
            <Label htmlFor="mfd_registration_number" className="text-base font-medium">MFD Registration Number</Label>
            <Input 
              id="mfd_registration_number"
              placeholder="Enter your SEBI MFD registration number" 
              value={profileData.mfd_registration_number}
              onChange={(e) => setProfileData(prev => ({ ...prev, mfd_registration_number: e.target.value }))}
              className="h-11 text-base"
              maxLength={50}
            />
            <p className="text-sm text-muted-foreground">Your SEBI MFD registration number for compliance and verification</p>
          </div>

          {/* Referral Link */}
          <div className="space-y-2">
            <Label htmlFor="referral_link" className="text-base font-medium">Referral Link</Label>
            <div className="flex gap-3">
              <Input 
                id="referral_link"
                placeholder="Referral Link" 
                value={profileData.referral_link} 
                readOnly 
                className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 font-mono text-sm shadow-sm hover:shadow-md transition-shadow duration-200 h-11 text-base"
              />
              <Button 
                variant="outline" 
                onClick={copyReferralLink} 
                className="hover:bg-blue-50 hover:border-blue-300 transition-colors h-11 px-6"
              >
                Copy
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Share this link to refer new users to the platform</p>
          </div>
        </div>
        
        {/* Save Button */}
        <div className="pt-4 space-y-3">
          <Button 
            variant="cta" 
            onClick={handleProfileSave}
            disabled={isSaving || !hasChanges()}
            className={`h-11 px-8 text-base ${!hasChanges() ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          

        </div>
      </div>
    </div>
  );
}
