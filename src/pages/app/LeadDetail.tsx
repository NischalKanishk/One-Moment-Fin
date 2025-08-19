import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  Phone, 
  Mail, 
  ExternalLink,
  User,
  TrendingUp,
  FileText,
  Edit,
  Trash2,
  ArrowLeft,
  Plus,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { leadsAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { LeadAutocomplete } from "@/components/LeadAutocomplete";
import { 
  Dialog, 
  DialogTrigger, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogClose 
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { formatSourceLink } from "@/lib/utils";

interface Lead {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  age?: number;
  status: string;
  source_link?: string;
  created_at: string;
  risk_profile_id?: string;
  risk_bucket?: string;
  risk_score?: number;
  notes?: string;
  cfa_goals?: string;
  cfa_min_investment?: string;
  cfa_investment_horizon?: string;
  assessment_submissions?: Array<{
    id: string;
    submitted_at: string;
    answers: Record<string, any>;
    result: {
      bucket: string;
      score: number;
      rubric: {
        capacity: number;
        tolerance: number;
        need: number;
      };
    };
    status: string;
  }>;
  meetings?: any[];
}

interface EditFormData {
  full_name: string;
  email: string;
  phone: string;
  age: string;
}

// Question mapping for better display
const CFA_QUESTION_MAPPING: Record<string, string> = {
  // Capacity Questions
  'primary_goal': 'What is your primary financial goal?',
  'investment_horizon': 'What is your investment time horizon?',
  'age': 'What is your age?',
  'dependents': 'How many dependents do you have?',
  'income': 'What is your annual income?',
  'emergency_fund': 'Do you have an emergency fund?',
  'debt_level': 'What is your current debt level?',
  
  // Tolerance Questions
  'market_experience': 'What is your experience with market investments?',
  'volatility_comfort': 'How comfortable are you with market volatility?',
  'loss_tolerance': 'What is your tolerance for investment losses?',
  'drawdown_comfort': 'How would you react to a 20% portfolio decline?',
  
  // Need Questions
  'return_expectation': 'What is your expected annual return?',
  'liquidity_needs': 'How quickly might you need to access your investments?',
  'tax_considerations': 'How important are tax considerations?',
  'inflation_protection': 'How concerned are you about inflation?',
  
  // Knowledge Questions
  'investment_knowledge': 'How would you rate your investment knowledge?',
  'product_familiarity': 'How familiar are you with investment products?',
  
  // Fallback for any other questions
  'other': 'Additional Question'
};

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // 🔧 DEBUG: This is the LeadDetail component that should show the red button
  console.log('🔧 LeadDetail component rendered with ID:', id);
  
  // Helper function to safely get assessment data
  const getAssessmentData = (lead: Lead) => {
    if (!lead.assessment_submissions || lead.assessment_submissions.length === 0) {
      console.log('🔍 No assessment submissions found for lead');
      return null;
    }
    const submission = lead.assessment_submissions[0];
    console.log('🔍 Assessment data found:', submission);
    console.log('🔍 Result:', submission.result);
    console.log('🔍 Score:', submission.result?.score);
    console.log('🔍 Bucket:', submission.result?.bucket);
    return submission;
  };
  
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [canDelete, setCanDelete] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [recreatingAssessment, setRecreatingAssessment] = useState(false);


  const form = useForm<EditFormData>({
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      age: '',
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (id) {
      loadLead();
    }
  }, [id]);

  useEffect(() => {
    if (lead) {
      form.reset({
        full_name: lead.full_name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        age: lead.age ? lead.age.toString() : '',
      });
    }
  }, [lead, form]);

  const loadLead = async () => {
    try {
      setLoading(true);
      
      // Validate lead ID
      if (!id) {
        throw new Error('No lead ID provided');
      }
      
      // Check if ID looks like a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        throw new Error('Invalid lead ID format');
      }
      
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const leadData = await leadsAPI.getById(token, id);
      
      // Debug: Log the actual data structure received
      console.log('🔍 Lead data received:', leadData);
      console.log('🔍 Assessment submissions:', leadData?.assessment_submissions);
      if (leadData?.assessment_submissions && leadData.assessment_submissions.length > 0) {
        const submission = leadData.assessment_submissions[0];
        console.log('🔍 First submission details:');
        console.log('   - ID:', submission.id);
        console.log('   - Submitted at:', submission.submitted_at);
        console.log('   - Status:', submission.status);
        console.log('   - Answers count:', submission.answers ? Object.keys(submission.answers).length : 0);
        console.log('   - Result:', submission.result);
        console.log('   - Result bucket:', submission.result?.bucket);
        console.log('   - Result score:', submission.result?.score);
      }
      
      setLead(leadData);
    } catch (error: any) {
      console.error('Failed to load lead:', error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to load lead details. Please try again.";
      
      if (error.message === 'No lead ID provided') {
        errorMessage = "No lead ID provided. Please check the URL.";
      } else if (error.message === 'Invalid lead ID format') {
        errorMessage = "Invalid lead ID format. Please check the URL.";
      } else if (error.response?.status === 404) {
        // Check if this might be a permission issue
        if (error.message.includes("don't have access")) {
          errorMessage = "Lead not found or you don't have permission to access it. This usually means the lead belongs to another user or has been moved.";
        } else {
          errorMessage = "Lead not found. It may have been deleted or you don't have access to it.";
        }
      } else if (error.response?.status === 401) {
        errorMessage = "Authentication failed. Please try signing out and signing back in.";
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to access this lead.";
      } else if (error.message === 'No authentication token available') {
        errorMessage = "Authentication required. Please sign in again.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async (values: EditFormData) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      await leadsAPI.update(token, id!, {
        full_name: values.full_name,
        email: values.email,
        phone: values.phone,
        age: values.age ? parseInt(values.age) : null,
      });

      toast({
        title: "Success",
        description: "Lead updated successfully!",
      });

      setEditDialogOpen(false);
      loadLead();
    } catch (error) {
      console.error('Failed to update lead:', error);
      toast({
        title: "Error",
        description: "Failed to update lead. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRecreateAssessment = async () => {
    try {
      setRecreatingAssessment(true);
      
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Call the recreate assessment endpoint
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://one-moment-fin.vercel.app'}/api/leads/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'recreate_assessment' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to recreate assessment');
      }

      const result = await response.json();
      
      toast({
        title: "Success",
        description: "Assessment submission recreated successfully!",
      });

      // Reload the lead data to show the new assessment submission
      loadLead();
      
    } catch (error: any) {
      console.error('Failed to recreate assessment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to recreate assessment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRecreatingAssessment(false);
    }
  };

  const handleDelete = async () => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      await leadsAPI.delete(token, id!);
      
      toast({
        title: "Success",
        description: "Lead deleted successfully!",
      });

      navigate('/app/leads');
    } catch (error) {
      console.error('Failed to delete lead:', error);
      toast({
        title: "Error",
        description: "Failed to delete lead. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteConfirmation('');
      setCanDelete(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      await leadsAPI.updateStatus(token, id!, newStatus);
      toast({
        title: "Success",
        description: `Lead status changed to ${newStatus.replace('_', ' ')}!`,
      });
      loadLead();
    } catch (error) {
      console.error('Failed to change status:', error);
      toast({
        title: "Error",
        description: "Failed to change lead status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStatusChangeWithConfirmation = (newStatus: string) => {
    const statusText = newStatus === 'converted' ? 'Converted' : 'Dropped';
    const message = newStatus === 'converted' 
      ? 'Are you sure you want to mark this lead as converted? This action cannot be undone.'
      : 'Are you sure you want to mark this lead as dropped? This action cannot be undone.';
    
    if (window.confirm(`${message}\n\nClick OK to confirm or Cancel to abort.`)) {
      handleStatusChange(newStatus);
    }
  };

  const handleSaveNotes = async () => {
    if (!lead) return;
    
    try {
      setSavingNotes(true);
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      await leadsAPI.update(token, lead.id, {
        notes: lead.notes
      });

      toast({
        title: "Success",
        description: "Notes saved successfully!",
      });
    } catch (error: any) {
      console.error('Failed to save notes:', error);
      toast({
        title: "Error",
        description: "Failed to save notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveCFAInfo = async () => {
    if (!lead) return;
    
    try {
      setSavingNotes(true);
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      await leadsAPI.update(token, lead.id, {
        cfa_goals: lead.cfa_goals,
        cfa_min_investment: lead.cfa_min_investment,
        cfa_investment_horizon: lead.cfa_investment_horizon
      });

      toast({
        title: "Success",
        description: "CFA information saved successfully!",
      });
    } catch (error: any) {
      console.error('Failed to save CFA information:', error);
      toast({
        title: "Error",
        description: "Failed to save CFA information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingNotes(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading lead details...</p>
        </div>
      </div>
    );
  }

  // Show error state if lead failed to load
  if (!lead) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/app/leads')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leads
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Lead Not Found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                The lead you're looking for could not be found. It may have been deleted, 
                moved, or you may not have permission to access it.
              </p>
              <div className="flex space-x-2">
                <Button onClick={() => navigate('/app/leads')}>
                  View All Leads
                </Button>
                <Button variant="outline" onClick={loadLead}>
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🔧 DEBUG: This should be visible if the component is updated */}
      <div className="bg-red-500 text-white p-4 text-center font-bold text-xl mb-4">
        🔧 LEAD DETAIL COMPONENT UPDATED - RED BUTTON SHOULD BE VISIBLE BELOW
      </div>
      <Helmet>
        <title>{lead.full_name} – OneMFin</title>
        <meta name="description" content="Lead summary, risk assessment, meetings and AI suggestions." />
      </Helmet>

      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Back to Leads Button - Higher up */}
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/app/leads')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Leads
            </Button>
          </div>

          {/* Stroked Border Section with Lead Info */}
          <div className="border border-gray-300 rounded-lg p-6 bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <h2 className="text-3xl font-bold text-gray-900">{lead.full_name}</h2>
                  <Badge 
                    variant="outline" 
                    className={`text-sm px-3 py-1 border-2 ${
                      lead.status === 'converted' ? 'bg-green-50 text-green-700 border-green-300' :
                      lead.status === 'dropped' ? 'bg-red-50 text-red-700 border-red-300' :
                      lead.status === 'meeting_scheduled' ? 'bg-orange-50 text-orange-700 border-orange-300' :
                      lead.status === 'assessment_done' ? 'bg-purple-50 text-purple-700 border-purple-300' :
                      'bg-blue-50 text-blue-700 border-blue-300'
                    }`}
                  >
                    {lead.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <Mail className="w-4 h-4" />
                  <span>{lead.email || 'No email provided'}</span>
                </div>
                
                {/* Source, Mobile, Created on - Left side */}
                <div className="space-y-2">
                                  <div className="flex items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    <span>Source: {formatSourceLink(lead.source_link)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>Mobile: {lead.phone || 'No phone provided'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Created on: {new Date(lead.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={() => setIsScheduleModalOpen(true)}
                  size="sm"
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Calendar className="h-4 w-4" />
                  Schedule
                </Button>
                
                {/* Status Change Button - Only enabled when meetings are scheduled */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={
                        !lead.meetings || 
                        lead.meetings.length === 0 || 
                        lead.status === 'converted' || 
                        lead.status === 'dropped'
                      }
                      className={`flex items-center gap-2 ${
                        !lead.meetings || 
                        lead.meetings.length === 0 || 
                        lead.status === 'converted' || 
                        lead.status === 'dropped'
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <TrendingUp className="h-4 w-4" />
                      {lead.status === 'converted' ? 'Converted' : 
                       lead.status === 'dropped' ? 'Dropped' : 'Change Status'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                      <DialogTitle>Change Lead Status</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        Current status: <span className="font-medium">{lead.status.replace('_', ' ')}</span>
                      </p>
                      
                      {/* Show current status info */}
                      {lead.status === 'converted' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-sm text-green-800">
                            🎉 This lead has been successfully converted!
                          </p>
                        </div>
                      )}
                      
                      {lead.status === 'dropped' && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-sm text-red-800">
                            ❌ This lead has been marked as dropped.
                          </p>
                        </div>
                      )}
                      
                      {/* Only show status change options if not in final state */}
                      {lead.status !== 'converted' && lead.status !== 'dropped' && (
                        <>
                          <div className="space-y-3">
                            <Button
                              onClick={() => handleStatusChangeWithConfirmation('converted')}
                              className="w-full bg-green-600 hover:bg-green-700 text-white"
                              size="sm"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark as Converted
                            </Button>
                            <Button
                              onClick={() => handleStatusChangeWithConfirmation('dropped')}
                              variant="destructive"
                              className="w-full"
                              size="sm"
                            >
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              Mark as Dropped
                            </Button>
                          </div>
                          
                          <div className="text-xs text-gray-500 text-center">
                            💡 You can only change status after scheduling a meeting
                          </div>
                        </>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-visible">
                    <DialogHeader className="pb-4">
                      <DialogTitle className="text-xl font-semibold">Edit Lead</DialogTitle>
                    </DialogHeader>
                    <div 
                      className="max-h-[calc(90vh-120px)] overflow-y-auto scroll-smooth"
                      style={{ 
                        scrollBehavior: 'smooth',
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'hsl(var(--border)) hsl(var(--background))'
                      }}
                    >
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSaveEdit)} className="space-y-4">
                          <div className="grid grid-cols-1 gap-4">
                            <FormField
                              control={form.control}
                              name="full_name"
                              rules={{ required: 'Full name is required' }}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Full Name *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter full name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="email"
                                rules={{ 
                                  pattern: { 
                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, 
                                    message: 'Invalid email address' 
                                  } 
                                }}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                      <Input type="email" placeholder="Enter email address" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="phone"
                                rules={{ 
                                  pattern: { 
                                    value: /^[0-9]{10}$/, 
                                    message: 'Phone number must be 10 digits' 
                                  } 
                                }}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Phone</FormLabel>
                                    <FormControl>
                                      <Input type="tel" placeholder="Enter phone number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="age"
                                rules={{ 
                                  pattern: { 
                                    value: /^[0-9]+$/, 
                                    message: 'Age must be a number' 
                                  },
                                  min: { value: 18, message: 'Age must be at least 18' },
                                  max: { value: 120, message: 'Age must be less than 120' }
                                }}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Age</FormLabel>
                                    <FormControl>
                                      <Input type="number" placeholder="Enter age" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button type="button" variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button type="submit">Save Changes</Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="h-8 w-8 p-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the lead
                        and all associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white border border-gray-200 rounded-xl p-1 h-16 shadow-sm">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200 data-[state=active]:shadow-sm rounded-lg h-14 transition-all duration-200 font-medium"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="risk" 
              className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:border-purple-200 data-[state=active]:shadow-sm rounded-lg h-14 transition-all duration-200 font-medium"
            >
              Risk Assessment
            </TabsTrigger>
            <TabsTrigger 
              value="meetings" 
              className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200 data-[state=active]:shadow-sm rounded-lg h-14 transition-all duration-200 font-medium"
            >
              Meetings ({lead?.meetings?.length || 0})
            </TabsTrigger>
            <TabsTrigger 
              value="notes" 
              className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 data-[state=active]:border-amber-200 data-[state=active]:shadow-sm rounded-lg h-14 transition-all duration-200 font-medium"
            >
              Notes
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6 mt-8">
            {/* Side by side layout: Lead Information and Risk Profile Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lead Information - Left side */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">Lead Information</h3>
                  </div>
                          <Button
          onClick={() => window.open(`/smart-summary/${lead.id}`, '_blank')}
          size="sm"
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
        >
          Smart Summary
        </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-600">Full Name</span>
                    <span className="text-sm font-semibold text-gray-900">{lead.full_name}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-600">Age</span>
                    <span className="text-sm font-semibold text-gray-900">{lead.age ? `${lead.age} years` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-600">Email</span>
                    <span className="text-sm font-semibold text-gray-900">{lead.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-sm font-medium text-gray-600">Phone</span>
                    <span className="text-sm font-semibold text-gray-900">{lead.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Risk Profile Summary - Right side */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Risk Profile</h3>
                </div>
                
                <div className="space-y-4">
                  {/* Risk Score and Category Row */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-purple-700">RS</span>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Risk Score</div>
                        <div className="text-lg font-bold text-gray-900">
                          {lead.assessment_submissions?.[0]?.result?.score || lead.risk_score || 0}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Category</div>
                      <Badge className={`text-xs px-2 py-1 ${
                        (lead.assessment_submissions?.[0]?.result?.bucket || lead.risk_bucket) === 'Low' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        (lead.assessment_submissions?.[0]?.result?.bucket || lead.risk_bucket) === 'Medium' ? 'bg-green-100 text-green-800 border-green-200' :
                        (lead.assessment_submissions?.[0]?.result?.bucket || lead.risk_bucket) === 'High' ? 'bg-red-100 text-red-800 border-red-200' :
                        'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        {lead.assessment_submissions?.[0]?.result?.bucket || lead.risk_bucket || 'Not Assessed'}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Assessment Details */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="text-gray-600">Questions</div>
                        <div className="font-semibold text-gray-900">
                          {lead.assessment_submissions?.[0]?.answers ? Object.keys(lead.assessment_submissions[0].answers).length : 0}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="text-gray-600">Completed</div>
                        <div className="font-semibold text-gray-900">
                          {lead.assessment_submissions?.[0]?.submitted_at ? 
                            new Date(lead.assessment_submissions[0].submitted_at).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }) : 
                            new Date(lead.created_at).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Risk Profile Summary - Clean and Simple */}
                  {(lead.assessment_submissions?.[0]?.result?.bucket || lead.risk_bucket) && (
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div className="text-sm font-medium text-green-800">
                          Risk Profile: <span className="font-semibold capitalize">{lead.assessment_submissions?.[0]?.result?.bucket || lead.risk_bucket}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="risk" className="space-y-6 mt-8">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-7 h-7 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Risk Assessment</h2>
                  <p className="text-gray-600">Detailed analysis of the lead's risk profile</p>
                </div>
              </div>
              
              {/* Always show the assessment section, but conditionally render content */}
              <div className="grid gap-8 grid-cols-1">
                {/* Left Side: Questions and Answers */}
                {(() => {
                  const assessmentData = getAssessmentData(lead);
                  console.log('🔍 Debug: assessmentData:', assessmentData);
                  console.log('🔍 Debug: assessmentData?.answers:', assessmentData?.answers);
                  
                  if (!assessmentData || !assessmentData.answers) {
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900">Assessment Questions & Answers</h3>
                          </div>
                                                      <div className="text-center py-8 text-gray-500">
                              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                              <p>No assessment responses available</p>
                              <p className="text-sm">This lead hasn't completed a risk assessment yet.</p>
                              <div className="mt-4">
                                <button
                                  onClick={handleRecreateAssessment}
                                  disabled={recreatingAssessment}
                                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {recreatingAssessment ? 'Creating...' : '🔧 RECREATE ASSESSMENT NOW'}
                                </button>
                                <p className="text-xs text-gray-400 mt-2">
                                  This will create a default assessment based on lead data
                                </p>
                              </div>
                            </div>
                        </div>
                      );
                    }
                    
                    // Group answers by module for better organization
                    const answersByModule: Record<string, Array<[string, any]>> = {};
                    Object.entries(assessmentData.answers).forEach(([question, answer]) => {
                      // Extract module from question key or use default
                      let module = 'General';
                      if (question.includes('primary_goal') || question.includes('horizon')) module = 'Profile';
                      if (question.includes('age') || question.includes('dependents') || question.includes('income')) module = 'Capacity';
                      if (question.includes('market_knowledge') || question.includes('experience')) module = 'Knowledge';
                      if (question.includes('drawdown') || question.includes('loss')) module = 'Behavior';
                      if (question.includes('return') || question.includes('liquidity')) module = 'Needs & Constraints';
                      
                      if (!answersByModule[module]) {
                        answersByModule[module] = [];
                      }
                      answersByModule[module].push([question, answer]);
                    });
                    
                    return (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900">Assessment Questions & Answers</h3>
                        </div>
                        
                                                 {/* Module-based organization */}
                         {Object.entries(answersByModule).map(([module, answers]) => (
                           <div key={module} className="space-y-4">
                             <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                               <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                               <h4 className="font-semibold text-blue-800 text-sm uppercase tracking-wide">{module}</h4>
                               <div className="ml-auto text-xs text-blue-600 bg-white px-2 py-1 rounded-full">
                                 {answers.length} question{answers.length !== 1 ? 's' : ''}
                               </div>
                             </div>
                                                         <div className="space-y-4 ml-5">
                               {answers.map(([questionKey, answer], index) => {
                                 const questionText = CFA_QUESTION_MAPPING[questionKey] || questionKey;
                                 return (
                                   <div key={index} className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-5 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200">
                                     <div className="flex items-start gap-3">
                                       <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                         <span className="text-xs font-semibold text-blue-700">{index + 1}</span>
                                       </div>
                                       <div className="flex-1 space-y-3">
                                         <h5 className="font-medium text-gray-900 text-sm leading-relaxed">{questionText}</h5>
                                         <div className="bg-white rounded border border-gray-200 p-3">
                                           <span className="text-sm font-medium text-gray-700">Answer:</span>
                                           <span className="ml-2 text-sm text-gray-900 font-medium">{String(answer)}</span>
                                         </div>
                                       </div>
                                     </div>
                                   </div>
                                 );
                               })}
                             </div>
                          </div>
                        ))}
                        
                                                 {/* Assessment Summary */}
                         <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                           <div className="text-lg font-semibold text-blue-900 mb-4">Assessment Summary</div>
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             <div className="text-center p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
                               <div className="text-2xl font-bold text-blue-600">{Object.keys(assessmentData.answers).length}</div>
                               <div className="text-blue-700 font-medium text-sm">Total Questions</div>
                             </div>
                             <div className="text-center p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
                               <div className="text-2xl font-bold text-blue-600">{Object.keys(answersByModule).length}</div>
                               <div className="text-blue-700 font-medium text-sm">Categories</div>
                             </div>
                             <div className="text-center p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
                               <div className="text-2xl font-bold text-blue-600">{lead.assessment_submissions?.[0]?.result?.score || lead.risk_score || 0}</div>
                               <div className="text-blue-700 font-medium text-sm">Risk Score</div>
                             </div>
                             <div className="text-center p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
                               <div className="text-2xl font-bold text-blue-600">{lead.assessment_submissions?.[0]?.result?.bucket || lead.risk_bucket || 'N/A'}</div>
                               <div className="text-blue-700 font-medium text-sm">Risk Level</div>
                             </div>
                           </div>
                         </div>
                      </div>
                    );
                  })()}

                  {/* Right Side: Risk Factors */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">Risk Profile</h3>
                    </div>
                    
                                         {/* Risk Score Card */}
                     <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100 shadow-sm">
                       <div className="text-center">
                         <div className="text-4xl font-bold text-blue-600 mb-2">
                           {lead.assessment_submissions?.[0]?.result?.score || lead.risk_score || 0}
                         </div>
                         <div className="text-lg font-medium text-blue-700 uppercase tracking-wide">Risk Score</div>
                         <div className="text-sm text-blue-600 mt-2">0-100 scale</div>
                       </div>
                     </div>

                     {/* Risk Category Card */}
                     <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                       <div className="text-center">
                         <div className="text-4xl font-bold text-gray-900 mb-2">
                           {lead.assessment_submissions?.[0]?.result?.bucket || lead.risk_bucket || 'N/A'}
                         </div>
                         <div className="text-lg font-medium text-gray-600 uppercase tracking-wide">Risk Category</div>
                         <div className="text-sm text-gray-500 mt-2">Low • Medium • High</div>
                       </div>
                     </div>

                                         {/* Assessment Details */}
                     <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                       <div className="space-y-4">
                         <div className="flex justify-between items-center py-3 border-b border-gray-100">
                           <span className="text-sm font-medium text-gray-600">Assessment Date</span>
                           <span className="text-sm font-semibold text-gray-900">
                             {lead.assessment_submissions?.[0]?.submitted_at ? 
                               new Date(lead.assessment_submissions[0].submitted_at).toLocaleDateString() : 
                               new Date(lead.created_at).toLocaleDateString()
                             }
                           </span>
                         </div>
                         <div className="flex justify-between items-center py-3 border-b border-gray-100">
                           <span className="text-sm font-medium text-gray-600">Assessment Title</span>
                           <span className="text-sm font-semibold text-gray-900">
                             CFA Three-Pillar Risk Assessment
                           </span>
                         </div>
                         <div className="flex justify-between items-center py-3">
                           <span className="text-sm font-medium text-gray-600">Total Questions</span>
                           <span className="text-sm font-semibold text-gray-900">
                             {lead.assessment_submissions?.[0]?.answers ? Object.keys(lead.assessment_submissions[0].answers).length : 'N/A'}
                           </span>
                         </div>
                       </div>
                     </div>

                    
                  </div>
                </div>
            </div>
          </TabsContent>
          
          <TabsContent value="meetings" className="space-y-6 mt-8">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                    <Calendar className="w-7 h-7 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Meetings & Appointments</h2>
                    <p className="text-gray-600">Schedule and manage meetings with this lead</p>
                  </div>
                </div>
                <Button 
                  onClick={() => navigate('/app/meetings')}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Schedule Meeting
                </Button>
              </div>
              
              {lead.meetings && lead.meetings.length > 0 ? (
                <div className="space-y-4">
                  {lead.meetings.map((meeting: any) => (
                    <div key={meeting.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold text-gray-900">{meeting.title}</h4>
                            <Badge 
                              variant={meeting.status === 'completed' ? 'default' : 
                                     meeting.status === 'cancelled' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {meeting.status}
                            </Badge>
                            {meeting.platform && (
                              <Badge variant="outline" className="text-xs">
                                {meeting.platform.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                          
                          {meeting.description && (
                            <p className="text-sm text-gray-600">{meeting.description}</p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(meeting.start_time).toLocaleDateString('en-IN', {
                                timeZone: 'Asia/Kolkata',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                              {new Date(meeting.start_time).toLocaleTimeString('en-IN', { 
                                timeZone: 'Asia/Kolkata',
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })} - {new Date(meeting.end_time).toLocaleTimeString('en-IN', { 
                                timeZone: 'Asia/Kolkata',
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          </div>
                          
                          {meeting.meeting_link && meeting.status === 'scheduled' && (
                            <div className="pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(meeting.meeting_link, '_blank')}
                                className="flex items-center gap-2"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Join Meeting
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/app/meetings')}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Meetings Scheduled</h3>
                  <p className="text-gray-600 max-w-md mx-auto mb-6">
                    No meetings have been scheduled with this lead yet. Schedule a meeting to discuss their financial goals and provide personalized recommendations.
                  </p>
                  <Button 
                    onClick={() => navigate('/app/meetings')}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Schedule First Meeting
                  </Button>
                </div>
              )}
              
              {/* Meeting Statistics */}
              {lead.meetings && lead.meetings.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Meeting Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {lead.meetings.filter((m: any) => m.status === 'scheduled').length}
                      </div>
                      <div className="text-sm text-gray-600">Upcoming</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {lead.meetings.filter((m: any) => m.status === 'completed').length}
                      </div>
                      <div className="text-sm text-gray-600">Completed</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {lead.meetings.filter((m: any) => m.status === 'cancelled').length}
                      </div>
                      <div className="text-sm text-gray-600">Cancelled</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        
        <TabsContent value="notes" className="space-y-6 mt-8">
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center">
                <FileText className="w-7 h-7 text-amber-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Notes & Key Information</h2>
                <p className="text-gray-600">Add and manage notes about this lead</p>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Notes Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">Notes</h4>
                  <span className="text-xs text-gray-500">
                    {lead.notes ? lead.notes.length : 0}/500 characters
                  </span>
                </div>
                <textarea
                  value={lead.notes || ''}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) {
                      setLead({ ...lead, notes: e.target.value });
                    }
                  }}
                  placeholder="Add notes about this lead, their preferences, or any important information..."
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={500}
                />
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSaveNotes}
                    size="sm"
                    disabled={savingNotes}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {savingNotes ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>

              {/* CFA Framework Questions - Only show if CFA data exists */}
              {(lead.cfa_goals || lead.cfa_min_investment || lead.cfa_investment_horizon || 
                (lead.assessment_submissions && lead.assessment_submissions.length > 0)) && (
                <div className="space-y-4 pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-900">CFA Framework Questions</h4>
                  
                  {/* Goals */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Goals</label>
                    <textarea
                      value={lead.cfa_goals || ''}
                      onChange={(e) => setLead({ ...lead, cfa_goals: e.target.value })}
                      placeholder="What are the lead's primary financial goals?"
                      className="w-full h-20 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Minimum Investment Amount */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Minimum Investment Amount</label>
                    <input
                      type="text"
                      value={lead.cfa_min_investment || ''}
                      onChange={(e) => setLead({ ...lead, cfa_min_investment: e.target.value })}
                      placeholder="e.g., ₹50,000"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Investment Horizon */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Investment Horizon</label>
                    <select
                      value={lead.cfa_investment_horizon || ''}
                      onChange={(e) => setLead({ ...lead, cfa_investment_horizon: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select investment horizon</option>
                      <option value="short_term">Short Term (1-3 years)</option>
                      <option value="medium_term">Medium Term (3-7 years)</option>
                      <option value="long_term">Long Term (7+ years)</option>
                    </select>
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSaveCFAInfo}
                      size="sm"
                      disabled={savingNotes}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {savingNotes ? 'Saving...' : 'Save CFA Information'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  </div>
  );
}
