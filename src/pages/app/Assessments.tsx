import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Star
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

export default function Assessments() {
  const { toast } = useToast();
  const { user, getToken } = useAuth();
  const navigate = useNavigate();
  
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);

  useEffect(() => {
    loadAssessments();
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

  const handleEditForm = (assessment: Assessment) => {
    navigate('/app/assessment/forms', { state: { assessmentId: assessment.id } });
  };

  const handleViewLive = (assessment: Assessment) => {
    // Generate assessment link dynamically based on the assessment ID
    const assessmentLink = `${window.location.origin}/assessment/${assessment.id}`;
    window.open(assessmentLink, '_blank');
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
                <Button
                  onClick={handleCreateNew}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Assessment
                </Button>
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
                          <CardTitle className="text-lg text-gray-900">Questions</CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {getQuestionCount(selectedAssessment)} Questions
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {selectedAssessment.questions ? (
                          <div className="space-y-3">
                            {selectedAssessment.questions.map((question, index) => (
                              <div key={question.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                                  {index + 1}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{question.question_text}</p>
                                  {question.type === 'radio' && question.options && question.options.length > 0 && (
                                    <div className="mt-2 text-xs text-gray-600">
                                      Options: {question.options.map((opt: any) => opt.label).join(', ')}
                                    </div>
                                  )}
                                  {question.type === 'checkbox' && question.options && question.options.length > 0 && (
                                    <div className="mt-2 text-xs text-gray-600">
                                      Options: {question.options.map((opt: any) => opt.label).join(', ')}
                                    </div>
                                  )}
                                  {question.type === 'text' && (
                                    <div className="mt-2 text-xs text-gray-600">
                                      Type: Text
                                    </div>
                                  )}
                                  {question.type === 'number' && (
                                    <div className="mt-2 text-xs text-gray-600">
                                      Type: Number
                                    </div>
                                  )}
                                  {question.type === 'rating' && (
                                    <div className="mt-2 text-xs text-gray-600">
                                      Type: Rating
                                    </div>
                                  )}
                                  {question.weight !== undefined && (
                                    <div className="mt-2 text-xs text-gray-600">
                                      Weight: {question.weight}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No questions configured yet</p>
                            <Button
                              onClick={() => handleEditForm(selectedAssessment)}
                              variant="outline"
                              size="sm"
                              className="mt-3"
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Configure Questions
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column - Scoring Configuration */}
                  <div className="lg:col-span-1">
                    <Card className="bg-white border-0 shadow-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg text-gray-900">Scoring Configuration</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Scoring Method */}
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <BarChart3 className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900">Method</span>
                          </div>
                          <p className="text-sm text-blue-800">{getScoringMethod(selectedAssessment)}</p>
                        </div>

                        {/* AI Status */}
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-900">AI Scoring</span>
                          </div>
                          <Badge className={getAIStatusColor(getAIStatus(selectedAssessment))}>
                            {getAIStatus(selectedAssessment)}
                          </Badge>
                        </div>

                        {/* Version Info */}
                        {/* This section needs to be updated to reflect the new assessment structure */}
                        {/* For now, we'll remove it as it's not directly applicable to the new questions structure */}
                        {/* {selectedAssessment.latest_version && (
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Settings className="w-4 h-4 text-gray-600" />
                              <span className="text-sm font-medium text-gray-900">Version</span>
                            </div>
                            <div className="text-sm text-gray-700">
                              <p>v{selectedAssessment.latest_version.version}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Updated: {formatDate(selectedAssessment.latest_version.created_at)}
                              </p>
                            </div>
                          </div>
                        )} */}

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
                              
                              {/* This section needs to be updated to reflect the new assessment structure */}
                              {/* For now, we'll remove it as it's not directly applicable to the new questions structure */}
                              {/* {assessment.latest_version && (
                                <Badge variant="outline" className="border-blue-200 text-blue-700 text-xs">
                                  v{assessment.latest_version.version}
                                </Badge>
                              )} */}
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
