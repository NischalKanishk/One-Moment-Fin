import { Helmet } from "react-helmet-async";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Save, 
  Eye, 
  Trash2, 
  Copy, 
  CheckCircle, 
  ArrowLeft, 
  Settings, 
  FileText, 
  Code,
  Brain,
  Sparkles,
  GripVertical,
  X,
  Edit3,
  Zap,
  Lightbulb,
  Target,
  BarChart3,
  Link,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { createAuthenticatedApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  title: string;
  type: 'text' | 'select' | 'multiselect' | 'number' | 'radio' | 'checkbox';
  required: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
}

interface AssessmentForm {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  versions?: AssessmentFormVersion[];
}

interface AssessmentFormVersion {
  id: string;
  version: number;
  schema: any;
  ui?: any;
  scoring?: any;
  created_at: string;
}

interface ScoringConfig {
  weights: Record<string, number>;
  scoring: Record<string, Record<string, number>>;
  thresholds: {
    low: { min: number; max: number };
    medium: { min: number; max: number };
    high: { min: number; max: number };
  };
  reasoning?: string;
}

const defaultQuestions: Question[] = [
  {
    id: 'investment_experience',
    title: 'What is your investment experience?',
    type: 'select',
    required: true,
    options: ['None', 'Beginner', 'Intermediate', 'Advanced'],
    helpText: 'This helps us understand your familiarity with financial products'
  },
  {
    id: 'risk_tolerance',
    title: 'How would you describe your risk tolerance?',
    type: 'select',
    required: true,
    options: ['Conservative', 'Moderate', 'Aggressive'],
    helpText: 'Your comfort level with investment volatility'
  },
  {
    id: 'investment_horizon',
    title: 'What is your investment time horizon?',
    type: 'select',
    required: true,
    options: ['Less than 3 years', '3-5 years', '5-10 years', 'More than 10 years'],
    helpText: 'How long you plan to stay invested'
  },
  {
    id: 'financial_goals',
    title: 'What is your primary financial goal?',
    type: 'select',
    required: true,
    options: ['Capital preservation', 'Income generation', 'Growth', 'Tax efficiency'],
    helpText: 'Your main objective for this investment'
  },
  {
    id: 'emergency_fund',
    title: 'Do you have an emergency fund?',
    type: 'select',
    required: true,
    options: ['Yes, 6+ months', 'Yes, 3-6 months', 'Yes, less than 3 months', 'No'],
    helpText: 'This indicates your financial preparedness'
  }
];

const questionTypes = [
  { value: 'text', label: 'Text Input', icon: '📝', description: 'Free text response' },
  { value: 'select', label: 'Single Select', icon: '🔽', description: 'Choose one option' },
  { value: 'multiselect', label: 'Multi Select', icon: '☑️', description: 'Choose multiple options' },
  { value: 'number', label: 'Number Input', icon: '🔢', description: 'Numeric response' },
  { value: 'radio', label: 'Radio Buttons', icon: '🔘', description: 'Single choice from options' },
  { value: 'checkbox', label: 'Checkboxes', icon: '☑️', description: 'Multiple choice from options' }
];

