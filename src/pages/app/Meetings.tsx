import React, { useState, useEffect } from 'react';
import { Helmet } from "react-helmet-async";
import { useUser, useAuth } from "@clerk/clerk-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Calendar, Clock, User, ExternalLink, Video } from "lucide-react";
import { LeadAutocomplete } from "@/components/LeadAutocomplete";
import { CalendlyEmbed } from "@/components/CalendlyEmbed";
import { toast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";

interface Lead {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  description: string | null;
  meeting_link: string | null;
  platform: string;
  status: string;
  lead_name: string | null;
  lead_email: string | null;
  created_by: string | null;
  created_at: string;
}

export default function Meetings() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { hasCalendlyConfig } = useSettings();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);

  // Fetch meetings on component mount
  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      setIsLoading(true);
      
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/meetings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch meetings');
      }

      const data = await response.json();
      setMeetings(data.meetings || []);
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
      toast({
        title: "Error",
        description: "Failed to load meetings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeadSelect = (lead: Lead | null) => {
    setSelectedLead(lead);
  };

  const handleEventScheduled = async (eventData: any) => {
    if (!selectedLead) return;

    try {
      setIsCreatingMeeting(true);
      
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const payload = {
        eventUri: eventData.event.uri,
        inviteeUri: eventData.invitee.uri,
        leadId: selectedLead.id
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/meetings/calendly-scheduled`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to create meeting');
      }

      toast({
        title: "Success",
        description: "Meeting scheduled successfully!",
      });

      // Close modal and refresh meetings
      setIsCreateModalOpen(false);
      setSelectedLead(null);
      fetchMeetings();
    } catch (error) {
      console.error('Failed to create meeting:', error);
      toast({
        title: "Error",
        description: "Failed to create meeting. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'secondary';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'calendly':
        return <Calendar className="h-4 w-4" />;
      case 'google_meet':
        return <Video className="h-4 w-4" />;
      case 'zoom':
        return <Video className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const resetModal = () => {
    setSelectedLead(null);
    setIsCreateModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Meetings – OneMFin</title>
        <meta name="description" content="Manage your meetings and schedule new ones via Calendly." />
        <link rel="canonical" href="/app/meetings" />
      </Helmet>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
          <p className="text-muted-foreground">
            Schedule and manage your client meetings
          </p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Meeting
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Schedule New Meeting</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Step 1: Lead Selection */}
              <div>
                <h3 className="text-lg font-medium mb-4">1. Select a Lead</h3>
                <LeadAutocomplete
                  onLeadSelect={handleLeadSelect}
                  selectedLead={selectedLead}
                />
              </div>

              {/* Step 2: Calendly Integration */}
              {selectedLead && (
                <div>
                  <h3 className="text-lg font-medium mb-4">2. Schedule Meeting</h3>
                  <CalendlyEmbed
                    lead={selectedLead}
                    onEventScheduled={handleEventScheduled}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={resetModal}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendly Configuration Warning */}
      {!hasCalendlyConfig && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Calendly Integration Required
              </h3>
              <p className="text-blue-800 dark:text-blue-200 mb-4">
                To schedule meetings with your leads, you need to configure your Calendly integration. 
                This will allow you to embed your scheduling calendar and automatically create meetings.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a 
                  href="/app/settings?tab=calendly" 
                  className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Configure Calendly
                </a>
                <a 
                  href="https://help.calendly.com/hc/en-us/articles/360019511834-API-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2 bg-white text-blue-600 text-sm font-medium rounded-md border border-blue-200 hover:bg-blue-50 transition-colors"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  How to get API key
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meetings List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Meetings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading meetings...</div>
            </div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No meetings yet</h3>
              <p className="text-muted-foreground mb-4">
                Schedule your first meeting to get started.
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Meeting
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Date & Time (IST)</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meetings.map((meeting) => (
                    <TableRow key={meeting.id}>
                      <TableCell className="font-medium">
                        {meeting.title}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{meeting.lead_name || 'Unknown'}</div>
                          {meeting.lead_email && (
                            <div className="text-sm text-muted-foreground">{meeting.lead_email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>{formatDateTime(meeting.start_time)}</span>
                          </div>
                          {meeting.end_time && (
                            <div className="text-sm text-muted-foreground">
                              to {formatDateTime(meeting.end_time)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getPlatformIcon(meeting.platform)}
                          <span className="capitalize">{meeting.platform}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(meeting.status)}>
                          {meeting.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {meeting.created_by || 'You'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {meeting.meeting_link && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(meeting.meeting_link, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Join
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
