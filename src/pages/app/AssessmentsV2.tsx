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
  Clock
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

interface AssessmentSnapshot {
  id: string;
  qkey: string;
  label: string;
  qtype: string;
  options: any;
  required: boolean;
  order_index: number;
}

export default function AssessmentsV2() {
  const { toast } = useToast();
  const { user, getToken } = useAuth();
  
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [selectedFramework, setSelectedFramework] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Risk Assessments</h1>
          <p className="text-muted-foreground">
            Configure and manage your risk assessment frameworks
          </p>
        </div>

        {/* Default Assessment Card */}
        {assessments.filter(a => a.is_default).map(assessment => (
          <Card key={assessment.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Default Assessment
                {assessment.is_published && (
                  <Badge variant="secondary" className="ml-2">
                    Published
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{assessment.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Framework: {getFrameworkName(assessment.framework_version_id)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Last updated: {new Date(assessment.updated_at).toLocaleDateString()}
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
            </CardContent>
          </Card>
        ))}

        {/* Risk Assessment Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Risk Assessment Scoring Configuration
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose the active risk-scoring framework for your assessments
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
                  <div key={version.id} className="flex items-center space-x-3">
                    <RadioGroupItem value={version.id} id={version.id} />
                    <Label htmlFor={version.id} className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{framework.name}</span>
                          <span className="text-sm text-muted-foreground ml-2">v{version.version}</span>
                          {version.is_default && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Platform Default
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {getEngineIcon(framework.engine)}
                          <span className="capitalize">{framework.engine.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {framework.description}
                      </p>
                    </Label>
                  </div>
                ))
              )}
            </RadioGroup>
            
            <Separator />
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Changing the framework will regenerate the question snapshot for your default assessment
              </p>
              <Button 
                onClick={updateFramework} 
                disabled={isUpdating || !selectedFramework}
              >
                {isUpdating ? 'Updating...' : 'Save Configuration'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Questions Preview */}
        {assessments.filter(a => a.is_default).map(assessment => (
          <Card key={`questions-${assessment.id}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Assessment Questions
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Questions from the current framework configuration
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Framework: <span className="font-medium">{getFrameworkName(assessment.framework_version_id)}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Questions will be automatically updated when you change the framework above.
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Other Assessments */}
        {assessments.filter(a => !a.is_default).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Other Assessments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {assessments.filter(a => !a.is_default).map(assessment => (
                  <div key={assessment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{assessment.title}</p>
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
