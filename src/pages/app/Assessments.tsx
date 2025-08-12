import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  FileText, 
  Clock, 
  Calendar,
  Brain,
  Play,
  Pencil,
  HelpCircle
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
  latest_version?: {
    id: string;
    version: number;
    schema: any;
    ui?: any;
    scoring?: any;
    created_at: string;
  };
}

export default function Assessments() {
  const { toast } = useToast();
  const { user, getToken } = useAuth();
  const navigate = useNavigate();
  
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState(false);


  useEffect(() => {
    loadAssessments();
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
    } catch (error: any) {
      console.error("Failed to load assessments:", error);
      
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

  const handleEditForm = (assessment: Assessment) => {
    navigate('/app/assessment/forms', { state: { assessmentId: assessment.id } });
  };

  const handleViewLive = (assessment: Assessment) => {
    if (user?.referral_link) {
      window.open(`${window.location.origin}${user.referral_link}`, '_blank');
    } else {
      toast({
        title: "No Referral Link",
        description: "Please complete your profile setup to get a referral link.",
        variant: "destructive",
      });
    }
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getQuestionCount = (assessment: Assessment) => {
    if (assessment.latest_version?.schema?.properties) {
      return Object.keys(assessment.latest_version.schema.properties).length;
    }
    return 0;
  };

  const getAIStatus = (assessment: Assessment) => {
    if (assessment.latest_version?.scoring?.reasoning) {
      return 'AI Generated';
    } else if (assessment.latest_version?.scoring) {
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
                  disabled
                  size="sm"
                  className="bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                  title="Coming soon. Stay updated"
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
              {/* Assessment Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                 {assessments.map((assessment) => (
                   <Card 
                     key={assessment.id} 
                     className="bg-white border-0 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer group"
                     onClick={() => handleEditForm(assessment)}
                   >
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                                                     <CardTitle className="text-lg text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                             {assessment.name}
                           </CardTitle>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(assessment.created_at)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatTime(assessment.created_at)}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-3">
                            <Badge 
                              variant={assessment.is_active ? "default" : "secondary"}
                              className={assessment.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                            >
                              {assessment.is_active ? "Active" : "Inactive"}
                            </Badge>
                            
                            {assessment.latest_version && (
                              <Badge variant="outline" className="border-blue-200 text-blue-700">
                                v{assessment.latest_version.version}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Stats Row */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-semibold text-gray-900">
                            {getQuestionCount(assessment)}
                          </div>
                          <div className="text-xs text-gray-600">Questions</div>
                        </div>
                        
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-semibold text-gray-900">
                            {getAIStatus(assessment)}
                          </div>
                          <div className="text-xs text-gray-600">AI Scoring</div>
                        </div>
                      </div>
                      
                      {/* Last Updated */}
                      {assessment.latest_version && (
                        <div className="text-xs text-gray-500 text-center">
                          Last updated: {formatDate(assessment.latest_version.created_at)}
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                                                 <Button
                           onClick={(e) => {
                             e.stopPropagation();
                             handleViewLive(assessment);
                           }}
                           variant="outline"
                           size="sm"
                           className="flex-1 border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                         >
                           <Play className="w-4 h-4 mr-2" />
                           View Live
                         </Button>
                        
                                                 <Button
                           onClick={(e) => {
                             e.stopPropagation();
                             handleEditForm(assessment);
                           }}
                           size="sm"
                           className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0"
                         >
                           <Pencil className="w-4 h-4 mr-2" />
                           Edit Form
                         </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              
            </div>
          )}


        </div>
      </div>
    </>
  );
}
