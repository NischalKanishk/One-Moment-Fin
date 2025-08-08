import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const [step, setStep] = useState<'login'|'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log('Auth page - starting login');
      await login(email, password);
      console.log('Auth page - login completed');
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
      console.log('Auth page - navigating to dashboard');
      navigate('/app/dashboard');
    } catch (error: any) {
      console.error('Auth page - login error:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Login failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log('Auth page - starting signup');
      await signup({ email, password, full_name: fullName });
      console.log('Auth page - signup completed');
      toast({
        title: "Success",
        description: "Account created successfully",
      });
      console.log('Auth page - navigating to dashboard');
      navigate('/app/dashboard');
    } catch (error: any) {
      console.error('Auth page - signup error:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Signup failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-background">
      <Helmet>
        <title>Sign in – OneMFin</title>
        <meta name="description" content="Passwordless sign in with email or phone. 6‑digit OTP sent instantly." />
      </Helmet>
      <div className="w-full max-w-md bg-card border rounded-lg p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-semibold mb-1">
          {step === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {step === 'login' ? 'Sign in to your account' : 'Create your OneMFin account'}
        </p>
        
        {step === 'login' ? (
          <form className="space-y-4" onSubmit={handleLogin}>
            <Input 
              type="email" 
              placeholder="Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
            <Input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
            <Button type="submit" variant="cta" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <button 
                type="button" 
                className="underline" 
                onClick={() => setStep('signup')}
              >
                Sign up
              </button>
            </p>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleSignup}>
            <Input 
              placeholder="Full name" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required 
            />
            <Input 
              type="email" 
              placeholder="Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
            <Input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
            <Button type="submit" variant="cta" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <button 
                type="button" 
                className="underline" 
                onClick={() => setStep('login')}
              >
                Sign in
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
