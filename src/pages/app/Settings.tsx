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

export default function Settings(){
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const { user, isLoading, syncUser } = useCustomAuth();
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

      <Tabs defaultValue="preferences">
        <TabsList className="w-full md:w-auto overflow-auto">
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
