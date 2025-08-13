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

    // If user is on auth pages but is already signed in, redirect to dashboard
    if (location.pathname === '/auth' || location.pathname === '/signup') {
      navigate('/app/dashboard');
      return;
    }
  }, [user, isLoaded, location.pathname, navigate]);

  return null; // This component doesn't render anything
};
