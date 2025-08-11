import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { assessmentsAPI, leadsAPI } from "@/lib/api";

interface Question {
  id: string;
  question_text: string;
  type: "text" | "number" | "mcq" | "dropdown" | "scale";
  options?: string[];
}

interface Assessment {
  id: string;
  name: string;
  description?: string;
  assessment_questions: Question[];
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
  const [responses, setResponses] = useState<Record<string, string>>({});
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
    } catch (err) {
      setError("Assessment form not found or not published");
      console.error("Assessment load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!assessment || !referralCode) return;
    
    // Validate required fields
    if (!leadData.full_name || !leadData.phone) {
      setError("Name and phone number are required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // First, create a lead
      const leadResponse = await leadsAPI.createLead('', {
        full_name: leadData.full_name,
        email: leadData.email,
        phone: leadData.phone,
        age: leadData.age
      });

      const lead = leadResponse;
      
      // Submit assessment responses
      const assessmentData = {
        lead_id: lead.id,
        assessment_id: assessment.id,
        responses: Object.entries(responses).map(([questionId, answerValue]) => ({
          question_id: questionId,
          answer_value: answerValue
        }))
      };

      await assessmentsAPI.submit(assessmentData);
      setSuccess(true);
      
      // Redirect to thank you page after 3 seconds
      setTimeout(() => {
        navigate('/assessment-complete');
      }, 3000);
      
    } catch (err) {
      setError("Failed to submit assessment. Please try again.");
      console.error("Submission error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading assessment form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Assessment Not Available</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Assessment Submitted!</h1>
          <p className="text-muted-foreground">Thank you for completing the assessment. We'll be in touch soon!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{assessment?.name}</CardTitle>
            {assessment?.description && (
              <p className="text-muted-foreground">{assessment.description}</p>
            )}
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Lead Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Your Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name *</label>
                    <Input
                      required
                      value={leadData.full_name}
                      onChange={(e) => setLeadData(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone Number *</label>
                    <Input
                      required
                      type="tel"
                      value={leadData.phone}
                      onChange={(e) => setLeadData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter your phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email (Optional)</label>
                    <Input
                      type="email"
                      value={leadData.email}
                      onChange={(e) => setLeadData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Age</label>
                    <Input
                      type="number"
                      min="18"
                      max="100"
                      value={leadData.age}
                      onChange={(e) => setLeadData(prev => ({ ...prev, age: parseInt(e.target.value) || 25 }))}
                    />
                  </div>
                </div>
              </div>

              {/* Assessment Questions */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Risk Assessment Questions</h3>
                {assessment?.assessment_questions.map((question) => (
                  <div key={question.id} className="space-y-2">
                    <label className="block text-sm font-medium">
                      {question.question_text}
                    </label>
                    
                    {question.type === "text" && (
                      <Input
                        value={responses[question.id] || ""}
                        onChange={(e) => handleResponseChange(question.id, e.target.value)}
                        placeholder="Type your answer"
                      />
                    )}
                    
                    {question.type === "number" && (
                      <Input
                        type="number"
                        value={responses[question.id] || ""}
                        onChange={(e) => handleResponseChange(question.id, e.target.value)}
                        placeholder="Enter a number"
                      />
                    )}
                    
                    {question.type === "mcq" && question.options && (
                      <div className="space-y-2">
                        {question.options.map((option) => (
                          <label key={option} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name={question.id}
                              value={option}
                              checked={responses[question.id] === option}
                              onChange={(e) => handleResponseChange(question.id, e.target.value)}
                              className="text-blue-600"
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    
                    {question.type === "dropdown" && question.options && (
                      <Select
                        value={responses[question.id] || ""}
                        onValueChange={(value) => handleResponseChange(question.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          {question.options.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    {question.type === "scale" && (
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Button
                            key={value}
                            type="button"
                            variant={responses[question.id] === value.toString() ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleResponseChange(question.id, value.toString())}
                          >
                            {value}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Assessment"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
