import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useAuth as useCustomAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { createAuthenticatedApi, authAPI } from "@/lib/api";
import { useSettings } from "@/hooks/use-settings";

export default function Settings(){
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const { user, isLoading, syncUser } = useCustomAuth();
  const { settings, saveSettings, removeCalendlySettings, hasCalendlyConfig } = useSettings();
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    phone: '',
    referral_link: ''
  });
  const [originalData, setOriginalData] = useState({
    full_name: '',
    phone: ''
  });
  const [countryCode, setCountryCode] = useState('+91');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [calendlyData, setCalendlyData] = useState({
    calendly_url: '',
    calendly_api_key: ''
  });
  const [isSavingCalendly, setIsSavingCalendly] = useState(false);

  // Pre-fill profile data when user loads
  useEffect(() => {
    if (user) {
      // Extract country code and phone number from stored phone
      let phoneNumber = user.phone || '';
      let extractedCountryCode = '+91';
      
      if (phoneNumber.startsWith('+91')) {
        phoneNumber = phoneNumber.substring(3);
        extractedCountryCode = '+91';
      } else if (phoneNumber.startsWith('+')) {
        // Handle other country codes if they exist
        const match = phoneNumber.match(/^\+(\d+)/);
        if (match) {
          extractedCountryCode = `+${match[1]}`;
          phoneNumber = phoneNumber.substring(match[0].length);
        }
      }
      
      setCountryCode(extractedCountryCode);
      const newProfileData = {
        full_name: user.full_name || '',
        email: user.email || '',
        phone: phoneNumber,
        referral_link: user.referral_link || ''
      };
      setProfileData(newProfileData);
      setOriginalData({
        full_name: user.full_name || '',
        phone: phoneNumber
      });
    }
  }, [user]);

  // Pre-fill Calendly data when settings load
  useEffect(() => {
    if (settings) {
      setCalendlyData({
        calendly_url: settings.calendly_url || '',
        calendly_api_key: settings.calendly_api_key || ''
      });
    }
  }, [settings]);

  // Check if form has changes
  const hasChanges = () => {
    return profileData.full_name !== originalData.full_name || 
           profileData.phone !== originalData.phone;
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

  // Debug function to test JWT token
  const testJWTToken = async () => {
    try {
      console.log('🔍 Testing JWT token generation...');
      
      const token = await getToken({ template: 'supabase' });
      
      if (token) {
        console.log('✅ JWT token generated successfully!');
        console.log('Token length:', token.length);
        console.log('Token preview:', token.substring(0, 50) + '...');
        
        // Decode the JWT to see the payload
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('JWT Payload:', payload);
        } catch (e) {
          console.log('Could not decode JWT payload');
        }
        
        toast.success('JWT token generated successfully! Check console for details.');
        return token;
      } else {
        console.error('❌ JWT token is null or undefined');
        toast.error('JWT token is null or undefined');
        return null;
      }
    } catch (error) {
      console.error('❌ Error generating JWT token:', error);
      toast.error('JWT token generation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      return null;
    }
  };

  const handleProfileSave = async () => {
    if (!validateForm()) return;
    
    setIsSaving(true);
    try {
      if (!clerkUser) throw new Error('User not authenticated');
      
      console.log('🔍 Starting profile update...');
      console.log('Profile data to update:', profileData);
      
      const fullPhoneNumber = profileData.phone ? `${countryCode}${profileData.phone}` : '';
      
      console.log('Full phone number:', fullPhoneNumber);
      
      // Test JWT token first
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('Failed to generate JWT token');
      }
      
      console.log('✅ JWT token obtained, length:', token.length);
      
      // Use the centralized API function with authentication
      const result = await authAPI.updateProfileWithToken(token, {
        full_name: profileData.full_name.trim(),
        phone: fullPhoneNumber
      });
      
      console.log('✅ Profile update API call successful:', result);
      
      // Update local state with the response data
      const updatedUser = result.user;
      
      // Extract phone number without country code for display
      let displayPhone = '';
      if (updatedUser.phone) {
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
      }
      
      // Update both profile data and original data to prevent "unsaved changes" indicator
      setProfileData(prev => ({
        ...prev,
        full_name: updatedUser.full_name || '',
        phone: displayPhone
      }));
      
      setOriginalData({
        full_name: updatedUser.full_name || '',
        phone: displayPhone
      });
      
      // Sync user data in context to update global state
      await syncUser();
      
      toast.success('Profile updated successfully!');
      
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(profileData.referral_link);
    toast.success("Referral link copied to clipboard!");
  };

  const validateCalendlyData = () => {
    const newErrors: {[key: string]: string} = {};
    
    // URL validation
    if (!calendlyData.calendly_url.trim()) {
      newErrors.calendly_url = 'Calendly URL is required';
    } else if (!calendlyData.calendly_url.startsWith('https://calendly.com/')) {
      newErrors.calendly_url = 'Calendly URL must start with https://calendly.com/';
    }
    
    // API key validation - Calendly uses JWT tokens
    if (!calendlyData.calendly_api_key.trim()) {
      newErrors.calendly_api_key = 'Calendly API key is required';
    } else if (calendlyData.calendly_api_key.trim().length < 100) {
      newErrors.calendly_api_key = 'Calendly API key appears to be too short. Please check your API key.';
    }
    
    return newErrors;
  };

  const handleCalendlySave = async () => {
    const validationErrors = validateCalendlyData();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSavingCalendly(true);
    try {
      const success = await saveSettings({
        calendly_url: calendlyData.calendly_url.trim(),
        calendly_api_key: calendlyData.calendly_api_key.trim()
      });

      if (success) {
        toast.success('Calendly settings saved and validated successfully!');
        setErrors({}); // Clear any previous errors
      }
    } finally {
      setIsSavingCalendly(false);
    }
  };

  const handleRemoveCalendly = async () => {
    if (confirm('Are you sure you want to remove Calendly configuration? This will disable meeting scheduling.')) {
      const success = await removeCalendlySettings();
      if (success) {
        setCalendlyData({ calendly_url: '', calendly_api_key: '' });
      }
    }
  };

  if (isLoading) {
    return <div className="space-y-4">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <Helmet>
        <title>Settings – OneMFin</title>
        <meta name="description" content="Subscription, billing, team and integrations." />
        <link rel="canonical" href="/app/settings" />
      </Helmet>

      <Tabs defaultValue="calendly">
        <TabsList className="w-full md:w-auto overflow-auto">
          <TabsTrigger value="calendly">Calendly</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="preferences" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch id="ai-score" defaultChecked />
              <Label htmlFor="ai-score">AI scoring</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="notif-email" defaultChecked />
              <Label htmlFor="notif-email">Email notifications</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="notif-wa" />
              <Label htmlFor="notif-wa">WhatsApp notifications</Label>
            </div>
            <Input placeholder="Default Risk Form" />
            <Button variant="cta">Save Preferences</Button>
          </div>
        </TabsContent>

        <TabsContent value="calendly" className="space-y-4">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Calendly Integration</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure your Calendly account to enable meeting scheduling. Both URL and API key are required.
              </p>
              
              {/* Help Information */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                      How to get your Calendly API key
                    </h4>
                    <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>1. Log in to your <a href="https://calendly.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">Calendly account</a></li>
                      <li>2. Go to "Integrations" → "API & Webhooks"</li>
                      <li>3. Click "Generate New API Key"</li>
                      <li>4. Copy the JWT token (long string starting with "eyJ...")</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="calendly-url">Calendly URL</Label>
                <Input
                  id="calendly-url"
                  type="url"
                  placeholder="https://calendly.com/your-username"
                  value={calendlyData.calendly_url}
                  onChange={(e) => {
                    setCalendlyData(prev => ({ ...prev, calendly_url: e.target.value }));
                    if (errors.calendly_url) {
                      setErrors(prev => ({ ...prev, calendly_url: '' }));
                    }
                  }}
                  className={errors.calendly_url ? 'border-red-500' : ''}
                />
                {errors.calendly_url && (
                  <p className="text-xs text-red-500 mt-1">{errors.calendly_url}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Your Calendly scheduling page URL
                </p>
              </div>

              <div>
                <Label htmlFor="calendly-api-key">Calendly API Key</Label>
                                <Input
                  id="calendly-api-key"
                  type="password"
                  placeholder="Enter your Calendly API key"
                  value={calendlyData.calendly_api_key}
                  onChange={(e) => {
                    setCalendlyData(prev => ({ ...prev, calendly_api_key: e.target.value }));
                    if (errors.calendly_api_key) {
                      setErrors(prev => ({ ...prev, calendly_api_key: '' }));
                    }
                  }}
                  className={errors.calendly_api_key ? 'border-red-500' : ''}
                />
                {errors.calendly_api_key && (
                  <p className="text-xs text-red-500 mt-1">{errors.calendly_api_key}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Your Calendly API key (JWT token from Calendly dashboard)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button 
                  onClick={handleCalendlySave} 
                  disabled={isSavingCalendly}
                  variant="cta"
                  className="min-w-[180px]"
                >
                  {isSavingCalendly ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Validating & Saving...
                    </>
                  ) : (
                    'Save Calendly Settings'
                  )}
                </Button>
                
                {hasCalendlyConfig && (
                  <Button 
                    onClick={handleRemoveCalendly} 
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove Configuration
                  </Button>
                )}
              </div>

              {hasCalendlyConfig && (
                <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                        Calendly Integration Active
                      </h4>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Your Calendly integration is configured and working. You can now schedule meetings from the Meetings page.
                      </p>
                      <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                        URL: {settings?.calendly_url}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <div className="flex items-center gap-3"><Switch id="ai-score" defaultChecked /><label htmlFor="ai-score">AI scoring</label></div>
          <div className="flex items-center gap-3"><Switch id="notif-email" defaultChecked /><label htmlFor="notif-email">Email notifications</label></div>
          <div className="flex items-center gap-3"><Switch id="notif-wa" /><label htmlFor="notif-wa">WhatsApp notifications</label></div>
          <Input placeholder="Default Risk Form" />
          <Button variant="cta">Save Preferences</Button>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Current plan: Pro</div>
                <div className="text-sm text-muted-foreground">Next billing: Sep 15</div>
              </div>
              <div className="space-x-2">
                <Button variant="cta">Upgrade Plan</Button>
                <Button variant="outline">Change Payment Method</Button>
                <Button variant="outline">Cancel Plan</Button>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="text-sm">Lead usage: 75/100</div>
              <Progress value={75} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <div className="text-sm text-muted-foreground">Team management coming soon.</div>
          <Button variant="outline">Invite teammate</Button>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input placeholder="New password" type="password" />
            <Input placeholder="Confirm password" type="password" />
          </div>
          <div className="flex items-center gap-3"><Switch id="twofa" /><label htmlFor="twofa">Enable 2FA</label></div>
          <Button variant="cta">Save security</Button>
          <div className="text-sm text-muted-foreground">Recent logins will appear here.</div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
