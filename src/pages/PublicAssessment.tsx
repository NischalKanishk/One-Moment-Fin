import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { assessmentsAPI, leadsAPI } from "@/lib/api";

interface Assessment {
  id: string;
  name: string;
  description?: string;
  schema: any;
  ui?: any;
  user_id: string; // Include user_id for lead creation
  branding?: {
    mfd_name: string;
  };
}

interface LeadData {
  full_name: string;
  email: string;
  phone: string;
  age: number;
}

export default function PublicAssessment() {
  const { referralCode } = useParams<{ referralCode: string }>();
  const navigate = useNavigate();
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [leadData, setLeadData] = useState<LeadData>({
    full_name: "",
    email: "",
    phone: "",
    age: 25
  });
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (referralCode) {
      loadAssessment(referralCode);
    }
  }, [referralCode]);

  const loadAssessment = async (code: string) => {
    try {
      const data = await assessmentsAPI.getPublicAssessment(code);
      setAssessment(data.assessment);
      
      // Initialize responses with default values from schema
      if (data.assessment?.schema?.properties) {
        const defaultResponses: Record<string, any> = {};
        Object.entries(data.assessment.schema.properties).forEach(([key, field]: [string, any]) => {
          if (field.default !== undefined) {
            defaultResponses[key] = field.default;
          }
        });
        setResponses(defaultResponses);
      }
    } catch (err) {
      setError("Assessment form not found or not published");
      console.error("Assessment load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponseChange = (fieldKey: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const renderField = (fieldKey: string, field: any) => {
    const value = responses[fieldKey] || '';
    const isRequired = assessment?.schema?.required?.includes(fieldKey);

    switch (field.type) {
      case 'string':
        if (field.enum) {
          return (
            <Select value={value} onValueChange={(val) => handleResponseChange(fieldKey, val)}>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.title || fieldKey}`} />
              </SelectTrigger>
              <SelectContent>
                {field.enum.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        } else {
          return (
            <Input
              value={value}
              onChange={(e) => handleResponseChange(fieldKey, e.target.value)}
              placeholder={`Enter ${field.title || fieldKey}`}
            />
          );
        }
      
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleResponseChange(fieldKey, parseFloat(e.target.value) || 0)}
            placeholder={`Enter ${field.title || fieldKey}`}
          />
        );
      
      case 'boolean':
        return (
          <Select value={value.toString()} onValueChange={(val) => handleResponseChange(fieldKey, val === 'true')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        );
      
      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleResponseChange(fieldKey, e.target.value)}
            placeholder={`Enter ${field.title || fieldKey}`}
          />
        );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!assessment || !referralCode) return;
    
    // Validate required fields
    console.log('🔍 Form validation - leadData:', leadData);
    console.log('🔍 Form validation - responses:', responses);
    
    if (!leadData.full_name || !leadData.phone) {
      setError("Name and phone number are required");
      return;
    }
    
    // Ensure age is a valid number
    if (leadData.age < 18 || leadData.age > 100) {
      setError("Age must be between 18 and 100");
      return;
    }
    
    // Ensure email is valid if provided
    if (leadData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadData.email)) {
      setError("Please enter a valid email address");
      return;
    }
    
    console.log('🔍 Form validation passed!');

    // Validate assessment responses against schema
    if (assessment.schema?.required) {
      for (const requiredField of assessment.schema.required) {
        if (!responses[requiredField]) {
          setError(`${assessment.schema.properties[requiredField]?.title || requiredField} is required`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Get the API base URL from environment or use default
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      // First, create a lead using the public endpoint
      const leadPayload = {
        full_name: leadData.full_name.trim(),
        email: leadData.email.trim() || undefined, // Send undefined if empty
        phone: leadData.phone.trim(),
        age: leadData.age,
        user_id: assessment.user_id, // Use the user_id from the assessment
        source_link: `/r/${referralCode}` // Track the referral link used
      };
      
      console.log('🔍 Sending lead data:', leadPayload);
      console.log('🔍 Data types:', {
        full_name: typeof leadPayload.full_name,
        email: typeof leadPayload.email,
        phone: typeof leadPayload.phone,
        age: typeof leadPayload.age,
        user_id: typeof leadPayload.user_id
      });
      
      const leadResponse = await fetch(`${API_BASE_URL}/api/leads/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadPayload)
      });

      if (!leadResponse.ok) {
        const errorData = await leadResponse.json();
        console.error('❌ Lead creation failed:', errorData);
        throw new Error(errorData.error || 'Failed to create lead');
      }

      const leadResponseData = await leadResponse.json();
      const lead = leadResponseData.lead;
      
      // Submit assessment responses using the public endpoint
      const assessmentResponse = await fetch(`${API_BASE_URL}/api/assessments/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead_id: lead.id,
          assessment_id: assessment.id,
          responses: Object.entries(responses).map(([question_id, answer_value]) => ({
            question_id,
            answer_value
          }))
        })
      });

      if (!assessmentResponse.ok) {
        const errorData = await assessmentResponse.json();
        throw new Error(errorData.error || 'Failed to submit assessment');
      }
      
      setSuccess(true);
      
      // Redirect to success page after a delay
      setTimeout(() => {
        navigate('/assessment-complete');
      }, 2000);
      
    } catch (err: any) {
      console.error("Submission error:", err);
      setError(err.message || "Failed to submit assessment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (error && !assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Assessment Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => navigate('/')} variant="outline">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Assessment Submitted!</h1>
          <p className="text-gray-600 mb-4">
            Thank you for completing the assessment. We'll be in touch soon with your personalized recommendations.
          </p>
          <div className="animate-pulse">
            <p className="text-sm text-gray-500">Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-primary mr-2" />
            <h1 className="text-3xl font-bold text-gray-900">{assessment.name}</h1>
          </div>
          {assessment.description && (
            <p className="text-lg text-gray-600 mb-2">{assessment.description}</p>
          )}
          {assessment.branding?.mfd_name && (
            <p className="text-sm text-gray-500">
              Assessment by {assessment.branding.mfd_name}
            </p>
          )}
        </div>

        {/* Assessment Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <Input
                  value={leadData.full_name}
                  onChange={(e) => setLeadData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <Input
                  value={leadData.phone}
                  onChange={(e) => setLeadData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="e.g., 9876543210 or +91 98765 43210"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter your 10-digit mobile number (starts with 6, 7, 8, or 9)
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={leadData.email}
                  onChange={(e) => setLeadData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age
                </label>
                <Input
                  type="number"
                  value={leadData.age}
                  onChange={(e) => setLeadData(prev => ({ ...prev, age: parseInt(e.target.value) || 25 }))}
                  placeholder="Enter your age"
                  min="18"
                  max="100"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assessment Questions */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Assessment Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {assessment.schema?.properties && Object.entries(assessment.schema.properties).map(([fieldKey, field]: [string, any]) => (
                <div key={fieldKey} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {field.title || fieldKey}
                    {assessment.schema?.required?.includes(fieldKey) && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  
                  {field.description && (
                    <p className="text-sm text-gray-500 mb-2">{field.description}</p>
                  )}
                  
                  {renderField(fieldKey, field)}
                </div>
              ))}
              
              {error && (
                <div className="text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
              
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  'Submit Assessment'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
