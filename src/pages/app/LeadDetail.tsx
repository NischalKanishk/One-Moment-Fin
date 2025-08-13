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
  Plus
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
  assessment?: {
    submission: any;
    assessment: any;
    questions: any[];
    mappedAnswers: Array<{
      question: string;
      answer: string;
      type: string;
      options: any;
      module: string;
    }>;
  };
  assessment_submissions?: any[];
  meetings?: any[];
}

interface EditFormData {
  full_name: string;
  email: string;
  phone: string;
  age: string;
}

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [canDelete, setCanDelete] = useState(false);


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
    <div className="space-y-6">
      <Helmet>
        <title>{lead.full_name} – OneMFin</title>
        <meta name="description" content="Lead summary, risk assessment, meetings and AI suggestions." />
      </Helmet>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/app/leads')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{lead.full_name}</h1>
            <p className="text-muted-foreground">Lead Details</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => setIsScheduleModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Schedule
          </Button>
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Edit
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
              <Button variant="destructive" className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Delete
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

      {/* Lead Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{lead.email || 'No email'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{lead.phone || 'No phone'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Lead Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Age: {lead.age || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Source: {lead.source_link || 'N/A'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                Age: {lead.age || 'N/A'}
              </Badge>
              <Badge variant="secondary">Status: {lead.status.replace('_', ' ')}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
          <TabsTrigger value="meetings">Meetings ({lead?.meetings?.length || 0})</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          {/* Risk Profile Summary */}
          {lead.assessment && (
            <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <TrendingUp className="h-5 w-5" />
                  Risk Profile Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {lead.risk_score || 0}
                    </div>
                    <div className="text-sm text-blue-600 font-medium">Risk Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-800 mb-1">
                      {lead.risk_bucket || 'N/A'}
                    </div>
                    <div className="text-sm text-blue-700">Risk Category</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {lead.assessment.mappedAnswers.length}
                    </div>
                    <div className="text-sm text-blue-600">Questions Answered</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Lead Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Full Name:</span>
                  <p className="font-medium">{lead.full_name}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Age:</span>
                  <p className="font-medium">{lead.age ? `${lead.age} years` : 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <p className="font-medium">{lead.email || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Phone:</span>
                  <p className="font-medium">{lead.phone || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Current Status:</span>
                  <p className="font-medium capitalize">{lead.status.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Created:</span>
                  <p className="font-medium">{new Date(lead.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Source:</span>
                  <p className="font-medium capitalize">{lead.source_link || 'N/A'}</p>
                </div>
                {lead.assessment && (
                  <div>
                    <span className="text-sm text-muted-foreground">Assessment Date:</span>
                    <p className="font-medium">
                      {new Date(lead.assessment.submission.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lead.assessment ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Side: Questions and Answers */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium">Assessment Questions & Answers</h3>
                    </div>
                    <div className="space-y-3">
                      {lead.assessment.mappedAnswers.map((qa, index) => (
                        <div key={index} className="border rounded-lg p-3 bg-muted/30">
                          <div className="font-medium text-sm mb-1">{qa.question}</div>
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">Answer:</span> {qa.answer}
                          </div>
                          {qa.module && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Module: {qa.module}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Side: Risk Factors */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium">Risk Profile</h3>
                    </div>
                    
                    {/* Risk Score Card */}
                    <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600 mb-1">
                          {lead.risk_score || 0}
                        </div>
                        <div className="text-sm text-blue-600 font-medium">Risk Score</div>
                      </div>
                    </div>

                    {/* Risk Category Card */}
                    <div className="border rounded-lg p-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold mb-1">
                          {lead.risk_bucket || 'N/A'}
                        </div>
                        <div className="text-sm text-muted-foreground">Risk Category</div>
                      </div>
                    </div>

                    {/* Assessment Details */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="text-sm">
                        <span className="font-medium">Assessment Date:</span>
                        <div className="text-muted-foreground">
                          {new Date(lead.assessment.submission.submitted_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Assessment Title:</span>
                        <div className="text-muted-foreground">
                          {lead.assessment.assessment.title}
                        </div>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Total Questions:</span>
                        <div className="text-muted-foreground">
                          {lead.assessment.mappedAnswers.length}
                        </div>
                      </div>
                    </div>

                    {/* Risk Insights */}
                    {lead.assessment.submission.result?.rubric && (
                      <div className="border rounded-lg p-4 bg-amber-50">
                        <div className="text-sm">
                          <span className="font-medium text-amber-800">Risk Insights:</span>
                          <div className="text-amber-700 mt-1">
                            {lead.risk_bucket === 'Low' && 'Conservative approach recommended'}
                            {lead.risk_bucket === 'Medium' && 'Balanced approach suitable'}
                            {lead.risk_bucket === 'High' && 'Aggressive approach possible'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">No risk assessment completed yet.</p>
                  <p className="text-sm text-muted-foreground">
                    This lead hasn't completed an assessment. Send them an assessment link to get started.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="meetings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Meetings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lead.meetings && lead.meetings.length > 0 ? (
                <div className="space-y-4">
                  {lead.meetings.map((meeting: any) => (
                    <div key={meeting.id} className="border-l-2 border-primary pl-4 py-2">
                      <div className="font-medium">{meeting.title}</div>
                      <div className="text-sm text-muted-foreground">{meeting.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(meeting.start_time).toLocaleString()} - {new Date(meeting.end_time).toLocaleString()}
                      </div>
                      <Badge variant={meeting.status === 'completed' ? 'default' : 'secondary'}>
                        {meeting.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No meetings scheduled yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="suggestions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                AI Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">AI-powered product suggestions will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


    </div>
  );
}
