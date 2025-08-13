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
  ChevronRight
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
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [selectedFramework, setSelectedFramework] = useState<string>('');
  const [frameworkQuestions, setFrameworkQuestions] = useState<FrameworkQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedFramework) {
      loadFrameworkQuestions(selectedFramework);
    }
  }, [selectedFramework]);

  const loadData = async () => {
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
      
      // Load assessments and frameworks in parallel
      const [assessmentsResponse, frameworksResponse] = await Promise.all([
        api.get('/api/assessments'),
        api.get('/api/assessments/frameworks')
      ]);
      
      setAssessments(assessmentsResponse.data.assessments || []);
      setFrameworks(frameworksResponse.data.frameworks || []);
      
      // Set selected framework to the default assessment's framework
      const defaultAssessment = assessmentsResponse.data.assessments?.find((a: Assessment) => a.is_default);
      if (defaultAssessment) {
        setSelectedFramework(defaultAssessment.framework_version_id);
      }
    } catch (error: any) {
      console.error("Failed to load data:", error);
      
      let errorMessage = "Failed to load data. Please try again.";
      
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

  const loadFrameworkQuestions = async (frameworkVersionId: string) => {
    try {
      setIsLoadingQuestions(true);
      const token = await getToken();
      if (!token) return;

      const api = createAuthenticatedApi(token);
      const response = await api.get(`/api/assessments/frameworks/${frameworkVersionId}/questions`);
      
      if (response.data.questions) {
        setFrameworkQuestions(response.data.questions);
      } else {
        setFrameworkQuestions([]);
      }
    } catch (error) {
      console.error('Failed to load framework questions:', error);
      setFrameworkQuestions([]);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const updateFramework = async () => {
    if (!selectedFramework) return;
    
    try {
      setIsUpdating(true);
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
      
      // Update the default assessment with new framework
      const defaultAssessment = assessments.find(a => a.is_default);
      if (defaultAssessment) {
        await api.patch(`/api/assessments/${defaultAssessment.id}`, {
          framework_version_id: selectedFramework
        });
        
        toast({
          title: "Success",
          description: "Risk assessment framework updated successfully",
        });
        
        // Reload data to get updated snapshot
        await loadData();
      }
    } catch (error: any) {
      console.error("Failed to update framework:", error);
      toast({
        title: "Error",
        description: "Failed to update framework. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const copyAssessmentLink = async (slug: string) => {
    const link = `${window.location.origin}/a/${slug}`;
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

  const openAssessmentLink = (slug: string) => {
    window.open(`/a/${slug}`, '_blank');
  };

  const getFrameworkName = (frameworkVersionId: string) => {
    for (const framework of frameworks) {
      const version = framework.risk_framework_versions.find(v => v.id === frameworkVersionId);
      if (version) {
        return `${framework.name} v${version.version}`;
      }
    }
    return 'Unknown Framework';
  };

  const getEngineIcon = (engine: string) => {
    switch (engine) {
      case 'weighted_sum':
        return <BarChart3 className="h-4 w-4" />;
      case 'three_pillar':
        return <Users className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
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

  return (
    <>
      <Helmet>
        <title>Risk Assessments | OneMFin</title>
        <meta name="description" content="Manage your risk assessment frameworks and configurations" />
      </Helmet>

      <div className="space-y-6">
        {/* Header with Action Buttons */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Risk Assessments</h1>
            <p className="text-muted-foreground">
              Configure and manage your risk assessment frameworks
            </p>
          </div>
          
          {/* Action Buttons */}
          {assessments.filter(a => a.is_default).map(assessment => (
            <div key={assessment.id} className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => copyAssessmentLink(assessment.slug)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button
                variant="outline"
                onClick={() => openAssessmentLink(assessment.slug)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Form
              </Button>
            </div>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Assessment Questions */}
          <div className="space-y-4">
            {assessments.filter(a => a.is_default).map(assessment => (
              <Card key={`questions-${assessment.id}`} className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Assessment Questions
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Preview questions from your selected framework
                  </p>
                </CardHeader>
                <CardContent>
                  {selectedFramework ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        <span className="font-medium">{getFrameworkName(selectedFramework)}</span>
                      </div>
                      
                      {isLoadingQuestions ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                            <p className="text-sm text-muted-foreground">Loading questions...</p>
                          </div>
                        </div>
                      ) : frameworkQuestions.length > 0 ? (
                        <>
                          {/* Questions Summary */}
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                            <div className="grid grid-cols-2 gap-4 text-center">
                              <div>
                                <div className="text-2xl font-bold text-blue-900">{frameworkQuestions.length}</div>
                                <div className="text-xs text-blue-700 font-medium">Total Questions</div>
                              </div>
                              <div>
                                <div className="text-2xl font-bold text-blue-900">
                                  {frameworkQuestions.filter(q => q.required).length}
                                </div>
                                <div className="text-xs text-blue-700 font-medium">Required</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Questions List */}
                          <div className="space-y-4">
                            {frameworkQuestions
                              .sort((a, b) => a.order_index - b.order_index)
                              .map((question, index) => (
                              <div key={question.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                                <div className="flex items-start gap-3">
                                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                    {index + 1}
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
                                      {question.module && (
                                        <Badge variant="outline" className="text-xs px-2 py-1 bg-green-50 text-green-700 border-green-200">
                                          {question.module}
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    {/* Options Display */}
                                    {question.options && Array.isArray(question.options) && (
                                      <div className="bg-gray-50 rounded-md p-3">
                                        <div className="text-xs font-medium text-gray-700 mb-2">Options:</div>
                                        <div className="space-y-1">
                                          {question.options.map((option, optIndex) => (
                                            <div key={optIndex} className="flex items-center gap-2 text-sm text-gray-600">
                                              <ChevronRight className="h-3 w-3 text-gray-400" />
                                              <span>{option}</span>
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
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-12">
                          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-gray-500 font-medium mb-1">No questions found</p>
                          <p className="text-sm text-gray-400">This framework doesn't have any questions configured</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500 font-medium mb-1">Select a Framework</p>
                      <p className="text-sm text-gray-400">Choose a framework from the right panel to preview its questions</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Right Column - Risk Assessment Configuration */}
          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="h-5 w-5 text-purple-600" />
                  Framework Configuration
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Choose your risk assessment framework
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup
                  value={selectedFramework}
                  onValueChange={setSelectedFramework}
                  className="space-y-3"
                >
                  {frameworks.map(framework => 
                    framework.risk_framework_versions.map(version => (
                      <div key={version.id} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                        <RadioGroupItem value={version.id} id={version.id} className="mt-1" />
                        <Label htmlFor={version.id} className="flex-1 cursor-pointer">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">{framework.name}</span>
                                <span className="text-sm text-muted-foreground">v{version.version}</span>
                                {version.is_default && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    Default
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                {getEngineIcon(framework.engine)}
                                <span className="capitalize">{framework.engine.replace('_', ' ')}</span>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {framework.description}
                            </p>
                          </div>
                        </Label>
                      </div>
                    ))
                  )}
                </RadioGroup>
                
                <Separator />
                
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Changing the framework will update your assessment questions
                  </p>
                  <Button 
                    onClick={updateFramework} 
                    disabled={isUpdating || !selectedFramework}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isUpdating ? 'Updating...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Other Assessments - Full Width Below */}
        {assessments.filter(a => !a.is_default).length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Other Assessments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {assessments.filter(a => !a.is_default).map(assessment => (
                  <div key={assessment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                    <div>
                      <p className="font-semibold text-gray-900">{assessment.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Framework: {getFrameworkName(assessment.framework_version_id)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyAssessmentLink(assessment.slug)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAssessmentLink(assessment.slug)}
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
