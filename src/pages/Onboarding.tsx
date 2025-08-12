import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, Phone, Building2, Calendar } from "lucide-react";
import { completeOnboarding } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface OnboardingData {
  phoneNumber: string;
  mfdRegistrationNumber: string;
  calendlyUrl: string;
  calendlyApiKey: string;
}

export default function Onboarding() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState<OnboardingData>({
    phoneNumber: "",
    mfdRegistrationNumber: "",
    calendlyUrl: "",
    calendlyApiKey: ""
  });

  // Check if user has already completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (user?.publicMetadata?.onboardingComplete) {
        navigate("/app/dashboard");
      }
    };
    
    checkOnboardingStatus();
  }, [user, navigate]);

  const handleInputChange = (field: keyof OnboardingData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!user) {
      setError("User not authenticated");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      await completeOnboarding(token, formData);
      
      toast({
        title: "Onboarding Complete!",
        description: "Welcome to OneMFin! You're all set up.",
      });

      // Reload user data to reflect new metadata
      await user.reload();
      
      // Navigate to dashboard
      navigate("/app/dashboard");
      
    } catch (err) {
      console.error("Onboarding error:", err);
      setError(err instanceof Error ? err.message : "Failed to complete onboarding");
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return true; // Basic info is optional
      case 2:
        return true; // MFD registration is optional
      case 3:
        return formData.calendlyUrl.trim() !== ""; // Calendly URL is required
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (canProceed()) {
      setStep(prev => Math.min(4, prev + 1));
    }
  };

  const prevStep = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  const steps = [
    {
      title: "Basic Information",
      description: "Tell us about yourself",
      icon: Phone,
      fields: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="+91 98765 43210"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
            />
            <p className="text-sm text-muted-foreground mt-1">
              We'll use this for important notifications and client communications.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "MFD Registration",
      description: "Your professional credentials",
      icon: Building2,
      fields: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="mfdRegistrationNumber">MFD Registration Number (Optional)</Label>
            <Input
              id="mfdRegistrationNumber"
              placeholder="MFD123456789"
              value={formData.mfdRegistrationNumber}
              onChange={(e) => handleInputChange("mfdRegistrationNumber", e.target.value)}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Your SEBI MFD registration number for compliance and verification.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Calendly Integration",
      description: "Set up meeting scheduling",
      icon: Calendar,
      fields: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="calendlyUrl">Calendly URL *</Label>
            <Input
              id="calendlyUrl"
              type="url"
              placeholder="https://calendly.com/your-username"
              value={formData.calendlyUrl}
              onChange={(e) => handleInputChange("calendlyUrl", e.target.value)}
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              Your Calendly scheduling link for client meetings.
            </p>
          </div>
          <div>
            <Label htmlFor="calendlyApiKey">Calendly API Key (Optional)</Label>
            <Input
              id="calendlyApiKey"
              type="password"
              placeholder="cal_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={formData.calendlyApiKey}
              onChange={(e) => handleInputChange("calendlyApiKey", e.target.value)}
            />
            <p className="text-sm text-muted-foreground mt-1">
              For advanced features like automatic meeting creation and sync.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Review & Complete",
      description: "Review your information and finish setup",
      icon: CheckCircle,
      fields: (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium">Phone Number:</span>
                <span className="text-muted-foreground">
                  {formData.phoneNumber || "Not provided"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium">MFD Registration:</span>
                <span className="text-muted-foreground">
                  {formData.mfdRegistrationNumber || "Not provided"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium">Calendly URL:</span>
                <span className="text-muted-foreground">
                  {formData.calendlyUrl || "Not provided"}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-medium">Calendly API Key:</span>
                <span className="text-muted-foreground">
                  {formData.calendlyApiKey ? "Provided" : "Not provided"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
  ];

  const currentStep = steps[step - 1];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Complete Your Profile – OneMFin</title>
        <meta name="description" content="Set up your MFD profile and integrations to get started with OneMFin." />
      </Helmet>
      
      <div className="container mx-auto px-6 py-10 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Complete Your Profile</h1>
          <p className="text-muted-foreground">
            Let's set up your OneMFin account in just a few steps
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((_, index) => (
            <div key={index} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index + 1 < step 
                  ? "bg-primary text-primary-foreground" 
                  : index + 1 === step 
                    ? "bg-primary/20 text-primary border-2 border-primary"
                    : "bg-muted text-muted-foreground"
              }`}>
                {index + 1 < step ? <CheckCircle className="w-4 h-4" /> : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-2 ${
                  index + 1 < step ? "bg-primary" : "bg-muted"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <currentStep.icon className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>{currentStep.title}</CardTitle>
                <CardDescription>{currentStep.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {currentStep.fields}
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={prevStep}
            disabled={step === 1}
          >
            Previous
          </Button>
          
          <div className="flex gap-2">
            {step < 4 ? (
              <Button 
                onClick={nextStep}
                disabled={!canProceed()}
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={isLoading || !canProceed()}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  "Complete Setup"
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Help Text */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>You can always update these settings later in your profile.</p>
        </div>
      </div>
    </div>
  );
}
