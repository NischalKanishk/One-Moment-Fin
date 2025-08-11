import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Save, Eye, Trash2, Copy, CheckCircle, ArrowLeft, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { createAuthenticatedApi } from "@/lib/api";

interface Question {
  id: string;
  question_text: string;
  type: "text" | "number" | "mcq" | "dropdown" | "scale";
  options?: string[];
  weight?: number;
}

interface Assessment {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  assessment_questions: Question[];
}

const defaultQuestions: Question[] = [
  { 
    id: "q1", 
    question_text: "Investment horizon", 
    type: "dropdown", 
    options: ["< 1 year", "1–3 years", "> 3 years"],
    weight: 1
  },
  { 
    id: "q2", 
    question_text: "Risk appetite", 
    type: "mcq", 
    options: ["Low", "Medium", "High"],
    weight: 2
  },
  { 
    id: "q3", 
    question_text: "Monthly investable amount (₹)", 
    type: "number",
    weight: 1
  },
  { 
    id: "q4", 
    question_text: "Experience with equities", 
    type: "mcq", 
    options: ["New", "Some", "Experienced"],
    weight: 1
  },
  { 
    id: "q5", 
    question_text: "Comfort with short-term volatility", 
    type: "scale", 
    options: ["1","2","3","4","5"],
    weight: 2
  },
];

