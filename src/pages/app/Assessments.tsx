import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  FileText, 
  Clock, 
  Calendar,
  Brain,
  Play,
  Pencil,
  HelpCircle,
  Settings,
  BarChart3,
  Target,
  Zap,
  Shield,
  Star,
  BookOpen,
  TrendingUp,
  Users,
  Target as TargetIcon,
  Lightbulb,
  Lock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { createAuthenticatedApi } from "@/lib/api";

interface Assessment {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  questions?: Array<{
    id: string;
    question_text: string;
    type: string;
    options?: any;
    weight?: number;
  }>;
}

interface Framework {
  id: string;
  code: string;
  name: string;
  description: string;
  engine: string;
  risk_framework_versions: Array<{
    id: string;
    version: number;
    is_default: boolean;
    created_at: string;
  }>;
}

interface FrameworkQuestion {
  id: string;
  qkey: string;
  label: string;
  qtype: string;
  options: any;
  required: boolean;
  order_index: number;
  module: string;
}

export default function Assessments() {
  const { toast } = useToast();
  const { user, getToken } = useAuth();
  const navigate = useNavigate();
  
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [frameworkQuestions, setFrameworkQuestions] = useState<FrameworkQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFramework, setIsLoadingFramework] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadAssessments();
    loadCFAFrameworkQuestions();
  }, []);

  const loadAssessments = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Frontend: Starting to load assessments...');
      
      const token = await getToken();
      console.log('🔍 Frontend: Got token, length:', token?.length);
      
      if (!token) {
        console.error('❌ Frontend: No token available');
        toast({
          title: "Authentication Error",
          description: "Please sign in again to access assessments",
          variant: "destructive",
        });
        return;
      }

      console.log('🔍 Frontend: Creating authenticated API...');
      const api = createAuthenticatedApi(token);
      
      console.log('🔍 Frontend: Making API call to /api/assessments/forms...');
      const response = await api.get('/api/assessments/forms');
      
      console.log('✅ Frontend: API response received:', response);
      const data = response.data;
      console.log('✅ Frontend: Response data:', data);
      
      if (!data.forms || data.forms.length === 0) {
        console.log('ℹ️ Frontend: No forms in response, setting empty array');
        setAssessments([]);
        return;
      }
      
      console.log('✅ Frontend: Setting assessments:', data.forms);
      setAssessments(data.forms);
      
      // Set the first active assessment as selected, or the first one if none active
      const activeAssessment = data.forms.find((a: Assessment) => a.is_active) || data.forms[0];
      setSelectedAssessment(activeAssessment);
      console.log('✅ Frontend: Selected assessment:', activeAssessment);
      
    } catch (error: any) {
      console.error("❌ Frontend: Failed to load assessments:", error);
      
      let errorMessage = "Failed to load assessments. Please try again.";
      
      if (error.response) {
        console.error('❌ Frontend: Error response:', error.response);
        if (error.response.status === 401) {
          errorMessage = "Authentication failed. Please sign in again.";
        } else if (error.response.status === 403) {
          errorMessage = "Access denied. You don't have permission to view assessments.";
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.request) {
        console.error('❌ Frontend: Network error:', error.request);
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message) {
        console.error('❌ Frontend: Error message:', error.message);
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCFAFrameworkQuestions = async () => {
    try {
      setIsLoadingFramework(true);
      const token = await getToken();
      if (!token) return;

      const api = createAuthenticatedApi(token);
      const response = await api.get('/api/assessments/cfa/questions');
      
      if (response.data.questions && response.data.questions.length > 0) {
        setFrameworkQuestions(response.data.questions);
        console.log('✅ CFA framework questions loaded:', response.data.questions.length);
      } else {
        console.warn('⚠️ No CFA framework questions received from API');
        setFrameworkQuestions([]);
      }
    } catch (error) {
      console.error('❌ Failed to load CFA framework questions:', error);
      setFrameworkQuestions([]);
      
      // Show user-friendly error message
      toast({
        title: "Warning",
        description: "Could not load assessment questions. Some features may be limited.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingFramework(false);
    }
  };

  const handleEditForm = (assessment: Assessment) => {
    navigate('/app/assessment/forms', { state: { assessmentId: assessment.id } });
  };

  const handleViewLive = (assessment: Assessment) => {
    // Generate assessment link dynamically based on the assessment ID
    const assessmentLink = `${window.location.origin}/assessment/${assessment.id}`;
    window.open(assessmentLink, '_blank');
  };

  const handleViewForm = () => {
    if (!user?.assessment_link) {
      toast({
        title: "Assessment Link Not Found",
        description: "Your assessment link is not available. Please contact support.",
        variant: "destructive",
      });
      return;
    }
    
    // Navigate to the assessment form using the user's assessment_link
    navigate(`/a/${user.assessment_link}`);
  };

  const handleCreateNew = () => {
    navigate('/app/assessment/forms');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getQuestionCount = (assessment: Assessment) => {
    if (assessment.questions) {
      return assessment.questions.length;
    }
    return 0;
  };

  const getAIStatus = (assessment: Assessment) => {
    // This logic needs to be updated based on the new scoring structure
    // For now, we'll assume if questions exist, it's a manual assessment
    if (assessment.questions && assessment.questions.length > 0) {
      return 'Manual';
    }
    return 'Not Configured';
  };

  const getAIStatusColor = (status: string) => {
    switch (status) {
      case 'AI Generated':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Manual':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoringMethod = (assessment: Assessment) => {
    // This logic needs to be updated based on the new scoring structure
    // For now, we'll assume if questions exist, it's a manual assessment
    if (assessment.questions && assessment.questions.length > 0) {
      return 'Manual Scoring';
    }
    return 'Not Configured';
  };

  const getQuestionTypeLabel = (qtype: string) => {
    switch (qtype) {
      case 'single': return 'Single Choice';
      case 'multi': return 'Multiple Choice';
      case 'scale': return 'Rating Scale';
      case 'number': return 'Number Input';
      case 'percent': return 'Percentage';
      case 'text': return 'Text Input';
      default: return qtype.charAt(0).toUpperCase() + qtype.slice(1);
    }
  };

  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'profile': return <Users className="w-4 h-4" />;
      case 'capacity': return <TrendingUp className="w-4 h-4" />;
      case 'behavior': return <Brain className="w-4 h-4" />;
      case 'knowledge': return <Lightbulb className="w-4 h-4" />;
      case 'need': return <TargetIcon className="w-4 h-4" />;
      case 'constraints': return <Lock className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getModuleLabel = (module: string) => {
    switch (module) {
      case 'profile': return 'Profile & Goals';
      case 'capacity': return 'Financial Capacity';
      case 'behavior': return 'Risk Tolerance';
      case 'knowledge': return 'Market Knowledge';
      case 'need': return 'Return Requirements';
      case 'constraints': return 'Investment Constraints';
      default: return module.charAt(0).toUpperCase() + module.slice(1);
    }
  };

  const getModuleColor = (module: string) => {
    switch (module) {
      case 'profile': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'capacity': return 'bg-green-50 border-green-200 text-green-800';
      case 'behavior': return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'knowledge': return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'need': return 'bg-red-50 border-red-200 text-red-800';
      case 'constraints': return 'bg-gray-50 border-gray-200 text-gray-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const groupQuestionsByModule = (questions: FrameworkQuestion[]) => {
    const grouped: { [key: string]: FrameworkQuestion[] } = {};
    questions.forEach(q => {
      if (!grouped[q.module]) {
        grouped[q.module] = [];
      }
      grouped[q.module].push(q);
    });
    
    // Sort questions within each module by order_index
    Object.keys(grouped).forEach(module => {
      grouped[module].sort((a, b) => a.order_index - b.order_index);
    });
    
    return grouped;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessments...</p>
        </div>
      </div>
    );
  }

  const groupedQuestions = groupQuestionsByModule(frameworkQuestions);

  // Safety check: if no questions are loaded, show appropriate message
  const hasQuestions = frameworkQuestions && frameworkQuestions.length > 0;
  const hasGroupedQuestions = Object.keys(groupedQuestions).length > 0;

  return (
    <>
      <Helmet>
        <title>Assessment Management – OneMFin</title>
        <meta name="description" content="Manage your risk assessment forms and track lead submissions." />
        <link rel="canonical" href="/app/assessments" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Assessment Management</h1>
                <p className="text-gray-600 mt-2">
                  Create, manage, and track your risk assessment forms
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => navigate('/help/assessments')}
                  variant="outline"
                  size="sm"
                  className="border-gray-300"
                >
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Help
                </Button>
                
                <Button
                  onClick={handleViewForm}
                  variant="outline"
                  size="sm"
                  className="border-green-300 hover:border-green-500 hover:bg-green-50"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Form
                </Button>
                
                <Button
                  onClick={handleCreateNew}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Assessment
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* CFA Framework Information Card */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm mb-8">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-blue-900 mb-2">CFA Three-Pillar Risk Assessment Framework</h2>
                  <p className="text-blue-800 mb-4">
                    Industry-standard framework that evaluates financial capacity, risk tolerance, and return requirements 
                    to determine optimal investment strategies for clients.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-blue-900">Capacity</div>
                        <div className="text-xs text-blue-700">Financial ability to take risk</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <Brain className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-blue-900">Tolerance</div>
                        <div className="text-xs text-blue-700">Psychological comfort with risk</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <TargetIcon className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-blue-900">Need</div>
                        <div className="text-xs text-blue-700">Required returns for goals</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* No Assessments Message */}
          {assessments.length === 0 ? (
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Assessment Forms Yet</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Create your first assessment form to start collecting client information and generating leads
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={handleViewForm}
                    variant="outline"
                    size="lg"
                    className="border-green-300 hover:border-green-500 hover:bg-green-50"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    View Form
                  </Button>
                  
                  <Button
                    onClick={handleCreateNew}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create Your First Assessment
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Assessment Selection */}
              <div className="flex gap-3 overflow-x-auto pb-2">
                {assessments.map((assessment) => (
                  <Button
                    key={assessment.id}
                    variant={selectedAssessment?.id === assessment.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedAssessment(assessment)}
                    className="whitespace-nowrap"
                  >
                    {assessment.name}
                    {assessment.is_active && (
                      <Star className="w-3 h-3 ml-2 text-yellow-400" />
                    )}
                  </Button>
                ))}
              </div>

              {/* Selected Assessment Details */}
              {selectedAssessment && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - Questions */}
                  <div className="lg:col-span-2">
                    <Card className="bg-white border-0 shadow-sm">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg text-gray-900">Assessment Questions</CardTitle>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                {frameworkQuestions.length} Questions
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {frameworkQuestions.length > 0 ? (
                          <>
                            {/* Questions Summary */}
                            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div>
                                  <div className="text-lg font-semibold text-blue-900">{frameworkQuestions.length}</div>
                                  <div className="text-xs text-blue-700">Total Questions</div>
                                </div>
                                <div>
                                  <div className="text-lg font-semibold text-blue-900">
                                    {frameworkQuestions.filter(q => q.qtype === 'single' || q.qtype === 'multi').length}
                                  </div>
                                  <div className="text-xs text-blue-700">Choice Questions</div>
                                </div>
                                <div>
                                  <div className="text-lg font-semibold text-blue-900">
                                    {frameworkQuestions.filter(q => q.qtype === 'text' || q.qtype === 'number' || q.qtype === 'percent').length}
                                  </div>
                                  <div className="text-xs text-blue-700">Input Questions</div>
                                </div>
                                <div>
                                  <div className="text-lg font-semibold text-blue-900">
                                    {frameworkQuestions.filter(q => q.required).length}
                                  </div>
                                  <div className="text-xs text-blue-700">Required</div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Questions by Module */}
                            <div className="space-y-6">
                              {Object.entries(groupedQuestions).map(([module, questions]) => (
                                <div key={module} className="space-y-3">
                                  <div className="flex items-center gap-2 mb-3">
                                    {getModuleIcon(module)}
                                    <h3 className="text-md font-semibold text-gray-900">{getModuleLabel(module)}</h3>
                                    <Badge variant="outline" className={`text-xs ${getModuleColor(module)}`}>
                                      {questions.length} questions
                                    </Badge>
                                  </div>
                                  
                                  <div className="space-y-3">
                                    {questions.map((question, index) => (
                                      <div key={question.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="flex items-start gap-3">
                                          <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                                            {question.order_index}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 mb-2">{question.label}</p>
                                            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                                              <Badge variant="outline" className="text-xs px-2 py-1">
                                                {getQuestionTypeLabel(question.qtype)}
                                              </Badge>
                                              {question.required && (
                                                <Badge variant="outline" className="text-xs px-2 py-1 bg-red-50 text-red-700 border-red-200">
                                                  Required
                                                </Badge>
                                              )}
                                            </div>
                                            {question.options && Array.isArray(question.options) && (
                                              <div className="mt-2 text-xs text-gray-600">
                                                <span className="font-medium">Options:</span> {question.options.map((opt: any) => opt.label || opt.value).join(', ')}
                                              </div>
                                            )}
                                            {question.options && typeof question.options === 'object' && !Array.isArray(question.options) && question.qtype === 'scale' && (
                                              <div className="mt-2 text-xs text-gray-600">
                                                <span className="font-medium">Scale:</span> {question.options.min} - {question.options.max}
                                                {question.options.labels && (
                                                  <span className="ml-2">({question.options.labels.join(' → ')})</span>
                                                )}
                                              </div>
                                            )}
                                            {question.options && typeof question.options === 'object' && !Array.isArray(question.options) && (question.qtype === 'number' || question.qtype === 'percent') && (
                                              <div className="mt-2 text-xs text-gray-600">
                                                <span className="font-medium">Range:</span> {question.options.min} - {question.options.max}
                                                {question.options.step && (
                                                  <span className="ml-2">(step: {question.options.step})</span>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="mb-2">Loading CFA Framework Questions</p>
                            <p className="text-sm text-gray-400 mb-4">Please wait while we load the assessment questions</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column - Framework Information */}
                  <div className="lg:col-span-1">
                    <Card className="bg-white border-0 shadow-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg text-gray-900">Framework Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* CFA Framework Details */}
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900">Framework</span>
                          </div>
                          <p className="text-sm text-blue-800">
                            CFA Three-Pillar (Capacity, Tolerance, Need)
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            Industry-standard risk assessment framework
                          </p>
                        </div>

                        {/* Engine Type */}
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-900">Scoring Engine</span>
                          </div>
                          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                            Three Pillar
                          </Badge>
                        </div>

                        {/* Version Info */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Settings className="w-4 h-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-900">Current Version</span>
                          </div>
                          <div className="text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <span>v1.0</span>
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                Default
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2 pt-2">
                          <Button
                            onClick={() => handleViewLive(selectedAssessment)}
                            variant="outline"
                            size="sm"
                            className="w-full border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Open Assessment Link
                          </Button>
                          
                          <Button
                            onClick={() => handleViewForm()}
                            variant="outline"
                            size="sm"
                            className="w-full border-green-300 hover:border-green-500 hover:bg-green-50"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            View Form
                          </Button>
                          
                          <Button
                            onClick={() => handleEditForm(selectedAssessment)}
                            size="sm"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0"
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Configuration
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Assessment Cards Grid - Compact View */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">All Assessments</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assessments.map((assessment) => (
                    <Card 
                      key={assessment.id} 
                      className={`bg-white border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                        selectedAssessment?.id === assessment.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => setSelectedAssessment(assessment)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base text-gray-900 mb-2">
                              {assessment.name}
                            </CardTitle>
                            
                            <div className="flex items-center gap-2 mb-2">
                              <Badge 
                                variant={assessment.is_active ? "default" : "secondary"}
                                className={assessment.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                              >
                                {assessment.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <div className="text-sm font-semibold text-gray-900">
                              {getQuestionCount(assessment)}
                            </div>
                            <div className="text-xs text-gray-600">Questions</div>
                          </div>
                          
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <div className="text-sm font-semibold text-gray-900">
                              {getAIStatus(assessment)}
                            </div>
                            <div className="text-xs text-gray-600">AI Scoring</div>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500 text-center mb-3">
                          Created: {formatDate(assessment.created_at)}
                        </div>
                        
                        {/* Action Button */}
                        <Button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent card selection
                            handleViewForm();
                          }}
                          variant="outline"
                          size="sm"
                          className="w-full border-green-300 hover:border-green-500 hover:bg-green-50"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          View Form
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
