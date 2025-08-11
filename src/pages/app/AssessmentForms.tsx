import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Save, Eye, Trash2, Copy, CheckCircle, ArrowLeft, Settings, FileText, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { createAuthenticatedApi } from "@/lib/api";

interface AssessmentForm {
  id: string;
  name: string;
  description?: string;
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

const defaultSchema = {
  type: "object",
  properties: {
    investment_experience: {
      type: "string",
      title: "What is your investment experience?",
      enum: ["None", "Beginner", "Intermediate", "Advanced"],
      default: "None"
    },
    risk_tolerance: {
      type: "string",
      title: "How would you describe your risk tolerance?",
      enum: ["Conservative", "Moderate", "Aggressive"],
      default: "Moderate"
    },
    investment_horizon: {
      type: "string",
      title: "What is your investment time horizon?",
      enum: ["Less than 3 years", "3-5 years", "5-10 years", "More than 10 years"],
      default: "5-10 years"
    },
    financial_goals: {
      type: "string",
      title: "What is your primary financial goal?",
      enum: ["Capital preservation", "Income generation", "Growth", "Tax efficiency"],
      default: "Growth"
    },
    emergency_fund: {
      type: "string",
      title: "Do you have an emergency fund?",
      enum: ["Yes, 6+ months", "Yes, 3-6 months", "Yes, less than 3 months", "No"],
      default: "Yes, 3-6 months"
    }
  },
  required: ["investment_experience", "risk_tolerance", "investment_horizon", "financial_goals", "emergency_fund"]
};

const defaultScoring = {
  weights: {
    investment_experience: 0.2,
    risk_tolerance: 0.3,
    investment_horizon: 0.25,
    financial_goals: 0.15,
    emergency_fund: 0.1
  },
  scoring: {
    investment_experience: { "None": 1, "Beginner": 2, "Intermediate": 3, "Advanced": 4 },
    risk_tolerance: { "Conservative": 1, "Moderate": 2, "Aggressive": 3 },
    investment_horizon: { "Less than 3 years": 1, "3-5 years": 2, "5-10 years": 3, "More than 10 years": 4 },
    financial_goals: { "Capital preservation": 1, "Income generation": 2, "Growth": 3, "Tax efficiency": 2 },
    emergency_fund: { "Yes, 6+ months": 3, "Yes, 3-6 months": 2, "Yes, less than 3 months": 1, "No": 0 }
  },
  thresholds: {
    low: { min: 0, max: 8 },
    medium: { min: 9, max: 12 },
    high: { min: 13, max: 16 }
  }
};

export default function AssessmentForms() {
  const { toast } = useToast();
  const { user, getToken } = useAuth();
  const navigate = useNavigate();
  
  const [assessments, setAssessments] = useState<AssessmentForm[]>([]);
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentForm | null>(null);
  const [schema, setSchema] = useState(defaultSchema);
  const [scoring, setScoring] = useState(defaultScoring);
  const [assessmentName, setAssessmentName] = useState("Default Risk Assessment");
  const [assessmentDescription, setAssessmentDescription] = useState("Comprehensive risk assessment for mutual fund investments");
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'schema' | 'scoring'>('form');

  useEffect(() => {
    loadAssessments();
  }, []);

  useEffect(() => {
    if (user) {
      console.log('🔍 AssessmentForms: User data:', user);
      console.log('🔍 AssessmentForms: User referral_link:', user.referral_link);
      
      if (!user.referral_link) {
        console.warn('⚠️ AssessmentForms: User missing referral_link');
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
        
        // Set the first assessment as current
        const firstAssessment = response.data.forms[0];
        setCurrentAssessment(firstAssessment);
        setAssessmentName(firstAssessment.name);
        setAssessmentDescription(firstAssessment.description || '');
        setIsActive(firstAssessment.is_active);
        
        // Load the latest version's schema and scoring
        if (firstAssessment.versions && firstAssessment.versions.length > 0) {
          const latestVersion = firstAssessment.versions[0]; // Assuming sorted by version desc
          setSchema(latestVersion.schema);
          setScoring(latestVersion.scoring || defaultScoring);
        }
      } else {
        // Create default assessment if none exists
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
      
      // Create the form
      const formResponse = await api.post('/api/assessments/forms', {
        name: assessmentName,
        description: assessmentDescription,
        is_active: isActive
      });

      const newForm = formResponse.data.form;
      
      // Create the first version
      const versionResponse = await api.post(`/api/assessments/forms/${newForm.id}/versions`, {
        schema,
        scoring
      });

      const newVersion = versionResponse.data.version;
      
      // Set as default
      await api.post('/api/assessments/users/default', {
        formId: newForm.id
      });

      // Update state
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

      // Generate referral link
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
      
      // Update form details
      await api.put(`/api/assessments/forms/${currentAssessment.id}`, {
        name: assessmentName,
        description: assessmentDescription,
        is_active: isActive
      });

      // Create new version with updated schema and scoring
      const versionResponse = await api.post(`/api/assessments/forms/${currentAssessment.id}/versions`, {
        schema,
        scoring
      });

      const newVersion = versionResponse.data.version;
      
      // Update current assessment with new version
      const updatedAssessment = {
        ...currentAssessment,
        name: assessmentName,
        description: assessmentDescription,
        is_active: isActive,
        versions: [newVersion, ...(currentAssessment.versions || [])]
      };
      
      setCurrentAssessment(updatedAssessment);
      setAssessments(assessments.map(a => 
        a.id === currentAssessment.id ? updatedAssessment : a
      ));

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
    setSchema(defaultSchema);
    setScoring(defaultScoring);
    setAssessmentName("Default Risk Assessment");
    setAssessmentDescription("Comprehensive risk assessment for mutual fund investments");
    setIsActive(true);
    
    toast({
      title: "Reset",
      description: "Assessment reset to default values",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Loading assessments...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Assessment Forms - OneMFin</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Assessment Forms</h1>
            <p className="text-gray-600 mt-2">Design and manage your risk assessment forms</p>
          </div>
          <Button onClick={() => navigate('/app/assessments')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Assessments
          </Button>
        </div>

        {currentAssessment && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Form Builder */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Form Builder
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assessment Name
                    </label>
                    <Input
                      value={assessmentName}
                      onChange={(e) => setAssessmentName(e.target.value)}
                      placeholder="Enter assessment name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <Textarea
                      value={assessmentDescription}
                      onChange={(e) => setAssessmentDescription(e.target.value)}
                      placeholder="Enter assessment description"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={isActive}
                      onCheckedChange={setIsActive}
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Active
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Schema Editor */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="w-5 h-5" />
                    Form Schema (JSON)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={JSON.stringify(schema, null, 2)}
                    onChange={(e) => {
                      try {
                        const newSchema = JSON.parse(e.target.value);
                        setSchema(newSchema);
                      } catch (error) {
                        // Invalid JSON, don't update
                      }
                    }}
                    placeholder="Enter JSON schema"
                    rows={15}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Edit the JSON schema to define your form structure. Use JSON Schema format.
                  </p>
                </CardContent>
              </Card>

              {/* Scoring Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Scoring Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={JSON.stringify(scoring, null, 2)}
                    onChange={(e) => {
                      try {
                        const newScoring = JSON.parse(e.target.value);
                        setScoring(newScoring);
                      } catch (error) {
                        // Invalid JSON, don't update
                      }
                    }}
                    placeholder="Enter scoring configuration"
                    rows={15}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Define weights, scoring rules, and risk category thresholds.
                  </p>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button onClick={saveAssessment} disabled={isSaving} className="flex-1">
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
                
                <Button onClick={resetToDefaults} variant="outline">
                  Reset to Defaults
                </Button>
              </div>
            </div>

            {/* Right Column - Preview & Actions */}
            <div className="space-y-6">
              {/* Assessment Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Assessment Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Version
                    </label>
                    <p className="text-sm text-gray-600">
                      {currentAssessment.versions?.[0]?.version || 'No versions'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Created
                    </label>
                    <p className="text-sm text-gray-600">
                      {new Date(currentAssessment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <div className="flex items-center gap-2">
                      {currentAssessment.is_active ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600">Active</span>
                        </>
                      ) : (
                        <>
                          <div className="w-4 h-4 rounded-full bg-gray-300"></div>
                          <span className="text-sm text-gray-600">Inactive</span>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Referral Link */}
              {user?.referral_link && (
                <Card>
                  <CardHeader>
                    <CardTitle>Referral Link</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Input
                        value={`${window.location.origin}${user.referral_link}`}
                        readOnly
                        className="text-sm"
                      />
                      <Button onClick={copyReferralLink} size="sm" variant="outline">
                        {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Share this link with potential clients to complete your assessment.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={() => setShowPreview(!showPreview)} 
                    variant="outline" 
                    className="w-full"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {showPreview ? 'Hide' : 'Show'} Preview
                  </Button>
                  
                  <Button 
                    onClick={() => navigate('/app/assessments')} 
                    variant="outline" 
                    className="w-full"
                  >
                    View All Forms
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Form Preview</h3>
                <Button onClick={() => setShowPreview(false)} variant="outline" size="sm">
                  Close
                </Button>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium">{assessmentName}</h4>
                {assessmentDescription && (
                  <p className="text-gray-600">{assessmentDescription}</p>
                )}
                
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h5 className="font-medium mb-3">Form Fields:</h5>
                  <div className="space-y-3">
                    {Object.entries(schema.properties || {}).map(([key, field]: [string, any]) => (
                      <div key={key} className="border-b pb-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.title || key}
                          {schema.required?.includes(key) && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {field.type === 'string' && field.enum ? (
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                            <SelectContent>
                              {field.enum.map((option: string) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input placeholder={`Enter ${field.title || key}`} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