export default function AssessmentForms() {
  const { toast } = useToast();
  const { user, getToken } = useAuth();
  const navigate = useNavigate();
  
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [currentAssessment, setCurrentAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>(defaultQuestions);
  const [assessmentName, setAssessmentName] = useState("Default Risk Assessment");
  const [assessmentDescription, setAssessmentDescription] = useState("Comprehensive risk assessment for mutual fund investments");
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadAssessments();
  }, []);

  // Debug: Check if user has referral_link
  useEffect(() => {
    if (user) {
      console.log('🔍 AssessmentForms: User data:', user);
      console.log('🔍 AssessmentForms: User referral_link:', user.referral_link);
      
      // If user doesn't have a referral_link, we need to generate one
      if (!user.referral_link) {
        console.warn('⚠️ AssessmentForms: User missing referral_link');
        toast({
          title: "Warning",
          description: "Referral link not found. Please complete your profile setup.",
          variant: "destructive",
        });
      }
    }
  }, [user]);

  const loadAssessments = async () => {
    try {
      console.log('🔍 AssessmentForms: Loading assessments...');
      setIsLoading(true);
      const token = await getToken();
      console.log('🔍 AssessmentForms: Token received, length:', token?.length);
      
      if (!token) {
        console.error('❌ AssessmentForms: No token received');
        toast({
          title: "Authentication Error",
          description: "Please sign in again to access assessments",
          variant: "destructive",
        });
        return;
      }

      // Use the real API to get assessment forms
      const api = createAuthenticatedApi(token);
      console.log('🔍 AssessmentForms: API instance created for GET request');
      
      console.log('🔍 AssessmentForms: Making API request to /api/assessments/forms');
      const response = await api.get('/api/assessments/forms');
      console.log('🔍 AssessmentForms: API response received:', response);
      
      if (response.data.forms && response.data.forms.length > 0) {
        console.log('🔍 AssessmentForms: Found existing assessments:', response.data.forms);
        setAssessments(response.data.forms);
        
        // Set current assessment to the active one or first one
        const activeAssessment = response.data.forms.find((a: Assessment) => a.is_active);
        if (activeAssessment) {
          console.log('🔍 AssessmentForms: Setting active assessment:', activeAssessment);
          setCurrentAssessment(activeAssessment);
          setQuestions(activeAssessment.assessment_questions);
          setAssessmentName(activeAssessment.name);
          setAssessmentDescription(activeAssessment.description || "");
          setIsActive(activeAssessment.is_active);
        }
      } else {
        console.log('🔍 AssessmentForms: No assessments found, creating default...');
        // No assessments exist yet, create a default one
        await createDefaultAssessment(token);
      }
    } catch (error) {
      console.error('❌ AssessmentForms: Failed to load assessments:', error);
      
      // Log more details about the error
      if (error.response) {
        console.error('❌ AssessmentForms: Error response status:', error.response.status);
        console.error('❌ AssessmentForms: Error response data:', error.response.data);
      } else if (error.request) {
        console.error('❌ AssessmentForms: No response received:', error.request);
      } else {
        console.error('❌ AssessmentForms: Error message:', error.message);
      }
      
      toast({
        title: "Error",
        description: "Failed to load assessments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultAssessment = async (token: string) => {
    try {
      console.log('🔍 AssessmentForms: Creating default assessment...');
      console.log('🔍 AssessmentForms: Token length:', token?.length);
      console.log('🔍 AssessmentForms: User data:', user);
      
      const api = createAuthenticatedApi(token);
      console.log('🔍 AssessmentForms: API instance created');
      
      const assessmentData = {
        name: "Default Risk Assessment",
        description: "Comprehensive risk assessment for mutual fund investments",
        questions: defaultQuestions,
        is_active: true
      };
      
      console.log('🔍 AssessmentForms: Sending assessment data:', assessmentData);
      
      const response = await api.post('/api/assessments/forms', assessmentData);
      console.log('🔍 AssessmentForms: API response received:', response);
      
      const newAssessment = response.data.form;
      console.log('🔍 AssessmentForms: New assessment created:', newAssessment);
      
      setAssessments([newAssessment]);
      setCurrentAssessment(newAssessment);
      setQuestions(newAssessment.assessment_questions);
      setAssessmentName(newAssessment.name);
      setAssessmentDescription(newAssessment.description || "");
      setIsActive(newAssessment.is_active);
      
      toast({
        title: "Success",
        description: "Default assessment created successfully",
      });
    } catch (error) {
      console.error('❌ AssessmentForms: Failed to create default assessment:', error);
      
      // Log more details about the error
      if (error.response) {
        console.error('❌ AssessmentForms: Error response status:', error.response.status);
        console.error('❌ AssessmentForms: Error response data:', error.response.data);
      } else if (error.request) {
        console.error('❌ AssessmentForms: No response received:', error.request);
      } else {
        console.error('❌ AssessmentForms: Error message:', error.message);
      }
      
      toast({
        title: "Error",
        description: "Failed to create default assessment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateQuestion = (id: string, patch: Partial<Question>) => {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const addQuestion = () => {
    const newQuestion = { 
      id: `q${Date.now()}`, 
      question_text: "New question", 
      type: "text" as const,
      weight: 1
    };
    setQuestions((qs) => [...qs, newQuestion]);
  };

  const removeQuestion = (id: string) => {
    setQuestions((qs) => qs.filter((q) => q.id !== id));
  };

  const saveAssessment = async () => {
    if (!assessmentName.trim()) {
      toast({
        title: "Error",
        description: "Assessment name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      const token = await getToken();
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please sign in again to access assessments",
          variant: "destructive",
        });
        return;
      }
      
      const api = createAuthenticatedApi(token);
      
      if (currentAssessment) {
        // Update existing assessment
        const response = await api.put(`/api/assessments/forms/${currentAssessment.id}`, {
          name: assessmentName,
          description: assessmentDescription,
          questions: questions,
          is_active: isActive
        });
        
        const updatedAssessment = response.data.form;
        setCurrentAssessment(updatedAssessment);
        setAssessments(prev => prev.map(a => a.id === updatedAssessment.id ? updatedAssessment : a));
        
        toast({
          title: "Success",
          description: "Assessment updated successfully",
        });
      } else {
        // Create new assessment
        const response = await api.post('/api/assessments/forms', {
          name: assessmentName,
          description: assessmentDescription,
          questions: questions,
          is_active: isActive
        });
        
        const newAssessment = response.data.form;
        setCurrentAssessment(newAssessment);
        setAssessments(prev => [...prev, newAssessment]);
        
        toast({
          title: "Success",
          description: "Assessment created successfully",
        });
      }
      
    } catch (error) {
      console.error("Failed to save assessment:", error);
      toast({
        title: "Error",
        description: "Failed to save assessment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const publishAssessment = async () => {
    if (!currentAssessment) {
      await saveAssessment();
    }
    
    if (user?.referral_link) {
      setPreviewUrl(`${window.location.origin}${user.referral_link}`);
      setShowPreview(true);
    } else {
      toast({
        title: "Error",
        description: "Referral link not found. Please check your profile settings.",
        variant: "destructive",
      });
    }
  };

  const copyReferralLink = async () => {
    if (user?.referral_link) {
      const fullUrl = `${window.location.origin}${user.referral_link}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetToDefaults = () => {
    setQuestions([...defaultQuestions]);
    setAssessmentName("Default Risk Assessment");
    setAssessmentDescription("Comprehensive risk assessment for mutual fund investments");
    setIsActive(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading assessments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Assessment Builder – OneMFin</title>
        <meta name="description" content="Create and edit risk assessments with AI generation." />
        <link rel="canonical" href="/app/assessment/forms" />
      </Helmet>

      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/app/assessments')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assessments
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetToDefaults}>
              Reset to Defaults
            </Button>
            <Button variant="outline" onClick={saveAssessment} disabled={isSaving}>
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
            <Button onClick={publishAssessment} disabled={!currentAssessment || !user?.referral_link}>
              <Eye className="mr-2 h-4 w-4" />
              Preview & Publish
            </Button>
          </div>
          
          {/* Help text for disabled button */}
          {(!currentAssessment || !user?.referral_link) && (
            <div className="text-sm text-muted-foreground">
              {!currentAssessment && "Save your assessment first to enable preview"}
              {!user?.referral_link && "Complete your profile setup to get a referral link"}
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Assessment Builder</h1>
          <p className="text-muted-foreground">
            Create and customize risk assessment forms for your leads
          </p>
        </div>
      </header>

      {/* Assessment Settings - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Assessment Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Assessment Name *</label>
              <Input
                value={assessmentName}
                onChange={(e) => setAssessmentName(e.target.value)}
                placeholder="Enter assessment name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={assessmentDescription}
                onChange={(e) => setAssessmentDescription(e.target.value)}
                placeholder="Enter assessment description"
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              id="is-active"
            />
            <label htmlFor="is-active" className="text-sm font-medium">
              Set as Active Assessment
            </label>
          </div>
          
          {currentAssessment && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Referral Link</p>
              <div className="flex items-center gap-2">
                <Input
                  value={user?.referral_link || ""}
                  readOnly
                  className="text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyReferralLink}
                >
                  {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Share this link with leads to access the assessment
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions and Live Preview - Side by Side */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Question Builder */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Questions</CardTitle>
            <Button size="sm" onClick={addQuestion}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map((q, index) => (
              <div key={q.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Question {index + 1}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeQuestion(q.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <Input
                  value={q.question_text}
                  onChange={(e) => updateQuestion(q.id, { question_text: e.target.value })}
                  placeholder="Enter question text"
                />
                
                <div className="flex flex-wrap items-center gap-3">
                  <Select
                    value={q.type}
                    onValueChange={(v: Question["type"]) => updateQuestion(q.id, { type: v })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="mcq">MCQ</SelectItem>
                      <SelectItem value="dropdown">Dropdown</SelectItem>
                      <SelectItem value="scale">Scale</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={q.weight || 1}
                    onChange={(e) => updateQuestion(q.id, { weight: parseInt(e.target.value) || 1 })}
                    className="w-20"
                    placeholder="Weight"
                  />
                  
                  {(q.type === "mcq" || q.type === "dropdown") && (
                    <Textarea
                      placeholder="Comma-separated options"
                      value={(q.options || []).join(", ")}
                      onChange={(e) => updateQuestion(q.id, { 
                        options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) 
                      })}
                      className="flex-1"
                      rows={2}
                    />
                  )}
                </div>
              </div>
            ))}
            
            {questions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No questions added yet</p>
                <Button variant="outline" onClick={addQuestion} className="mt-2">
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Question
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card className="bg-secondary/50">
          <CardHeader>
            <CardTitle className="text-lg">Live Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-4">
              {questions.map((q) => (
                <div key={q.id} className="space-y-2">
                  <label className="text-sm font-medium">
                    {q.question_text}
                    {q.weight && q.weight > 1 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Weight: {q.weight})
                      </span>
                    )}
                  </label>
                  
                  {q.type === "text" && (
                    <Input placeholder="Type here" disabled />
                  )}
                  
                  {q.type === "number" && (
                    <Input type="number" placeholder="0" disabled />
                  )}
                  
                  {q.type === "mcq" && q.options && (
                    <div className="space-y-2">
                      {q.options.map((o) => (
                        <label key={o} className="flex items-center space-x-2">
                          <input type="radio" disabled className="text-blue-600" />
                          <span className="text-sm">{o}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {q.type === "dropdown" && q.options && (
                    <Select disabled>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose" />
                      </SelectTrigger>
                      <SelectContent>
                        {q.options.map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {q.type === "scale" && (
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Button key={value} type="button" variant="outline" size="sm" disabled>
                          {value}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {questions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Add questions to see preview</p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Assessment Preview</h3>
                <Button variant="ghost" onClick={() => setShowPreview(false)}>
                  ×
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Your Assessment is Live!</h4>
                  <p className="text-sm text-blue-800 mb-3">
                    Share this link with your leads to capture them and get risk assessments:
                  </p>
                  <div className="flex items-center gap-2">
                    <Input value={previewUrl} readOnly className="text-sm" />
                    <Button size="sm" onClick={copyReferralLink}>
                      {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">What happens when a lead uses this link?</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Lead fills out the assessment form</li>
                    <li>• Lead information is automatically captured</li>
                    <li>• Risk assessment is calculated using AI</li>
                    <li>• New lead appears in your dashboard</li>
                    <li>• You can follow up with personalized recommendations</li>
                  </ul>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={() => setShowPreview(false)} className="flex-1">
                    Got it!
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => window.open(previewUrl, '_blank')}
                  >
                    Test the Form
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
