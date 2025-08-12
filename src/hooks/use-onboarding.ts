import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { getOnboardingStatus } from '@/lib/api';

interface OnboardingStatus {
  onboardingComplete: boolean;
  metadata: {
    phoneNumber?: string;
    mfdRegistrationNumber?: string;
    calendlyUrl?: string;
    calendlyApiKey?: string;
  };
}

export const useOnboarding = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!isLoaded || !user) {
        setIsLoading(false);
        return;
      }

      try {
        // Check Clerk metadata first
        const clerkMetadata = user.publicMetadata;
        const onboardingComplete = clerkMetadata?.onboardingComplete === true;

        if (onboardingComplete) {
          setStatus({
            onboardingComplete: true,
            metadata: {
              phoneNumber: clerkMetadata.phoneNumber,
              mfdRegistrationNumber: clerkMetadata.mfdRegistrationNumber,
              calendlyUrl: clerkMetadata.calendlyUrl,
              calendlyApiKey: clerkMetadata.calendlyApiKey,
            }
          });
          setIsLoading(false);
          return;
        }

        // If not complete in Clerk, check backend
        try {
          const token = await user.getToken({ template: 'supabase' });
          if (token) {
            const backendStatus = await getOnboardingStatus(token);
            setStatus(backendStatus);
          }
        } catch (error) {
          console.error('Failed to check backend onboarding status:', error);
          // Fallback to Clerk metadata
          setStatus({
            onboardingComplete: false,
            metadata: {}
          });
        }
      } catch (error) {
        console.error('Onboarding status check failed:', error);
        setStatus({
          onboardingComplete: false,
          metadata: {}
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user, isLoaded]);

  const redirectIfNotOnboarded = (targetPath: string) => {
    if (!isLoading && status && !status.onboardingComplete) {
      navigate('/onboarding');
      return true; // Redirected
    }
    return false; // No redirect needed
  };

  const redirectIfOnboarded = (targetPath: string) => {
    if (!isLoading && status && status.onboardingComplete) {
      navigate(targetPath);
      return true; // Redirected
    }
    return false; // No redirect needed
  };

  return {
    status,
    isLoading,
    redirectIfNotOnboarded,
    redirectIfOnboarded,
    isOnboarded: status?.onboardingComplete || false
  };
};
