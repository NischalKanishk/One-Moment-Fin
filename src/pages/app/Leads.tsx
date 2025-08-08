import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { leadsAPI } from "@/lib/api";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

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
}

export default function Leads(){
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      const { leads: leadsData } = await leadsAPI.getAll();
      setLeads(leadsData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load leads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.phone?.includes(searchTerm);
    
    const matchesRisk = riskFilter === 'all' || 
                       lead.risk_assessments?.[0]?.risk_category === riskFilter;
    
    return matchesSearch && matchesRisk;
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
            placeholder="Search leads…" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Risk" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="low">Conservative</SelectItem>
            <SelectItem value="medium">Balanced</SelectItem>
            <SelectItem value="high">Aggressive</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline">Export CSV</Button>
        <Button variant="cta">Send KYC link</Button>
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
                <TableCell colSpan={10} className="text-center py-8">No leads found</TableCell>
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
                  <TableCell>₹0</TableCell>
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
    </div>
  )
}
