import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  AlertTriangle, 
  BarChart3,
  Users,
  Target,
  Calendar,
  Phone,
  Mail,
  User,
  Info,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Assessment {
  id: string;
  title: string;
  slug: string;
  user_id?: string;
  user_name?: string;
}

interface Question {
  id: string;
  qkey: string;
  label: string;
  qtype: string;
  options: any;
  required: boolean;
  order_index: number;
}

interface AssessmentResult {
  bucket: string;
  score: number;
  rubric: {
    capacity?: number;
    tolerance?: number;
    need?: number;
    warnings?: string[];
    [key: string]: any;
  };
}

export default function PublicAssessment() {
  const { slug, referralCode, assessmentCode } = useParams<{ 
    slug: string; 
    referralCode: string; 
    assessmentCode: string 
  }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitterInfo, setSubmitterInfo] = useState({
    full_name: '',
    email: '',
    phone: '+91',
    age: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [currentStep, setCurrentStep] = useState<'intro' | 'verification' | 'questions' | 'review' | 'result' | 'already-completed'>('intro');
  const [assessmentType, setAssessmentType] = useState<'referral' | 'assessment' | 'public'>('public');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [existingLead, setExistingLead] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    console.log('🔍 useEffect triggered with:', {
      pathname: location.pathname,
      slug,
      referralCode,
      assessmentCode
    });
    
    // Determine assessment type based on URL
    if (location.pathname.startsWith('/assessment/')) {
      console.log('🔍 Assessment type: assessment');
      setAssessmentType('assessment');
      if (assessmentCode) {
        loadAssessmentByCode(assessmentCode);
      }
    } else if (location.pathname.startsWith('/r/')) {
      console.log('🔍 Assessment type: referral');
      setAssessmentType('referral');
      if (referralCode) {
        loadReferralAssessment(referralCode);
      }
    } else if (location.pathname.startsWith('/a/')) {
      console.log('🔍 Assessment type: public (user assessment link)');
      setAssessmentType('public');
      // Extract the slug from the pathname since it's the user assessment link
      const pathSlug = location.pathname.split('/')[2]; // /a/slug -> ['', 'a', 'slug']
      console.log('🔍 Extracted slug from pathname:', pathSlug);
      if (pathSlug && pathSlug.trim() !== '') {
        console.log('🔍 Calling loadAssessment with:', pathSlug);
        loadAssessment(pathSlug);
      } else {
        console.error('❌ No slug found in pathname or slug is empty');
        setIsLoading(false);
      }
    } else if (slug) {
      console.log('🔍 Assessment type: public (fallback)');
      setAssessmentType('public');
      loadAssessment(slug);
    } else {
      console.log('❌ No matching route found');
    }
  }, [slug, referralCode, assessmentCode, location.pathname]);

  const loadAssessmentByCode = async (assessmentCode: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/assessment/${assessmentCode}`);
      
      if (!response.ok) {
        throw new Error('Assessment not found');
      }
      
      const data = await response.json();
      setAssessment(data.assessment);
      setQuestions(data.questions);
    } catch (error) {
      console.error('Failed to load assessment by code:', error);
      toast({
        title: "Error",
        description: "Failed to load assessment. Please check the link and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadReferralAssessment = async (referralCode: string) => {
    try {
      setIsLoading(true);
      // Get assessment ID from query params if available
      const urlParams = new URLSearchParams(window.location.search);
      const assessmentId = urlParams.get('assessment');
      
      let url = `/api/r/referral/${referralCode}`;
      if (assessmentId) {
        url += `?assessment=${assessmentId}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Assessment not found');
      }
      
      const data = await response.json();
      setAssessment(data.assessment);
      setQuestions(data.questions);
    } catch (error) {
      console.error('Failed to load referral assessment:', error);
      toast({
        title: "Error",
        description: "Failed to load assessment. Please check the link and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssessment = async (assessmentSlug: string) => {
    try {
      setIsLoading(true);
      console.log('🔍 Loading assessment for slug:', assessmentSlug);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://one-moment-fin.vercel.app'}/api/assessments/public/${assessmentSlug}`);
      
      if (!response.ok) {
        throw new Error('Failed to load assessment');
      }
      
      const data = await response.json();
      console.log('✅ Assessment data loaded:', data);
      
      setAssessment(data.assessment);
      setQuestions(data.questions);
    } catch (error) {
      console.error('Failed to load assessment:', error);
      toast({
        title: "Error",
        description: "Failed to load assessment. Please check the link and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyExistingLead = async () => {
    if (!submitterInfo.email && !submitterInfo.phone) {
      toast({
        title: "Error",
        description: "Please provide either email or phone number to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!assessment?.user_id) {
      toast({
        title: "Error",
        description: "Assessment information is missing. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://one-moment-fin.vercel.app'}/api/leads/check-existing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: submitterInfo.email || undefined,
          phone: submitterInfo.phone || undefined,
          user_id: assessment.user_id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to verify existing lead');
      }

      const data = await response.json();
      
      if (data.exists) {
        setExistingLead(data);
        setCurrentStep('already-completed');
      } else {
        // No existing lead found, proceed to questions
        setCurrentStep('questions');
      }
    } catch (error) {
      console.error('Failed to verify existing lead:', error);
      toast({
        title: "Error",
        description: "Failed to verify existing lead. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAnswerChange = (qkey: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [qkey]: value
    }));
  };

  const validateForm = () => {
    const errors: string[] = [];
    
    // Check required submitter info
    if (!submitterInfo.full_name.trim()) {
      errors.push('Full name is required');
    }
    
    if (!submitterInfo.email.trim()) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterInfo.email)) {
      errors.push('Please enter a valid email address');
    }
    
    // Check age if provided
    if (submitterInfo.age && (parseInt(submitterInfo.age) < 18 || parseInt(submitterInfo.age) > 100)) {
      errors.push('Age must be between 18 and 100');
    }
    
    // Check phone if provided
    if (submitterInfo.phone && submitterInfo.phone !== '+91') {
      const phoneNumber = submitterInfo.phone.replace('+91', '').trim();
      if (phoneNumber.length !== 10 || !/^\d{10}$/.test(phoneNumber)) {
        errors.push('Phone number must be 10 digits');
      }
    }
    
    // Check required questions
    questions.forEach(question => {
      if (question.required) {
        const answer = answers[question.qkey];
        if (!answer || 
            (Array.isArray(answer) && answer.length === 0) || 
            (typeof answer === 'string' && answer.trim() === '')) {
          errors.push(`${question.label} is required`);
        }
      }
    });
    
    return errors;
  };

  const handleNext = () => {
    if (currentStep === 'verification') {
      verifyExistingLead();
    } else if (currentStep === 'questions') {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        setCurrentStep('review');
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep === 'questions') {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
      } else {
        setCurrentStep('verification');
      }
    } else if (currentStep === 'review') {
      setCurrentQuestionIndex(questions.length - 1);
      setCurrentStep('questions');
    }
  };

  const handleStartAssessment = () => {
    setCurrentStep('verification');
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join(', '),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      let submitUrl: string;
      let submitData: any = {
        answers,
        submitterInfo: {
          full_name: submitterInfo.full_name,
          email: submitterInfo.email,
          phone: submitterInfo.phone === '+91' ? '' : submitterInfo.phone,
          age: submitterInfo.age ? parseInt(submitterInfo.age) : undefined
        }
      };

      if (assessmentType === 'assessment' && assessmentCode) {
        submitUrl = `/api/assessment/${assessmentCode}/submit`;
      } else if (assessmentType === 'referral' && referralCode) {
        submitUrl = `/api/r/referral/${referralCode}/submit`;
        if (assessment?.id) {
          submitData.assessmentId = assessment.id;
        }
      } else if (assessmentType === 'public' && slug) {
        submitUrl = `${import.meta.env.VITE_API_URL || 'https://one-moment-fin.vercel.app'}/api/assessments/public/${slug}/submit`;
      } else {
        throw new Error('Invalid assessment configuration');
      }
      
      const response = await fetch(submitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit assessment');
      }

      const data = await response.json();
      setResult(data.result);
      setCurrentStep('result');
      
      toast({
        title: "Success",
        description: "Assessment submitted successfully!",
        variant: "default",
      });
    } catch (error: any) {
      console.error('Failed to submit assessment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit assessment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (currentStep === 'result') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-gray-900">Assessment Complete!</CardTitle>
            <p className="text-gray-600">Thank you for completing the risk assessment.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {result && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Your Risk Profile</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Risk Score:</span>
                    <span className="ml-2 font-medium">{result.score}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Risk Category:</span>
                    <span className="ml-2 font-medium capitalize">{result.bucket}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Our team will review your assessment and contact you soon with personalized recommendations.
              </p>
              <Button
                onClick={() => window.close()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === 'review') {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Progress Indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Step 3 of 3: Review & Submit</span>
              <span className="text-sm text-muted-foreground">100%</span>
            </div>
            <Progress value={100} className="h-2" />
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Review Your Answers</h1>
            <p className="text-gray-600">
              Please review your answers before submitting the assessment
            </p>
          </div>

          <Card className="w-full">
            <CardContent className="p-6">
              {/* Personal Information Review */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </h2>
                
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Full Name:</span>
                    <span className="text-gray-900">{submitterInfo.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Email:</span>
                    <span className="text-gray-900">{submitterInfo.email}</span>
                  </div>
                  {submitterInfo.phone && submitterInfo.phone !== '+91' && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Phone:</span>
                      <span className="text-gray-900">{submitterInfo.phone}</span>
                    </div>
                  )}
                  {submitterInfo.age && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Age:</span>
                      <span className="text-gray-900">{submitterInfo.age} years</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Assessment Answers Review */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Assessment Answers
                </h2>
                
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <div key={question.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-700">
                          {index + 1}. {question.label}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {question.qtype}
                        </Badge>
                      </div>
                      <div className="text-gray-900">
                        {answers[question.qkey] || <span className="text-gray-500 italic">Not answered</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-6">
                <Button
                  onClick={() => setCurrentStep('questions')}
                  variant="outline"
                  className="px-6"
                >
                  ← Back to Questions
                </Button>
                
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 px-8"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    'Submit Assessment'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentStep === 'intro') {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Risk Assessment</h1>
            <p className="text-gray-600">
              {assessment?.user_name ? `by ${assessment.user_name}` : 'Complete the form below to get started'}
            </p>
          </div>

          <Card className="w-full">
            <CardContent className="p-6">
              {/* Assessment Introduction */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Welcome to Your Risk Assessment</h2>
                <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                  This assessment will help us understand your financial goals, risk tolerance, and investment preferences. 
                  It takes about 5-10 minutes to complete and will provide you with personalized investment recommendations.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Personalized Approach</h3>
                    <p className="text-sm text-gray-600">Tailored recommendations based on your unique profile</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Target className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Risk Assessment</h3>
                    <p className="text-sm text-gray-600">Understand your risk tolerance and capacity</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Calendar className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Quick & Easy</h3>
                    <p className="text-sm text-gray-600">Complete in just 5-10 minutes</p>
                  </div>
                </div>

                <Button
                  onClick={handleStartAssessment}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-lg"
                >
                  Start Assessment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentStep === 'verification') {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Progress Indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Step 1 of 3: Verification</span>
              <span className="text-sm text-muted-foreground">25%</span>
            </div>
            <Progress value={25} className="h-2" />
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Verify Your Information</CardTitle>
              <p className="text-muted-foreground">
                Please provide your basic details so we can check if you've already completed this assessment.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={submitterInfo.full_name}
                    onChange={(e) => setSubmitterInfo(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={submitterInfo.age}
                    onChange={(e) => setSubmitterInfo(prev => ({ ...prev, age: e.target.value }))}
                    placeholder="Enter your age"
                    min="18"
                    max="100"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={submitterInfo.email}
                  onChange={(e) => setSubmitterInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email address"
                />
                <p className="text-xs text-muted-foreground">
                  Provide either email or phone number to continue
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Input
                    id="phone"
                    type="tel"
                    value={submitterInfo.phone}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (!value.startsWith('+91')) {
                        value = '+91' + value.replace('+91', '');
                      }
                      setSubmitterInfo(prev => ({ ...prev, phone: value }));
                    }}
                    placeholder="Enter your phone number"
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                    +91
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('intro')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={isVerifying || (!submitterInfo.email && !submitterInfo.phone) || !submitterInfo.full_name.trim()}
                  className="flex-1"
                >
                  {isVerifying ? 'Verifying...' : 'Continue'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentStep === 'already-completed' && existingLead) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-amber-600" />
              </div>
              <CardTitle className="text-2xl">Assessment Already Completed</CardTitle>
              <p className="text-muted-foreground">
                We found that you've already completed this assessment. Here are your results:
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Lead Information */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <h3 className="font-medium mb-3">Your Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <p className="font-medium">{existingLead.lead.full_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <p className="font-medium capitalize">{existingLead.lead.status.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Completed:</span>
                    <p className="font-medium">
                      {new Date(existingLead.lead.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Source:</span>
                    <p className="font-medium">Via link</p>
                  </div>
                </div>
              </div>

              {/* Assessment Results */}
              {existingLead.assessment && (
                <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
                  <h3 className="font-medium mb-3 text-blue-800">Risk Assessment Results</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 mb-1">
                        {existingLead.assessment.riskScore || 0}
                      </div>
                      <div className="text-sm text-blue-600 font-medium">Risk Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-semibold text-blue-800 mb-1">
                        {existingLead.assessment.riskBucket || 'N/A'}
                      </div>
                      <div className="text-sm text-blue-700">Risk Category</div>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-blue-700">
                      Assessment completed on {new Date(existingLead.assessment.submission.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Risk Assessment – OneMFin</title>
        <meta name="description" content="Complete your risk assessment to get personalized investment recommendations." />
      </Helmet>

      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Progress Indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Step 2 of 3: Questions ({currentQuestionIndex + 1}/{questions.length})</span>
              <span className="text-sm text-muted-foreground">{Math.round(((currentQuestionIndex + 1) / questions.length) * 50 + 25)}%</span>
            </div>
            <Progress value={((currentQuestionIndex + 1) / questions.length) * 50 + 25} className="h-2" />
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Risk Assessment Questions</h1>
            <p className="text-gray-600">
              Please answer the following questions to help us understand your risk profile
            </p>
          </div>

          <Card className="w-full">
            <CardContent className="p-6">
              {/* Questions Section */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Question {currentQuestionIndex + 1} of {questions.length}
                </h2>
                     
                {/* Single Question Display */}
                {questions[currentQuestionIndex] && (
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <Label className="text-lg font-medium mb-4 block">
                        {questions[currentQuestionIndex].label}
                        {questions[currentQuestionIndex].required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      
                      {questions[currentQuestionIndex].qtype === 'multi' && questions[currentQuestionIndex].options && questions[currentQuestionIndex].options.length > 0 ? (
                        <div className="space-y-3">
                          {questions[currentQuestionIndex].options.map((option: any, optionIndex: number) => (
                            <div key={optionIndex} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                              <input
                                type="checkbox"
                                id={`${questions[currentQuestionIndex].qkey}-${optionIndex}`}
                                checked={Array.isArray(answers[questions[currentQuestionIndex].qkey]) && answers[questions[currentQuestionIndex].qkey].includes(option.value)}
                                onChange={(e) => {
                                  const currentAnswers = Array.isArray(answers[questions[currentQuestionIndex].qkey]) ? answers[questions[currentQuestionIndex].qkey] : [];
                                  if (e.target.checked) {
                                    handleAnswerChange(questions[currentQuestionIndex].qkey, [...currentAnswers, option.value]);
                                  } else {
                                    handleAnswerChange(questions[currentQuestionIndex].qkey, currentAnswers.filter((ans: string) => ans !== option.value));
                                  }
                                }}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <Label htmlFor={`${questions[currentQuestionIndex].qkey}-${optionIndex}`} className="text-base cursor-pointer flex-1">
                                {option.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      ) : questions[currentQuestionIndex].qtype === 'single' && questions[currentQuestionIndex].options && questions[currentQuestionIndex].options.length > 0 ? (
                        <RadioGroup
                          value={answers[questions[currentQuestionIndex].qkey] || ''}
                          onValueChange={(value) => handleAnswerChange(questions[currentQuestionIndex].qkey, value)}
                          className="space-y-3"
                        >
                          {questions[currentQuestionIndex].options.map((option: any, optionIndex: number) => (
                            <div key={optionIndex} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                              <RadioGroupItem value={option.value} id={`${questions[currentQuestionIndex].qkey}-${optionIndex}`} />
                              <Label htmlFor={`${questions[currentQuestionIndex].qkey}-${optionIndex}`} className="text-base cursor-pointer flex-1">
                                {option.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      ) : questions[currentQuestionIndex].qtype === 'number' ? (
                        <div className="space-y-3">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Rs</span>
                            <Input
                              type="number"
                              min={questions[currentQuestionIndex].options?.minimum || 0}
                              value={answers[questions[currentQuestionIndex].qkey] || ''}
                              onChange={(e) => handleAnswerChange(questions[currentQuestionIndex].qkey, e.target.value)}
                              placeholder="Enter amount"
                              className="w-full pl-10"
                            />
                          </div>
                          <p className="text-sm text-gray-500">
                            Minimum amount: Rs {questions[currentQuestionIndex].options?.minimum || 100}
                          </p>
                        </div>
                      ) : questions[currentQuestionIndex].qtype === 'scale' ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                            <span>Low</span>
                            <span>High</span>
                          </div>
                          <RadioGroup
                            value={answers[questions[currentQuestionIndex].qkey] || ''}
                            onValueChange={(value) => handleAnswerChange(questions[currentQuestionIndex].qkey, value)}
                            className={`grid gap-2 ${questions[currentQuestionIndex].options?.labels ? `grid-cols-${questions[currentQuestionIndex].options.labels.length}` : 'grid-cols-5'}`}
                          >
                            {questions[currentQuestionIndex].options?.labels ? (
                              // Use labels from options if available
                              questions[currentQuestionIndex].options.labels.map((label: string, index: number) => (
                                <div key={index} className="flex flex-col items-center">
                                  <RadioGroupItem value={(index + 1).toString()} id={`${questions[currentQuestionIndex].qkey}-${index}`} />
                                  <Label htmlFor={`${questions[currentQuestionIndex].qkey}-${index}`} className="text-sm mt-1 text-center">
                                    {label}
                                  </Label>
                                </div>
                              ))
                            ) : (
                              // Fallback to 1-5 scale
                              [1, 2, 3, 4, 5].map((value) => (
                                <div key={value} className="flex flex-col items-center">
                                  <RadioGroupItem value={value.toString()} id={`${questions[currentQuestionIndex].qkey}-${value}`} />
                                  <Label htmlFor={`${questions[currentQuestionIndex].qkey}-${value}`} className="text-sm mt-1">
                                    {value}
                                  </Label>
                                </div>
                              ))
                            )}
                          </RadioGroup>
                        </div>
                      ) : questions[currentQuestionIndex].qtype === 'percent' ? (
                        <div className="space-y-3">
                          <Input
                            type="number"
                            min={questions[currentQuestionIndex].options?.min || 0}
                            max={questions[currentQuestionIndex].options?.max || 100}
                            value={answers[questions[currentQuestionIndex].qkey] || ''}
                            onChange={(e) => handleAnswerChange(questions[currentQuestionIndex].qkey, e.target.value)}
                            placeholder="Enter percentage (0-100)"
                            className="w-32"
                          />
                          <p className="text-sm text-gray-500">
                            Enter a value between {questions[currentQuestionIndex].options?.min || 0}% and {questions[currentQuestionIndex].options?.max || 100}%
                          </p>
                        </div>
                      ) : (
                        <Textarea
                          value={answers[questions[currentQuestionIndex].qkey] || ''}
                          onChange={(e) => handleAnswerChange(questions[currentQuestionIndex].qkey, e.target.value)}
                          placeholder="Enter your answer"
                          rows={4}
                          className="w-full"
                        />
                      )}
                    </div>
                    
                    {/* Navigation Buttons */}
                    <div className="flex justify-between items-center pt-4">
                      <Button
                        onClick={handlePrevious}
                        disabled={currentQuestionIndex === 0}
                        variant="outline"
                        className="px-6"
                      >
                        Previous
                      </Button>
                      
                      <div className="flex gap-2">
                        {currentQuestionIndex < questions.length - 1 ? (
                          <Button
                            onClick={handleNext}
                            disabled={!answers[questions[currentQuestionIndex].qkey] || answers[questions[currentQuestionIndex].qkey] === ''}
                            className="bg-blue-600 hover:bg-blue-700 px-6"
                          >
                            Next Question
                          </Button>
                        ) : (
                          <Button
                            onClick={() => setCurrentStep('review')}
                            disabled={!answers[questions[currentQuestionIndex].qkey] || answers[questions[currentQuestionIndex].qkey] === ''}
                            className="bg-green-600 hover:bg-green-700 px-6"
                          >
                            Review & Submit
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
