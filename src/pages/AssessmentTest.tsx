import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Play,
  Shield
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

export default function AssessmentTest() {
  const { slug } = useParams<{ slug: string }>();
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
  const [currentStep, setCurrentStep] = useState<'form' | 'result'>('form');
  const [leadInfo, setLeadInfo] = useState<{ isNewLead: boolean; leadId: string } | null>(null);

  useEffect(() => {
    if (slug) {
      loadAssessment(slug);
    }
  }, [slug]);

  const loadAssessment = async (assessmentSlug: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/ai/public/${assessmentSlug}`);
      
      if (!response.ok) {
        throw new Error('Assessment not found');
      }
      
      const data = await response.json();
      setAssessment(data.assessment);
      setQuestions(data.questions || []);
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
      if (question.required && (!answers[question.qkey] || answers[question.qkey] === '')) {
        errors.push(`${question.label} is required`);
      }
    });
    
    return errors;
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
      
      const submitData = {
        answers,
        submitterInfo: {
          full_name: submitterInfo.full_name,
          email: submitterInfo.email,
          phone: submitterInfo.phone === '+91' ? '' : submitterInfo.phone,
          age: submitterInfo.age ? parseInt(submitterInfo.age) : undefined
        }
      };
      
      const response = await fetch(`/api/ai/public/${slug}/submit`, {
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
      setLeadInfo({ isNewLead: data.isNewLead, leadId: data.leadId });
      setCurrentStep('result');
      
      toast({
        title: "Success",
        description: `Assessment submitted successfully! ${data.isNewLead ? 'New lead created.' : 'Existing lead updated.'}`,
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

  const handlePhoneChange = (value: string) => {
    if (value.startsWith('+91')) {
      setSubmitterInfo(prev => ({ ...prev, phone: value }));
    } else if (value.startsWith('+')) {
      setSubmitterInfo(prev => ({ ...prev, phone: value }));
    } else {
      setSubmitterInfo(prev => ({ ...prev, phone: `+91${value}` }));
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

            {leadInfo && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Lead Information</h3>
                <div className="text-sm text-green-800">
                  <p className="mb-2">
                    <span className="font-medium">Status:</span> {leadInfo.isNewLead ? 'New lead created' : 'Existing lead updated'}
                  </p>
                  <p>
                    <span className="font-medium">Lead ID:</span> {leadInfo.leadId}
                  </p>
                </div>
              </div>
            )}
            
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                This was a test submission. In a real scenario, our team would review your assessment and contact you soon with personalized recommendations.
              </p>
              <Button
                onClick={() => setCurrentStep('form')}
                variant="outline"
                className="mr-2"
              >
                Test Again
              </Button>
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

  return (
    <>
      <Helmet>
        <title>Test Assessment Form – OneMFin</title>
        <meta name="description" content="Test your live assessment form to ensure it works correctly." />
      </Helmet>

      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Play className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Test Live Assessment Form</h1>
                <p className="text-gray-600">
                  {assessment?.user_name ? `by ${assessment.user_name}` : 'Test your assessment form'}
                </p>
              </div>
            </div>
            
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
              <Shield className="w-4 h-4" />
              Test Mode - Submissions will be marked as test data
            </div>
          </div>

          <Card className="w-full">
            <CardContent className="p-6">
              {/* Progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm text-gray-500">
                    {questions.length > 0 ? '1' : '0'} of {questions.length + 1}
                  </span>
                </div>
                <Progress value={questions.length > 0 ? 25 : 0} className="h-2" />
              </div>

              {/* Personal Information Section */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Basic Details
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name" className="text-sm font-medium">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="full_name"
                      value={submitterInfo.full_name}
                      onChange={(e) => setSubmitterInfo(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Enter your full name"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={submitterInfo.email}
                      onChange={(e) => setSubmitterInfo(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone Number
                    </Label>
                    <div className="mt-1 relative">
                      <Input
                        id="phone"
                        value={submitterInfo.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="Enter 10-digit phone number"
                        className="pl-12"
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                        +91
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">10 digits, optional</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="age" className="text-sm font-medium">
                      Age
                    </Label>
                    <Input
                      id="age"
                      type="number"
                      min="18"
                      max="100"
                      value={submitterInfo.age}
                      onChange={(e) => setSubmitterInfo(prev => ({ ...prev, age: e.target.value }))}
                      placeholder="Enter your age"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Minimum 18 years, optional</p>
                  </div>
                </div>
              </div>

              {/* Assessment Questions */}
              {questions.length > 0 && (
                <>
                  <Separator className="my-8" />
                  
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Framework Questions
                    </h2>
                    
                    <div className="space-y-6">
                      {questions.map((question, index) => (
                        <div key={question.id} className="space-y-3">
                          <Label className="text-sm font-medium">
                            {index + 1}. {question.label}
                            {question.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          
                          {question.qtype === 'mcq' && question.options && question.options.length > 0 ? (
                            <RadioGroup
                              value={answers[question.qkey] || ''}
                              onValueChange={(value) => handleAnswerChange(question.qkey, value)}
                            >
                              {question.options.map((option: string, optionIndex: number) => (
                                <div key={optionIndex} className="flex items-center space-x-2">
                                  <RadioGroupItem value={option} id={`${question.qkey}-${optionIndex}`} />
                                  <Label htmlFor={`${question.qkey}-${optionIndex}`} className="text-sm">
                                    {option}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          ) : question.qtype === 'scale' ? (
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-gray-500">Low</span>
                              <RadioGroup
                                value={answers[question.qkey] || ''}
                                onValueChange={(value) => handleAnswerChange(question.qkey, value)}
                                className="flex items-center space-x-2"
                              >
                                {[1, 2, 3, 4, 5].map((value) => (
                                  <div key={value} className="flex items-center space-x-2">
                                    <RadioGroupItem value={value.toString()} id={`${question.qkey}-${value}`} />
                                    <Label htmlFor={`${question.qkey}-${value}`} className="text-sm">
                                      {value}
                                    </Label>
                                  </div>
                                ))}
                              </RadioGroup>
                              <span className="text-sm text-gray-500">High</span>
                            </div>
                          ) : (
                            <Textarea
                              value={answers[question.qkey] || ''}
                              onChange={(e) => handleAnswerChange(question.qkey, e.target.value)}
                              placeholder="Enter your answer"
                              rows={3}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Submit Button */}
              <div className="flex justify-center pt-6">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 px-8"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    'Submit Test Assessment'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