export default function AssessmentForms() {
  const { toast } = useToast();
  const { user, getToken } = useAuth();
  const navigate = useNavigate();
  
  const [assessments, setAssessments] = useState<AssessmentForm[]>([]);
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentForm | null>(null);
  const [questions, setQuestions] = useState<Question[]>(defaultQuestions);
  const [assessmentName, setAssessmentName] = useState("Default Risk Assessment");
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'scoring' | 'public'>('form');
  const [aiScoringEnabled, setAiScoringEnabled] = useState(true);
  const [scoringConfig, setScoringConfig] = useState<ScoringConfig>({
    weights: {},
    scoring: {},
    thresholds: {
      low: { min: 0, max: 8 },
      medium: { min: 9, max: 12 },
      high: { min: 13, max: 16 }
    }
  });
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  useEffect(() => {
    loadAssessments();
  }, []);

  useEffect(() => {
    if (user) {
      if (!user.referral_link) {
        toast({
          title: "Warning",
          description: "Referral link not found. Please complete your profile setup.",
          variant: "destructive",
        });
      }
    }
  }, [user, toast]);

  const loadAssessments = async () => {
    try {
      setIsLoading(true);
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
      const response = await api.get('/api/assessments/forms');
      
      if (response.data.forms && response.data.forms.length > 0) {
        setAssessments(response.data.forms);
        
        const firstAssessment = response.data.forms[0];
        setCurrentAssessment(firstAssessment);
        setAssessmentName(firstAssessment.name);
        setIsActive(firstAssessment.is_active);
        
        if (firstAssessment.versions && firstAssessment.versions.length > 0) {
          const latestVersion = firstAssessment.versions[0];
          if (latestVersion.schema?.properties) {
            const loadedQuestions = Object.entries(latestVersion.schema.properties).map(([key, field]: [string, any]) => ({
              id: key,
              title: field.title || key,
              type: (field.type === 'string' && field.enum ? 'select' : 'text') as 'text' | 'select' | 'multiselect' | 'number' | 'radio' | 'checkbox',
              required: latestVersion.schema.required?.includes(key) || false,
              options: field.enum || undefined,
              placeholder: field.placeholder,
              helpText: field.description
            }));
            setQuestions(loadedQuestions);
          }
          if (latestVersion.scoring) {
            setScoringConfig(latestVersion.scoring);
          }
        }
      } else {
        await createDefaultAssessment(token);
      }
    } catch (error: any) {
      console.error("Failed to load assessments:", error);
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
      const api = createAuthenticatedApi(token);
      
      const formResponse = await api.post('/api/assessments/forms', {
        name: assessmentName,
        is_active: isActive
      });

      const newForm = formResponse.data.form;
      
      const schema = questionsToSchema(questions);
      const scoring = generateScoringConfig(questions);
      
      const versionResponse = await api.post(`/api/assessments/forms/${newForm.id}/versions`, {
        schema,
        scoring
      });

      const newVersion = versionResponse.data.version;
      
      await api.post('/api/assessments/users/default', {
        formId: newForm.id
      });

      const assessmentWithVersion = {
        ...newForm,
        versions: [newVersion]
      };
      
      setAssessments([assessmentWithVersion]);
      setCurrentAssessment(assessmentWithVersion);
      
      toast({
        title: "Success",
        description: "Default assessment created successfully!",
      });

      if (user?.referral_link) {
        setPreviewUrl(`${window.location.origin}${user.referral_link}`);
      }
    } catch (error: any) {
      console.error("Failed to create default assessment:", error);
      toast({
        title: "Error",
        description: "Failed to create default assessment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const questionsToSchema = (questions: Question[]) => {
    const properties: any = {};
    const required: string[] = [];

    questions.forEach(question => {
      if (question.required) {
        required.push(question.id);
      }

      if (question.type === 'select' || question.type === 'radio') {
        properties[question.id] = {
          type: 'string',
          title: question.title,
          description: question.helpText,
          enum: question.options || [],
          default: question.options?.[0] || ''
        };
      } else if (question.type === 'multiselect' || question.type === 'checkbox') {
        properties[question.id] = {
          type: 'array',
          title: question.title,
          description: question.helpText,
          items: {
            type: 'string',
            enum: question.options || []
          },
          default: []
        };
      } else if (question.type === 'number') {
        properties[question.id] = {
          type: 'number',
          title: question.title,
          description: question.helpText,
          minimum: 0
        };
      } else {
        properties[question.id] = {
          type: 'string',
          title: question.title,
          description: question.helpText
        };
      }
    });

    return {
      type: 'object',
      properties,
      required
    };
  };

  const generateScoringConfig = (questions: Question[]) => {
    const weights: any = {};
    const scoring: any = {};
    
    questions.forEach((question, index) => {
      const weight = 1 / questions.length;
      weights[question.id] = weight;
      
      if (question.options) {
        scoring[question.id] = {};
        question.options.forEach((option, optionIndex) => {
          scoring[question.id][option] = optionIndex + 1;
        });
      }
    });

    return {
      weights,
      scoring,
      thresholds: {
        low: { min: 0, max: Math.floor(questions.length * 1.5) },
        medium: { min: Math.floor(questions.length * 1.5) + 1, max: Math.floor(questions.length * 2.5) },
        high: { min: Math.floor(questions.length * 2.5) + 1, max: questions.length * 3 }
      }
    };
  };

  const saveAssessment = async () => {
    if (!currentAssessment) return;
    
    try {
      setIsSaving(true);
      const token = await getToken();
      
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please sign in again",
          variant: "destructive",
        });
        return;
      }

      const api = createAuthenticatedApi(token);
      
      await api.put(`/api/assessments/forms/${currentAssessment.id}`, {
        name: assessmentName,
        is_active: isActive
      });

      const schema = questionsToSchema(questions);
      const scoring = aiScoringEnabled ? scoringConfig : generateScoringConfig(questions);

      const versionResponse = await api.post(`/api/assessments/forms/${currentAssessment.id}/versions`, {
        schema,
        scoring
      });

      const newVersion = versionResponse.data.version;
      
      const updatedAssessment = {
        ...currentAssessment,
        name: assessmentName,
        is_active: isActive,
        versions: [newVersion, ...(currentAssessment.versions || [])]
      };
      
      setCurrentAssessment(updatedAssessment);
      setAssessments(assessments.map(a => 
        a.id === currentAssessment.id ? updatedAssessment : a
      ));

      setShowSaveSuccess(true);
      toast({
        title: "Success",
        description: "Assessment saved successfully! New version created.",
      });
    } catch (error: any) {
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

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `question_${Date.now()}`,
      title: 'New Question',
      type: 'text',
      required: false,
      helpText: 'Add helpful text to guide users'
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuestions(updatedQuestions);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const addOption = (questionIndex: number) => {
    const updatedQuestions = [...questions];
    if (!updatedQuestions[questionIndex].options) {
      updatedQuestions[questionIndex].options = [];
    }
    updatedQuestions[questionIndex].options!.push('New Option');
    setQuestions(updatedQuestions);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options![optionIndex] = value;
    setQuestions(updatedQuestions);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options!.splice(optionIndex, 1);
    setQuestions(updatedQuestions);
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

  const generateAIScoring = async () => {
    try {
      setIsGeneratingAI(true);
      const token = await getToken();
      if (!token) return;

      const api = createAuthenticatedApi(token);
      
      // Call AI service to generate intelligent scoring
      const response = await api.post('/api/ai/generate-scoring', {
        questions: questions.map(q => ({
          title: q.title,
          type: q.type,
          options: q.options
        }))
      });

      if (response.data.scoring) {
        setScoringConfig(response.data.scoring);
        toast({
          title: "AI Scoring Generated",
          description: "Intelligent scoring configuration created based on your questions!",
        });
      }
    } catch (error) {
      toast({
        title: "AI Scoring Failed",
        description: "Could not generate AI scoring. Using default configuration.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading your assessment forms...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Assessment Form Builder - OneMFin</title>
      </Helmet>

      {/* Full-screen layout without sidebar */}
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => navigate('/app/assessments')} 
                variant="ghost" 
                size="sm"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Assessments
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Assessment Form Builder</h1>
                <p className="text-sm text-gray-500">Create and customize your risk assessment forms</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => {
                  if (user?.referral_link) {
                    window.open(`${window.location.origin}${user.referral_link}`, '_blank');
                  } else {
                    toast({
                      title: "No Referral Link",
                      description: "Please complete your profile setup to get a referral link.",
                      variant: "destructive",
                    });
                  }
                }} 
                variant="outline"
                className="flex items-center gap-2 hover:bg-gray-50"
                disabled={!user?.referral_link}
              >
                <ExternalLink className="w-4 h-4" />
                View Live Form
              </Button>
              <Button 
                onClick={saveAssessment} 
                disabled={isSaving}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Assessment
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6">
          {currentAssessment && (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Assessment Info Card */}
              <div className="w-full">
                <Card className="bg-white border-0 shadow-xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-xl text-gray-900">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      Assessment Configuration
                    </CardTitle>
                    <p className="text-gray-600">Configure your risk assessment form settings and basic information</p>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Assessment Name Section */}
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <label className="block text-base font-semibold text-gray-700 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            Assessment Name
                          </label>
                          <Input
                            value={assessmentName}
                            onChange={(e) => setAssessmentName(e.target.value)}
                            placeholder="Enter a descriptive name for your assessment"
                            className="text-lg font-medium border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-12 px-4"
                          />
                          <p className="text-sm text-gray-500">
                            Choose a name that clearly describes what this assessment is for
                          </p>
                        </div>
                      </div>

                      {/* Right Side - Status Only */}
                      <div className="space-y-4">
                        {/* Status Section */}
                        <div className="space-y-3">
                          <label className="block text-base font-semibold text-gray-700 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Assessment Status
                          </label>
                          <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                              <CheckCircle2 className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Switch
                                  checked={isActive}
                                  onCheckedChange={setIsActive}
                                  disabled={true}
                                  className="data-[state=checked]:bg-green-600 data-[disabled]:opacity-50"
                                />
                                <span className="text-sm font-semibold text-green-800">Active</span>
                              </div>
                              <p className="text-sm text-green-700">This assessment is currently live and accepting responses</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content Tabs */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-200 bg-gray-50">
                  <nav className="flex space-x-8 px-6">
                    <button
                      onClick={() => setActiveTab('form')}
                      className={cn(
                        "py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                        activeTab === 'form'
                          ? "border-blue-600 text-blue-600 bg-white"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      )}
                    >
                      <FileText className="w-4 h-4 inline mr-2" />
                      Form Builder
                    </button>
                    <button
                      onClick={() => setActiveTab('scoring')}
                      className={cn(
                        "py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                        activeTab === 'scoring'
                          ? "border-blue-600 text-blue-600 bg-white"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      )}
                    >
                      <Brain className="w-4 h-4 inline mr-2" />
                      AI Scoring Configuration
                    </button>
                    <button
                      onClick={() => setActiveTab('public')}
                      className={cn(
                        "py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                        activeTab === 'public'
                          ? "border-blue-600 text-blue-600 bg-white"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      )}
                    >
                      <Link className="w-4 h-4 inline mr-2" />
                      Public Assessment Link
                    </button>
                  </nav>
                </div>

                <div className="p-6">
                  {activeTab === 'form' && (
                    <div className="space-y-6">
                      {/* Questions List */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">Assessment Questions</h3>
                            <p className="text-sm text-gray-600">Build your risk assessment form with custom questions</p>
                          </div>
                          <Button 
                            onClick={addQuestion} 
                            size="sm" 
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Question
                          </Button>
                        </div>

                        <div className="space-y-4">
                          {questions.map((question, index) => (
                            <Card key={question.id} className="border border-gray-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md">
                              <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                  <div className="flex-shrink-0 mt-2">
                                    <GripVertical className="w-5 h-5 text-gray-400" />
                                  </div>
                                  
                                  <div className="flex-1 space-y-4">
                                    {/* Question Header */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div className="md:col-span-2 space-y-2">
                                        <Input
                                          value={question.title}
                                          onChange={(e) => updateQuestion(index, 'title', e.target.value)}
                                          placeholder="Enter question text"
                                          className="font-medium border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                        />
                                        <Textarea
                                          value={question.helpText || ''}
                                          onChange={(e) => updateQuestion(index, 'helpText', e.target.value)}
                                          placeholder="Add helpful text to guide users (optional)"
                                          className="text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                          rows={2}
                                        />
                                      </div>
                                      
                                      <div className="space-y-3">
                                        <Select
                                          value={question.type}
                                          onValueChange={(value: any) => updateQuestion(index, 'type', value)}
                                        >
                                          <SelectTrigger className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {questionTypes.map(type => (
                                              <SelectItem key={type.value} value={type.value}>
                                                <div className="flex items-center gap-2">
                                                  <div>
                                                    <div className="font-medium">{type.label}</div>
                                                    <div className="text-xs text-gray-500">{type.description}</div>
                                                  </div>
                                                </div>
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        
                                        <div className="flex items-center space-x-2">
                                          <Switch
                                            checked={question.required}
                                            onCheckedChange={(checked) => updateQuestion(index, 'required', checked)}
                                            className="data-[state=checked]:bg-blue-600"
                                          />
                                          <span className="text-sm text-gray-700">Required</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Options for select/multiselect questions */}
                                    {(question.type === 'select' || question.type === 'multiselect' || question.type === 'radio' || question.type === 'checkbox') && (
                                      <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                          <label className="text-sm font-medium text-gray-700">Answer Options</label>
                                          <Button 
                                            onClick={() => addOption(index)} 
                                            size="sm" 
                                            variant="outline"
                                            className="border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                                          >
                                            <Plus className="w-3 h-3 mr-1" />
                                            Add Option
                                          </Button>
                                        </div>
                                        
                                        <div className="space-y-2">
                                          {question.options?.map((option, optionIndex) => (
                                            <div key={optionIndex} className="flex items-center gap-2">
                                              <Input
                                                value={option}
                                                onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                                                placeholder="Option text"
                                                className="text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                              />
                                              <Button
                                                onClick={() => removeOption(index, optionIndex)}
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                              >
                                                <X className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Placeholder for text/number questions */}
                                    {(question.type === 'text' || question.type === 'number') && (
                                      <div>
                                        <Input
                                          value={question.placeholder || ''}
                                          onChange={(e) => updateQuestion(index, 'placeholder', e.target.value)}
                                          placeholder="Placeholder text (optional)"
                                          className="text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                        />
                                      </div>
                                    )}
                                  </div>
                                  
                                  <Button
                                    onClick={() => removeQuestion(index)}
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'scoring' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">AI-Powered Scoring Configuration</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Configure intelligent scoring based on question responses and risk assessment best practices
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={aiScoringEnabled}
                            onCheckedChange={setAiScoringEnabled}
                            className="data-[state=checked]:bg-blue-600"
                          />
                          <span className="text-sm font-medium text-gray-700">AI Scoring</span>
                          
                          {aiScoringEnabled && (
                            <Button 
                              onClick={generateAIScoring} 
                              disabled={isGeneratingAI}
                              size="sm" 
                              variant="outline"
                              className="bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0 hover:from-purple-600 hover:to-blue-600 shadow-md"
                            >
                              {isGeneratingAI ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4 mr-2" />
                                  Generate AI Scoring
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>

                      {aiScoringEnabled ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Weights Configuration */}
                          <Card className="border-gray-200 shadow-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <Target className="w-4 h-4 text-blue-600" />
                                Question Weights
                              </CardTitle>
                              <p className="text-sm text-gray-600">Importance of each question in scoring</p>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {questions.map((question, index) => (
                                <div key={question.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                  <span className="text-sm text-gray-700 truncate flex-1 mr-2">
                                    {question.title}
                                  </span>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={scoringConfig.weights[question.id] || 0}
                                    onChange={(e) => setScoringConfig({
                                      ...scoringConfig,
                                      weights: {
                                        ...scoringConfig.weights,
                                        [question.id]: parseFloat(e.target.value) || 0
                                      }
                                    })}
                                    className="w-20 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                  />
                                </div>
                              ))}
                            </CardContent>
                          </Card>

                          {/* Thresholds Configuration */}
                          <Card className="border-gray-200 shadow-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-green-600" />
                                Risk Categories
                              </CardTitle>
                              <p className="text-sm text-gray-600">Score ranges for risk classification</p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {Object.entries(scoringConfig.thresholds).map(([category, range]) => (
                                <div key={category} className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700 capitalize flex items-center gap-2">
                                      {category === 'low' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                                      {category === 'medium' && <AlertCircle className="w-4 h-4 text-yellow-600" />}
                                      {category === 'high' && <AlertCircle className="w-4 h-4 text-red-600" />}
                                      {category} Risk
                                    </span>
                                    <Badge 
                                      variant={category === 'low' ? 'default' : category === 'medium' ? 'secondary' : 'destructive'}
                                      className="text-xs"
                                    >
                                      {range.min} - {range.max}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      value={range.min}
                                      onChange={(e) => setScoringConfig({
                                        ...scoringConfig,
                                        thresholds: {
                                          ...scoringConfig.thresholds,
                                          [category]: { ...range, min: parseInt(e.target.value) || 0 }
                                        }
                                      })}
                                      className="text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                      placeholder="Min"
                                    />
                                    <span className="text-gray-400">to</span>
                                    <Input
                                      type="number"
                                      value={range.max}
                                      onChange={(e) => setScoringConfig({
                                        ...scoringConfig,
                                        thresholds: {
                                          ...scoringConfig.thresholds,
                                          [category]: { ...range, max: parseInt(e.target.value) || 0 }
                                        }
                                      })}
                                      className="text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                      placeholder="Max"
                                    />
                                  </div>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <h4 className="text-lg font-medium text-gray-900 mb-2">AI Scoring Disabled</h4>
                          <p className="text-gray-600 mb-4">
                            Enable AI scoring to automatically generate intelligent scoring configurations
                          </p>
                          <Button 
                            onClick={() => setAiScoringEnabled(true)}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                          >
                            Enable AI Scoring
                          </Button>
                        </div>
                      )}

                      {/* AI Reasoning Display */}
                      {aiScoringEnabled && scoringConfig.reasoning && (
                        <Card className="border-gray-200 shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Lightbulb className="w-4 h-4 text-yellow-600" />
                              AI Scoring Logic
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
                              {scoringConfig.reasoning}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  {activeTab === 'public' && (
                    <div className="space-y-6">
                      <div className="text-center py-8">
                        <Link className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Public Assessment Link</h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                          Share this link with potential clients to let them complete your risk assessment form
                        </p>
                      </div>

                      {user?.referral_link ? (
                        <div className="max-w-2xl mx-auto space-y-6">
                          {/* Link Display Card */}
                          <Card className="border-gray-200 shadow-sm">
                            <CardHeader>
                              <CardTitle className="text-base flex items-center gap-2">
                                <Link className="w-4 h-4 text-green-600" />
                                Your Public Assessment Link
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="flex items-center gap-2">
                                <Input
                                  value={`${window.location.origin}${user.referral_link}`}
                                  readOnly
                                  className="text-sm border-gray-300 bg-gray-50 font-mono"
                                />
                                <Button 
                                  onClick={copyReferralLink} 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-gray-300 hover:border-green-500 hover:bg-green-50"
                                >
                                  {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                </Button>
                              </div>
                              
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                    Version {currentAssessment.versions?.[0]?.version || 1}
                                  </Badge>
                                  <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                                    {isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                                <Button 
                                  onClick={() => window.open(`${window.location.origin}${user.referral_link}`, '_blank')}
                                  size="sm" 
                                  variant="outline"
                                  className="border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  Test Form
                                </Button>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Instructions Card */}
                          <Card className="border-gray-200 shadow-sm">
                            <CardHeader>
                              <CardTitle className="text-base flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                How to Use
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="space-y-2 text-sm text-gray-700">
                                <div className="flex items-start gap-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                  <p>Share this link with potential clients via email, WhatsApp, or social media</p>
                                </div>
                                <div className="flex items-start gap-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                  <p>Clients can complete the assessment without creating an account</p>
                                </div>
                                <div className="flex items-start gap-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                  <p>All responses are automatically saved and linked to your account</p>
                                </div>
                                <div className="flex items-start gap-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                  <p>You'll receive notifications when new assessments are completed</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Stats Card */}
                          <Card className="border-gray-200 shadow-sm">
                            <CardHeader>
                              <CardTitle className="text-base flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-purple-600" />
                                Link Performance
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="p-3 bg-blue-50 rounded-lg">
                                  <div className="text-2xl font-bold text-blue-600">0</div>
                                  <div className="text-xs text-blue-600">Total Views</div>
                                </div>
                                <div className="p-3 bg-green-50 rounded-lg">
                                  <div className="text-2xl font-bold text-green-600">0</div>
                                  <div className="text-xs text-green-600">Completed</div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                          <h4 className="text-lg font-medium text-gray-900 mb-2">Referral Link Not Available</h4>
                          <p className="text-gray-600 mb-4">
                            Please complete your profile setup to get your referral link
                          </p>
                          <Button 
                            onClick={() => navigate('/app/profile')}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                          >
                            Complete Profile
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>


            </div>
          )}
        </div>
      </div>

      {/* Save Success Popup */}
      {showSaveSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Assessment Saved!</h3>
              <p className="text-gray-600 mb-6">
                Your assessment has been saved successfully. A new version has been created.
              </p>
              
              <div className="space-y-3">
                <Button 
                  onClick={() => {
                    if (user?.referral_link) {
                      window.open(`${window.location.origin}${user.referral_link}`, '_blank');
                    }
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  disabled={!user?.referral_link}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Live Form
                </Button>
                
                <Button 
                  onClick={() => setShowSaveSuccess(false)}
                  variant="outline"
                  className="w-full border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
