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
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';

interface Lead {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  age?: number;
  source_link?: string;
  status: string;
  created_at: string;
  notes?: string;
  risk_assessments?: any[];
  meetings?: any[];
  kyc_status?: any[];
  portfolio_value?: number;
}

interface LeadFormData {
  full_name: string;
  email: string;
  phone: string;
  age: string;
  source_link: string;
  notes: string;
  status: string;
  kyc_status: string;
}

// Common lead sources for MFDs
const LEAD_SOURCES = [
  { value: 'sms', label: 'SMS' },
  { value: 'in_person', label: 'In-Person Meeting' },
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'referral', label: 'Referral' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'website', label: 'Website' },
  { value: 'email', label: 'Email' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'seminar', label: 'Seminar/Event' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'other', label: 'Other' },
] as const;

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
  const [addOpen, setAddOpen] = useState(false);
  
  const form = useForm<LeadFormData>({
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      age: '',
      source_link: 'website',
      notes: '',
      status: 'lead',
      kyc_status: 'pending',
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    loadLeads();
  }, [pagination.page, statusFilter, searchTerm]);

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
        ...(searchTerm.trim() && { search: searchTerm.trim() })
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
      const token = await getToken();
      if (!token) throw new Error('No authentication token available');
      
      // Convert age to number if provided
      const leadData = {
        ...values,
        age: values.age ? parseInt(values.age) : undefined,
      };
      
      await leadsAPI.createLead(token, leadData);
      setAddOpen(false);
      form.reset();
      loadLeads();
      toast({ 
        title: 'Success', 
        description: 'Lead created successfully.' 
      });
    } catch (err: any) {
      toast({ 
        title: 'Error', 
        description: err.message || 'Failed to create lead', 
        variant: 'destructive' 
      });
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
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
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
                        <FormField
                          control={form.control}
                          name="source_link"
                          rules={{ required: 'Source is required' }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Source *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select source" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent 
                                  position="popper" 
                                  side="bottom" 
                                  align="start"
                                  sideOffset={4}
                                  className="max-h-[200px] overflow-y-auto"
                                >
                                  {LEAD_SOURCES.map((source) => (
                                    <SelectItem key={source.value} value={source.value}>
                                      {source.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent 
                                  position="popper" 
                                  side="bottom" 
                                  align="start"
                                  sideOffset={4}
                                  className="max-h-[200px] overflow-y-auto"
                                >
                                  <SelectItem value="lead">Lead</SelectItem>
                                  <SelectItem value="assessment_done">Assessment Done</SelectItem>
                                  <SelectItem value="meeting_scheduled">Meeting Scheduled</SelectItem>
                                  <SelectItem value="converted">Converted</SelectItem>
                                  <SelectItem value="dropped">Dropped</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="kyc_status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>KYC Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select KYC status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent 
                                  position="popper" 
                                  side="bottom" 
                                  align="start"
                                  sideOffset={4}
                                  className="max-h-[200px] overflow-y-auto"
                                >
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="incomplete">Incomplete</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Add notes (optional)" className="min-h-[80px]" {...field} />
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
              {['Name','Contact','Age','Source','Risk','Meeting','KYC','Portfolio','Notes','Actions'].map(h => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">Loading leads...</TableCell>
              </TableRow>
            ) : filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
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
                  <TableCell>{lead.source_link ? 'Link' : 'Manual'}</TableCell>
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
                  <TableCell>
                    {lead.portfolio_value ? `₹${lead.portfolio_value}` : 'N/A'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{lead.notes || '-'}</TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline">Call</Button>
                    <Button size="sm" variant="outline">Meet</Button>
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
    </div>
  )
}
