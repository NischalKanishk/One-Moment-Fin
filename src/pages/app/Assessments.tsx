import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Settings, Users, BarChart3, ArrowRight, CheckCircle, Clock, AlertCircle } from "lucide-react";
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
  assessment_questions: any[];
}

export default function Assessments() {
  const { toast } = useToast();
  const { user, getToken } = useAuth();
  const navigate = useNavigate();
  
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalForms: 0,
    activeForms: 0,
    totalSubmissions: 0
  });

  useEffect(() => {
    loadAssessments();
  }, []);

  const loadAssessments = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      console.log('🔍 Assessments: Token received, length:', token?.length);
      
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please sign in again to access assessments",
          variant: "destructive",
        });
        return;
      }

      // Use the configured API client
      const api = createAuthenticatedApi(token);
      console.log('🔍 Assessments: Making API request to /api/assessments/forms');
      
      const response = await api.get('/api/assessments/forms');
      console.log('🔍 Assessments: API response received:', response.data);
      
      const data = response.data;
      
      // Handle case where user has no assessments yet
      if (!data.forms || data.forms.length === 0) {
        setAssessments([]);
        setStats({
          totalForms: 0,
          activeForms: 0,
          totalSubmissions: 0
        });
        return;
      }
      
      setAssessments(data.forms);
      setStats({
        totalForms: data.forms.length,
        activeForms: data.forms.filter((a: Assessment) => a.is_active).length,
        totalSubmissions: data.totalSubmissions || 0
      });
    } catch (error: any) {
      console.error("Failed to load assessments:", error);
      
      let errorMessage = "Failed to load assessments. Please try again.";
      
      if (error.response) {
        // API error response
        if (error.response.status === 401) {
          errorMessage = "Authentication failed. Please sign in again.";
        } else if (error.response.status === 403) {
          errorMessage = "Access denied. You don't have permission to view assessments.";
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.request) {
        // Network error
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message) {
        // Other error
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

  const handleManageForms = () => {
    navigate('/app/assessment/forms');
  };

  const handleViewAnalytics = () => {
    navigate('/app/assessment/analytics');
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
        <title>Assessment Management – OneMFin</title>
        <meta name="description" content="Manage your risk assessment forms and track lead submissions." />
        <link rel="canonical" href="/app/assessments" />
      </Helmet>

      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Assessment Management</h1>
            <p className="text-muted-foreground text-lg">
              Create, manage, and track your risk assessment forms
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={loadAssessments}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            ) : (
              <FileText className="h-4 w-4" />
            )}
            <span>Refresh</span>
          </Button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Forms</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalForms}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Active Forms</p>
                <p className="text-2xl font-bold text-green-900">{stats.activeForms}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Total Submissions</p>
                <p className="text-2xl font-bold text-purple-900">{stats.totalSubmissions}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No Assessments Message */}
      {assessments.length === 0 && (
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
          <CardContent className="p-6 text-center">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-xl font-semibold text-yellow-900 mb-2">No Assessment Forms Yet</h3>
            <p className="text-yellow-800 mb-4">
              You don't have any assessment forms yet. This usually means you're a new user and your default assessment is being created.
            </p>
            <div className="bg-yellow-100 p-3 rounded-lg border border-yellow-300">
              <p className="text-sm text-yellow-800 font-medium">What happens next?</p>
              <p className="text-xs text-yellow-700 mt-1">
                Your default risk assessment form should be created automatically. If you don't see it within a few minutes, please contact support.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manage Existing Forms */}
        <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-gray-400 hover:bg-gray-50/50" onClick={handleManageForms}>
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                <Settings className="w-6 h-6 text-gray-600" />
              </div>
              <Badge variant="secondary" className="group-hover:bg-gray-200">
                {assessments.length} Forms
              </Badge>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Manage Forms</h3>
            <p className="text-gray-600 mb-4">
              Edit existing forms, update questions, and manage form settings
            </p>
            <Button variant="outline" className="group-hover:bg-gray-100 transition-colors">
              Manage Forms
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Create New Form */}
        <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/50">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <Plus className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Create New Assessment</h3>
            <p className="text-gray-600 mb-4">
              Build a custom risk assessment form with your own questions and branding
            </p>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 font-medium">Coming Soon</p>
              <p className="text-xs text-blue-700 mt-1">
                This functionality will be available soon
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleViewAnalytics}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium">View Analytics</h4>
                <p className="text-sm text-muted-foreground">Track form performance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">View Submissions</h4>
                <p className="text-sm text-muted-foreground">See lead responses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h4 className="font-medium">Templates</h4>
                <p className="text-sm text-muted-foreground">Use pre-built forms</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>



      {/* Help Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h3>
              <p className="text-blue-800 mb-3">
                Learn how to create effective risk assessment forms and maximize lead generation.
              </p>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                  View Documentation
                </Button>
                <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                  Watch Tutorial
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
