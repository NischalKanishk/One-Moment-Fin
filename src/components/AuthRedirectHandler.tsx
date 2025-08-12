import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate, useLocation } from 'react-router-dom';

export const AuthRedirectHandler = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoaded) return;

    // If user is not signed in, don't redirect
    if (!user) return;

    // Check if user has completed onboarding
    const onboardingComplete = user.publicMetadata?.onboardingComplete === true;
    
    // If user just signed up and hasn't completed onboarding
    if (!onboardingComplete && location.pathname !== '/onboarding') {
      navigate('/onboarding');
      return;
    }

    // If user has completed onboarding and is on onboarding page
    if (onboardingComplete && location.pathname === '/onboarding') {
      navigate('/app/dashboard');
      return;
    }

    // If user is on auth pages but is already signed in and onboarded
    if (onboardingComplete && (location.pathname === '/auth' || location.pathname === '/signup')) {
      navigate('/app/dashboard');
      return;
    }
  }, [user, isLoaded, location.pathname, navigate]);

  return null; // This component doesn't render anything
};
