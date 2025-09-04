import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Copy, 
  ExternalLink,
  Settings,
  Users,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  BookOpen,
  FileText,
  ChevronRight,
  Play,
  Brain,
  TrendingUp,
  Target as TargetIcon,
  Lightbulb,
  Lock,
  Plus,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createAuthenticatedApi } from "@/lib/api";

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

interface Assessment {
  id: string;
  title: string;
  slug: string;
  framework_version_id: string;
  is_default: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  is_active: boolean; // Added for active assessment
}

interface FrameworkQuestion {
  id: string;
  qkey: string;
  label: string;
  qtype: string;
  options: any;
  required: boolean;
  order_index: number;
  module?: string;
}

export default function AssessmentsV2() {
  const { toast } = useToast();
  const { user, getToken } = useAuth();
  
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
      
      const data = response.data;
      if (!data.forms || data.forms.length === 0) {
        setAssessments([]);
        return;
      }
      
      setAssessments(data.forms);
      
      // Set the first active assessment as selected, or the first one if none active
      const activeAssessment = data.forms.find((a: Assessment) => a.is_active) || data.forms[0];
      setSelectedAssessment(activeAssessment);
      } catch (error: any) {
      let errorMessage = "Failed to load assessments. Please try again.";
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = "Authentication failed. Please sign in again.";
        } else if (error.response.status === 403) {
          errorMessage = "Access denied. You don't have permission to view assessments.";
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.request) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message) {
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
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please sign in again to load assessment questions",
          variant: "destructive",
        });
        return;
      }

      const api = createAuthenticatedApi(token);
      
      const response = await api.get(`/api/assessments/cfa/questions`);
      
      if (response.data.questions && response.data.questions.length > 0) {
        setFrameworkQuestions(response.data.questions);
      } else {
        setFrameworkQuestions([]);
        toast({
          title: "Warning",
          description: "No assessment questions received from the server",
          variant: "destructive",
        });
      }
    } catch (error) {
      setFrameworkQuestions([]);
      
      // Show user-friendly error message
      toast({
        title: "Error Loading Questions",
        description: "Failed to load assessment questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingFramework(false);
    }
  };

  const copyAssessmentLink = async () => {
    if (!user?.assessment_link) {
      toast({
        title: "Assessment Link Not Found",
        description: "Click 'Create Link' to generate your assessment link",
        variant: "destructive",
      });
      return;
    }
    
    const link = `${window.location.origin}/a/${user.assessment_link}`;
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "Link copied!",
        description: "Assessment link copied to clipboard",
      });
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      toast({
        title: "Link copied!",
        description: "Assessment link copied to clipboard",
      });
    }
  };

  const createAssessmentLink = async () => {
    try {
      const token = await getToken();
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please sign in again to create assessment link",
          variant: "destructive",
        });
        return;
      }

      const api = createAuthenticatedApi(token);
      
      // First create a default CFA assessment form
      const formResponse = await api.post('/api/assessments/forms', {
        name: 'CFA Three-Pillar Risk Assessment',
        description: 'Default CFA framework assessment form',
        is_active: true
      });

      if (!formResponse.data.assessment) {
        throw new Error('Failed to create assessment form');
      }

      // Then create the assessment link
      const linkResponse = await api.post('/api/assessments/links', {
        form_id: formResponse.data.assessment.id,
        expires_in_days: 365
      });

      if (linkResponse.data.link) {
        // Update the user's assessment_link field
        try {
          const updateResponse = await api.put(`/api/auth/profile`, {
            assessment_link: linkResponse.data.link.token
          });
          
          if (updateResponse.data.user) {
            toast({
              title: "Assessment Link Created",
              description: "Your assessment link has been created and profile updated successfully",
            });
            
            // Refresh the page to get the updated user data
            window.location.reload();
          } else {
            throw new Error('Failed to update user profile');
          }
        } catch (updateError) {
          toast({
            title: "Link Created but Profile Update Failed",
            description: "Assessment link created but failed to update profile. Please refresh the page.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create assessment link. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openAssessmentLink = () => {
    if (!user?.assessment_link) {
      toast({
        title: "Assessment Link Not Found",
        description: "Click 'Create Link' to generate your assessment link",
        variant: "destructive",
      });
      return;
    }
    
    const link = `/a/${user.assessment_link}`;
    window.open(link, '_blank');
  };

  const openTestLiveForm = () => {
    if (!user?.assessment_link) {
      toast({
        title: "Assessment Link Not Found",
        description: "Your assessment link is not available. Please contact support.",
        variant: "destructive",
      });
      return;
    }
    // This function is now the same as openAssessmentLink, so we can call it directly
    openAssessmentLink();
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

  const getQuestionTypeColor = (qtype: string) => {
    switch (qtype) {
      case 'single': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'multi': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'scale': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'number': return 'bg-green-50 text-green-700 border-green-200';
      case 'percent': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'text': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'profile': return <Users className="w-4 h-4" />;
      case 'capacity': return <TrendingUp className="w-4 h-4" />;
      case 'tolerance': return <Brain className="w-4 h-4" />;
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
      case 'tolerance': return 'Risk Tolerance';
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
      case 'tolerance': return 'bg-purple-50 border-purple-200 text-purple-800';
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
      if (!grouped[q.module || 'other']) {
        grouped[q.module || 'other'] = [];
      }
      grouped[q.module || 'other'].push(q);
    });
    
    // Sort questions within each module by order_index
    Object.keys(grouped).forEach(module => {
      grouped[module].sort((a, b) => a.order_index - b.order_index);
    });
    
    return grouped;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading assessments...</p>
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
        <title>CFA Risk Assessments | OneMFin</title>
        <meta name="description" content="Manage your CFA Three-Pillar risk assessment framework" />
      </Helmet>

      <div className="space-y-6">

        {/* Header with Action Buttons */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">CFA Risk Assessments</h1>
            <p className="text-muted-foreground">
              Configure and manage your CFA Three-Pillar risk assessment framework
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Capacity
              </span>
              <span className="flex items-center gap-1">
                <Brain className="w-4 h-4 text-purple-600" />
                Tolerance
              </span>
              <span className="flex items-center gap-1">
                <TargetIcon className="w-4 h-4 text-red-600" />
                Need
              </span>
            </div>

          </div>
          
          {/* Action Buttons - Always show when user has assessment link */}
          {user?.assessment_link ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => copyAssessmentLink()}
                className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Assessment Link
              </Button>
              <Button
                variant="outline"
                onClick={() => openAssessmentLink()}
                className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Live Assessment Form
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => createAssessmentLink()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Assessment Link
            </Button>
          )}
        </div>

        {/* Single Column Layout */}
        <div className="space-y-4">
            {/* CFA Framework Questions Display */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  CFA Three-Pillar Framework Questions
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Preview questions from the CFA Three-Pillar framework
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span className="font-medium">CFA Three-Pillar Framework</span>
                  </div>
                  
                  {isLoadingFramework ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                        <p className="text-sm text-muted-foreground">Loading questions...</p>
                      </div>
                    </div>
                  ) : hasQuestions ? (
                    <>
                      {/* Questions Summary */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
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
                        {hasGroupedQuestions ? (
                          Object.entries(groupedQuestions).map(([module, questions]) => (
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
                                  <div key={question.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                                    <div className="flex items-start gap-3">
                                      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                        {question.order_index}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-2 leading-relaxed">
                                          {question.label}
                                        </h3>
                                        
                                        {/* Question Metadata */}
                                        <div className="flex flex-wrap gap-2 mb-3">
                                          <Badge 
                                            variant="outline" 
                                            className={`text-xs px-2 py-1 ${getQuestionTypeColor(question.qtype)}`}
                                          >
                                            {getQuestionTypeLabel(question.qtype)}
                                          </Badge>
                                          {question.required && (
                                            <Badge variant="outline" className="text-xs px-2 py-1 bg-red-50 text-red-700 border-red-200">
                                              Required
                                            </Badge>
                                          )}
                                        </div>
                                        
                                        {/* Options Display */}
                                        {question.options && Array.isArray(question.options) && (
                                          <div className="bg-gray-50 rounded-md p-3">
                                            <div className="text-xs font-medium text-gray-700 mb-2">Options:</div>
                                            <div className="space-y-1">
                                              {question.options.map((option: any, optIndex: number) => (
                                                <div key={optIndex} className="flex items-center gap-2 text-sm text-gray-600">
                                                  <ChevronRight className="h-3 w-3 text-gray-400" />
                                                  <span>{option.label || option.value || option}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Scale Display */}
                                        {question.options && typeof question.options === 'object' && !Array.isArray(question.options) && question.qtype === 'scale' && (
                                          <div className="bg-gray-50 rounded-md p-3">
                                            <div className="text-xs font-medium text-gray-700 mb-2">Scale Range:</div>
                                            <div className="text-sm text-gray-600">
                                              {question.options.min} to {question.options.max}
                                              {question.options.labels && (
                                                <span className="ml-2">({question.options.labels.join(' → ')})</span>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        {/* Number/Percent Range Display */}
                                        {question.options && typeof question.options === 'object' && !Array.isArray(question.options) && (question.qtype === 'number' || question.qtype === 'percent') && (
                                          <div className="bg-gray-50 rounded-md p-3">
                                            <div className="text-xs font-medium text-gray-700 mb-2">Range:</div>
                                            <div className="text-sm text-gray-600">
                                              {question.options.min} - {question.options.max}
                                              {question.options.step && (
                                                <span className="ml-2">(step: {question.options.step})</span>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="mb-2">No CFA Framework Questions Available</p>
                            <p className="text-sm text-gray-400 mb-4">The assessment questions could not be loaded</p>
                            <Button 
                              onClick={loadCFAFrameworkQuestions}
                              variant="outline"
                              size="sm"
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Retry Loading Questions
                            </Button>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500 font-medium mb-1">No questions loaded</p>
                      <p className="text-sm text-gray-400">
                        {isLoadingFramework ? 'Loading questions...' : 'Failed to load CFA framework questions. Please refresh the page.'}
                      </p>
                      {!isLoadingFramework && (
                        <Button 
                          onClick={() => loadCFAFrameworkQuestions()} 
                          variant="outline" 
                          size="sm" 
                          className="mt-3"
                        >
                          Retry Loading Questions
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
        </div>

        {/* Other Assessments - Full Width Below */}
        {assessments.filter(a => !a.is_default).length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-600" />
                Other Assessments
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Additional assessment forms you've created
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {assessments.filter(a => !a.is_default).map(assessment => (
                  <div key={assessment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                    <div>
                      <p className="font-semibold text-gray-900">{assessment.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Framework: {assessment.framework_version_id}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyAssessmentLink()}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAssessmentLink()}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Form
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

