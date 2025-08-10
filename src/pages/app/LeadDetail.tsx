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
  ArrowLeft
} from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { leadsAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import KYCStatus from "@/components/KYCStatus";
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
  email?: string;
  phone?: string;
  age?: number;
  status: string;
  source_link?: string;
  created_at: string;
  kyc_status?: any[];
  risk_assessments?: any[];
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

  const loadLead = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      const response = await leadsAPI.getById(token, id!);
      setLead(response.lead);
      
      // Initialize form with current values
      form.reset({
        full_name: response.lead.full_name || '',
        email: response.lead.email || '',
        phone: response.lead.phone || '',
        age: response.lead.age?.toString() || '',
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to load lead: ${error.message || 'Unknown error'}`,
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

      const updateData = {
        full_name: values.full_name,
        email: values.email || undefined,
        phone: values.phone || undefined,
        age: values.age ? parseInt(values.age) : undefined,
      };

      await leadsAPI.update(token, id!, updateData);
      
      // Refresh lead data
      await loadLead();
      setEditDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Lead updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update lead: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation !== 'Delete lead') {
      toast({
        title: "Error",
        description: "Please type 'Delete lead' exactly to confirm deletion",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      await leadsAPI.delete(token, id!);
      
      toast({
        title: "Success",
        description: "Lead deleted successfully",
      });
      
      // Navigate back to leads list
      navigate('/app/leads');
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to delete lead: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteConfirmation('');
      setCanDelete(false);
    }
  };

  const handleKYCStatusChange = () => {
    // Refresh lead data
    loadLead();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading lead details...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Lead not found</p>
        <Button onClick={() => navigate('/app/leads')} className="mt-4">
          Back to Leads
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>{lead.full_name} – OneMFin</title>
        <meta name="description" content="Lead summary, risk assessment, meetings, KYC and AI suggestions." />
      </Helmet>

      {/* Back Button */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          onClick={() => navigate('/app/leads')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Leads
        </Button>
      </div>

      {/* Lead Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <User className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold">{lead.full_name}</h1>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {lead.phone || 'N/A'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {lead.email || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  Age: {lead.age || 'N/A'}
                </Badge>
                <Badge variant="secondary">Status: {lead.status.replace('_', ' ')}</Badge>
                <Badge variant={lead.kyc_status?.[0]?.status === 'completed' ? 'default' : 'secondary'}>
                  KYC: {lead.kyc_status?.[0]?.status || 'Not started'}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
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
                                min: { value: 18, message: 'Minimum age is 18' },
                                max: { value: 100, message: 'Maximum age is 100' }
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
                        <DialogFooter className="pt-6">
                          <Button type="submit" variant="cta">Update Lead</Button>
                          <DialogClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                          </DialogClose>
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
                    <AlertDialogTitle>Delete Lead</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4">
                      <p>
                        This action cannot be undone. This will permanently delete the lead "{lead.full_name}" and all associated data.
                      </p>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          To confirm deletion, please type "Delete lead" below:
                        </label>
                        <Input
                          type="text"
                          placeholder="Type 'Delete lead' to confirm"
                          value={deleteConfirmation}
                          onChange={(e) => {
                            setDeleteConfirmation(e.target.value);
                            setCanDelete(e.target.value === 'Delete lead');
                          }}
                          className="w-full"
                        />
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel 
                      onClick={() => {
                        setDeleteConfirmation('');
                        setCanDelete(false);
                      }}
                    >
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDelete} 
                      disabled={!canDelete}
                      className={`${
                        canDelete 
                          ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' 
                          : 'bg-muted text-muted-foreground cursor-not-allowed'
                      }`}
                    >
                      Delete Lead
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              

              <Button variant="default" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedule
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>



      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
          <TabsTrigger value="meetings">Meetings ({lead?.meetings?.length || 0})</TabsTrigger>
          <TabsTrigger value="kyc">KYC</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
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
                <div>
                  <span className="text-sm text-muted-foreground">KYC Status:</span>
                  <p className="font-medium capitalize">{lead.kyc_status?.[0]?.status || 'Not started'}</p>
                </div>
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
              {lead.risk_assessments && lead.risk_assessments.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      AI analysis • Confidence {lead.risk_assessments[0].risk_score || 'N/A'}%
                    </div>
                    <Button size="sm" variant="outline">Re-run AI</Button>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p><strong>Risk Category:</strong> {lead.risk_assessments[0].risk_category || 'N/A'}</p>
                    <p><strong>Assessment Date:</strong> {new Date(lead.risk_assessments[0].created_at).toLocaleDateString()}</p>
                    {lead.risk_assessments[0].risk_assessment_answers && (
                      <div>
                        <p className="font-medium mb-2">Assessment Answers:</p>
                        <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1">
                          {lead.risk_assessments[0].risk_assessment_answers.map((answer: any, index: number) => (
                            <li key={answer.id}>
                              <strong>Q{index + 1}:</strong> {answer.assessment_questions?.question_text || 'N/A'} - 
                              <strong>Answer:</strong> {answer.answer_value || 'N/A'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">No risk assessment completed yet.</p>
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
        
        <TabsContent value="kyc" className="space-y-4">
          <KYCStatus leadId={lead.id} onStatusChange={handleKYCStatusChange} />
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
