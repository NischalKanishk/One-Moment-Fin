import { useUser, useAuth } from "@clerk/clerk-react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { leadsAPI } from "@/lib/api";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useForm, Controller as HookFormController } from 'react-hook-form';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import KYCPopup from '@/components/KYCPopup';

interface Lead {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  age?: number;
  status?: string;
  source_link?: string;
  created_at: string;
  risk_assessments?: any[];
  meetings?: any[];
  kyc_status?: any[];
}

interface LeadFormData {
  full_name: string;
  email?: string;
  phone?: string;
  age?: string;
}



interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function Leads(){
  const { user } = useUser();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [kycPopupOpen, setKycPopupOpen] = useState(false);
  const [selectedLeadForKyc, setSelectedLeadForKyc] = useState<Lead | null>(null);
  
  const form = useForm<LeadFormData>({
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      age: '',
    },
    mode: 'onBlur',
  });

  // Ensure form is properly initialized
  useEffect(() => {
    form.reset({
      full_name: '',
      email: '',
      phone: '',
      age: '',
    });
  }, []);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (addOpen) {
      form.reset({
        full_name: '',
        email: '',
        phone: '',
        age: '',
      });
    }
  }, [addOpen, form]);

  useEffect(() => {
    loadLeads();
  }, [pagination.page, statusFilter, searchTerm, riskFilter, sourceFilter]);

  // Debounce search term changes
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (pagination.page !== 1) {
        setPagination(prev => ({ ...prev, page: 1 }));
      } else {
        loadLeads();
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sort_by: 'created_at',
        sort_order: 'desc' as const,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm.trim() && { search: searchTerm.trim() }),
        ...(riskFilter !== 'all' && { risk_category: riskFilter }),
        ...(sourceFilter !== 'all' && { source_link: sourceFilter })
      };

      const response = await leadsAPI.getAll(token, params);
      
      // Handle both old and new response formats for backward compatibility
      if (response.leads && response.pagination) {
        setLeads(response.leads);
        setPagination(response.pagination);
      } else {
        // Fallback for old response format
        setLeads(response.leads || []);
        setPagination(prev => ({ ...prev, total: response.leads?.length || 0 }));
      }
    } catch (error: any) {
      setLeads([]);
      setPagination(prev => ({ ...prev, total: 0 }));
      toast({
        title: "Error",
        description: `Failed to load leads: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddLead = async (values: LeadFormData) => {
    try {
      console.log('Form values received:', values);
      const token = await getToken();
      if (!token) throw new Error('No authentication token available');
      
      // Convert age to number if provided and validate
      const leadData = {
        full_name: values.full_name,
        email: values.email && values.email.trim() !== '' ? values.email : undefined,
        phone: values.phone && values.phone.trim() !== '' ? values.phone : undefined,
        age: values.age && values.age.trim() !== '' ? parseInt(values.age) : undefined,
      };
      
      // Validate required fields
      if (!values.full_name.trim()) {
        throw new Error('Full name is required');
      }
      
      // Validate age if provided
      if (values.age && values.age.trim() !== '') {
        const ageNum = parseInt(values.age);
        if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
          throw new Error('Age must be between 18 and 100');
        }
      }
      
      console.log('Submitting lead data:', leadData);
      
      // Debug: Log the exact data being sent
      console.log('Data being sent to API:', {
        full_name: leadData.full_name,
        email: leadData.email,
        phone: leadData.phone,
        age: leadData.age,
        ageType: typeof leadData.age,
        phoneType: typeof leadData.phone
      });
      
      // Ensure all required fields are present
      if (!leadData.full_name || leadData.full_name.trim() === '') {
        throw new Error('Full name is required');
      }
      
      await leadsAPI.createLead(token, leadData);
      setAddOpen(false);
      form.reset({
        full_name: '',
        email: '',
        phone: '',
        age: '',
      });
      loadLeads();
      toast({ 
        title: 'Success', 
        description: 'Lead created successfully.' 
      });
    } catch (err: any) {
      console.error('Lead creation error:', err);
      
      // Handle validation errors from backend
      let errorMessage = 'Failed to create lead';
      
      if (err.response?.data) {
        const { error, details } = err.response.data;
        if (error === 'Validation failed' && details && Array.isArray(details)) {
          errorMessage = `Validation failed: ${details.map(d => `${d.field}: ${d.message}`).join(', ')}`;
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast({ 
        title: 'Error', 
        description: errorMessage, 
        variant: 'destructive' 
      });
    }
  };

  const onKyc = async (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setSelectedLeadForKyc(lead);
      setKycPopupOpen(true);
    }
  };

  // Server-side filtering handles search and status filters
  // Client-side filtering only for risk (since it's a related table field)
  const filteredLeads = leads.filter(lead => {
    const matchesRisk = riskFilter === 'all' || 
                       lead.risk_assessments?.[0]?.risk_category === riskFilter;
    
    return matchesRisk;
  });

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Leads – OneMFin</title>
        <meta name="description" content="Manage leads with filters, bulk actions and quick scheduling." />
      </Helmet>

      <div className="flex flex-col md:flex-row gap-3 items-center md:items-end">
        <div className="flex-1">
          <Input 
            placeholder="Search leads by name, email, or phone…" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent 
            position="popper" 
            side="bottom" 
            align="start"
            sideOffset={4}
            className="max-h-[200px] overflow-y-auto"
          >
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="assessment_done">Assessment Done</SelectItem>
            <SelectItem value="meeting_scheduled">Meeting Scheduled</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="dropped">Dropped</SelectItem>
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Risk" />
          </SelectTrigger>
          <SelectContent 
            position="popper" 
            side="bottom" 
            align="start"
            sideOffset={4}
            className="max-h-[200px] overflow-y-auto"
          >
            <SelectItem value="all">All Risk</SelectItem>
            <SelectItem value="low">Conservative</SelectItem>
            <SelectItem value="medium">Balanced</SelectItem>
            <SelectItem value="high">Aggressive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent 
            position="popper" 
            side="bottom" 
            align="start"
            sideOffset={4}
            className="max-h-[200px] overflow-y-auto"
          >
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="Manually Added">Manually Added</SelectItem>
            <SelectItem value="Link Submission">Link Submission</SelectItem>
          </SelectContent>
        </Select>
        <Dialog key="add-lead-dialog" open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button variant="cta">Add Lead</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-visible">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-xl font-semibold">Add New Lead</DialogTitle>
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
                <form onSubmit={form.handleSubmit(handleAddLead)} className="space-y-4">
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
                            required: false,
                            pattern: { 
                              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, 
                              message: 'Invalid email address' 
                            } 
                          }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email (Optional)</FormLabel>
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
                            required: false,
                            pattern: { 
                              value: /^(\+91|91|0)?[6-9]\d{9}$/, 
                              message: 'Phone number must be a valid Indian mobile number (e.g., 9876543210, +919876543210, 09876543210)' 
                            } 
                          }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone (Optional)</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="Enter phone number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="age"
                        rules={{ 
                          required: false,
                          pattern: { 
                            value: /^(1[8-9]|[2-9]\d|100)$/, 
                            message: 'Age must be between 18 and 100' 
                          }
                        }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Age (Optional)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Enter age" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter className="pt-6">
                      <Button type="submit" variant="cta">Create Lead</Button>
                      <DialogClose asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                      </DialogClose>
                    </DialogFooter>
                  </form>
                </Form>
              </div>
            </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {['Name','Contact','Age','Source','Risk','Meeting','KYC','Actions'].map(h => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">Loading leads...</TableCell>
              </TableRow>
            ) : filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="text-muted-foreground">No leads found</div>
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-secondary/60">
                  <TableCell className="font-medium">
                    <Link to={`/app/leads/${lead.id}`} className="underline">
                      {lead.full_name}
                    </Link>
                  </TableCell>
                  <TableCell>{lead.phone || lead.email || 'N/A'}</TableCell>
                  <TableCell>{lead.age || 'N/A'}</TableCell>
                  <TableCell>
                    <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800">
                      {lead.source_link || 'Unknown'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-0.5 text-xs rounded bg-secondary">
                      {lead.risk_assessments?.[0]?.risk_category || 'Not assessed'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {lead.meetings?.[0]?.status || 'Not scheduled'}
                  </TableCell>
                  <TableCell>
                    {lead.kyc_status?.[0]?.status || 'Not started'}
                  </TableCell>
                  <TableCell className="space-x-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 px-3">
                          Actions <ChevronDown className="ml-1 h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onKyc(lead.id)}>
                          KYC
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} leads
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={!pagination.hasPrev || loading}
            >
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const startPage = Math.max(1, pagination.page - 2);
                const pageNumber = startPage + i;
                if (pageNumber > pagination.totalPages) return null;
                
                return (
                  <Button
                    key={pageNumber}
                    variant={pageNumber === pagination.page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: pageNumber }))}
                    disabled={loading}
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={!pagination.hasNext || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* KYC Popup */}
      {selectedLeadForKyc && (
        <KYCPopup
          isOpen={kycPopupOpen}
          onClose={() => {
            setKycPopupOpen(false);
            setSelectedLeadForKyc(null);
          }}
          leadId={selectedLeadForKyc.id}
          leadName={selectedLeadForKyc.full_name}
          getToken={getToken}
        />
      )}
    </div>
  )
}
