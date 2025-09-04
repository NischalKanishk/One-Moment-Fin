import React, { useState, useEffect } from 'react';
import { Helmet } from "react-helmet-async";
import { useUser, useAuth } from "@clerk/clerk-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, Video, ExternalLink, Plus, Edit, X, MoreHorizontal, Link as LinkIcon, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import MeetingModal from "@/components/MeetingModal";
import CalendlyConfigModal from "@/components/CalendlyConfigModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  lead_id: string;
  calendly_link?: string;
}

interface Lead {
  id: string;
  full_name: string;
  email: string;
}

interface CalendlyConfig {
  username: string;
  apiKey?: string;
  organizationUri?: string;
  userUri?: string;
}

export default function Meetings() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isCalendlyConfigOpen, setIsCalendlyConfigOpen] = useState(false);
  const [calendlyConfig, setCalendlyConfig] = useState<CalendlyConfig | null>(null);
  const [isCheckingCalendly, setIsCheckingCalendly] = useState(true);

  // Fetch meetings and leads on component mount
  useEffect(() => {
    fetchMeetings();
    fetchLeads();
    checkCalendlyConfig();
  }, []);

  const fetchMeetings = async () => {
    try {
      setIsLoading(true);
      
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('🔍 Frontend: Token type check - length:', token.length, 'parts:', token.split('.').length);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/meetings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('🔍 Frontend: API response error:', response.status, errorData);
        
        if (response.status === 401) {
          throw new Error('Authentication failed. Please try signing out and signing back in.');
        } else if (response.status === 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(`Request failed with status ${response.status}`);
        }
      }

      try {
        const responseText = await response.text();
        console.log('🔍 Raw response text:', responseText);
        
        if (!responseText) {
          console.warn('⚠️ Empty response received');
          setMeetings([]);
          return;
        }
        
        const data = JSON.parse(responseText);
        console.log('🔍 Parsed data:', data);
        
        // Handle both old and new response formats
        const meetingsData = data.meetings || data || [];
        setMeetings(Array.isArray(meetingsData) ? meetingsData : []);
      } catch (jsonError) {
        console.error('Failed to parse meetings JSON:', jsonError);
        console.error('Response status:', response.status);
        console.error('Response headers:', response.headers);
        setMeetings([]);
      }
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load meetings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      console.log('🔍 Frontend: Fetch leads - token length:', token.length);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/leads`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('🔍 Frontend: Fetch leads API error:', response.status, errorData);
        return;
      }

      try {
        const responseText = await response.text();
        console.log('🔍 Raw leads response text:', responseText);
        
        if (!responseText) {
          console.warn('⚠️ Empty leads response received');
          setLeads([]);
          return;
        }
        
        const data = JSON.parse(responseText);
        console.log('🔍 Parsed leads data:', data);
        
        // Handle both old and new response formats
        const leadsData = data.leads || data || [];
        setLeads(Array.isArray(leadsData) ? leadsData : []);
      } catch (jsonError) {
        console.error('Failed to parse leads JSON:', jsonError);
        console.error('Leads response status:', response.status);
        console.error('Leads response headers:', response.headers);
        setLeads([]);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    }
  };

  const checkCalendlyConfig = async () => {
    try {
      setIsCheckingCalendly(true);
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/meetings/calendly-config`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCalendlyConfig(data.config);
      }
    } catch (error) {
      console.error('Failed to check Calendly config:', error);
    } finally {
      setIsCheckingCalendly(false);
    }
  };

  const handleCreateMeeting = async (meetingData: any) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('🔍 Frontend: Create meeting - token length:', token.length);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/meetings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meetingData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('🔍 Frontend: Create meeting API error:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to create meeting');
      }

      await fetchMeetings();
    } catch (error) {
      console.error('Failed to create meeting:', error);
      throw error;
    }
  };

  const handleUpdateMeeting = async (meetingData: any) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('🔍 Frontend: Update meeting - token length:', token.length);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/meetings/${editingMeeting?.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meetingData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('🔍 Frontend: Update meeting API error:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to update meeting');
      }

      await fetchMeetings();
    } catch (error) {
      console.error('Failed to update meeting:', error);
      throw error;
    }
  };

  const handleCancelMeeting = async (meetingId: string, reason?: string) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('🔍 Frontend: Cancel meeting - token length:', token.length);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/meetings/${meetingId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('🔍 Frontend: Cancel meeting API error:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to cancel meeting');
      }

      await fetchMeetings();
      toast({
        title: "Success",
        description: "Meeting cancelled successfully.",
      });
    } catch (error) {
      console.error('Failed to cancel meeting:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel meeting. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleStatusUpdate = async (meetingId: string, status: string) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('🔍 Frontend: Update status - token length:', token.length);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/meetings/${meetingId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('🔍 Frontend: Update status API error:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to update meeting status');
      }

      await fetchMeetings();
      toast({
        title: "Success",
        description: "Meeting status updated successfully.",
      });
    } catch (error) {
      console.error('Failed to update meeting status:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update meeting status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setEditingMeeting(null);
    setIsModalOpen(true);
  };

  const openEditModal = (meeting: Meeting) => {
    setModalMode('edit');
    setEditingMeeting(meeting);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMeeting(null);
  };

  const handleModalSubmit = async (meetingData: any) => {
    if (modalMode === 'create') {
      await handleCreateMeeting(meetingData);
    } else {
      await handleUpdateMeeting(meetingData);
    }
  };

  const openCalendlyConfig = () => {
    setIsCalendlyConfigOpen(true);
  };

  const closeCalendlyConfig = () => {
    setIsCalendlyConfigOpen(false);
  };

  const handleCalendlyConfigSaved = () => {
    checkCalendlyConfig();
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
        return <LinkIcon className="h-4 w-4 text-purple-600" />;
      case 'zoom':
        return <Video className="h-4 w-4 text-blue-500" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  const getUpcomingMeetings = () => {
    const now = new Date();
    return meetings.filter(meeting => 
      meeting.status === 'scheduled' && new Date(meeting.start_time) > now
    ).slice(0, 3);
  };

  const getRecentMeetings = () => {
    return meetings.filter(meeting => 
      meeting.status === 'completed'
    ).slice(0, 5);
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Meetings – OneMFin</title>
        <meta name="description" content="Manage your meetings and appointments." />
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
        <div className="flex items-center gap-3">
          <Button
            onClick={openCalendlyConfig}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Calendly Config
          </Button>
          <Button onClick={openCreateModal} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Schedule Meeting
          </Button>
        </div>
      </div>

      {/* Calendly Integration Status */}
      <Card className="border-l-4 border-l-purple-500">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {isCheckingCalendly ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              ) : calendlyConfig?.username ? (
                <div className="flex items-center gap-2 text-green-600">
                  <LinkIcon className="h-6 w-6" />
                  <span className="text-lg font-semibold">✓ Connected</span>
                </div>
              ) : (
                <LinkIcon className="h-6 w-6 text-purple-600 mt-0.5" />
              )}
              
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {isCheckingCalendly 
                    ? 'Checking Calendly configuration...'
                    : calendlyConfig?.username 
                    ? 'Calendly Connected'
                    : 'Configure Calendly Integration'
                  }
                </h3>
                
                {!isCheckingCalendly && (
                  <div className="space-y-2">
                    {calendlyConfig?.username ? (
                      <div className="space-y-3">
                        <p className="text-green-700">
                          ✅ Connected to Calendly as <strong>@{calendlyConfig.username}</strong>
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={openCalendlyConfig}
                            variant="outline"
                            size="sm"
                            className="text-green-700 border-green-300 hover:bg-green-100"
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Manage Configuration
                          </Button>
                          <Button
                            onClick={() => window.open(`https://calendly.com/${calendlyConfig.username}`, '_blank')}
                            variant="outline"
                            size="sm"
                            className="text-green-700 border-green-300 hover:bg-green-100"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View Calendly
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-purple-700">
                          🔗 Configure Calendly to streamline your meeting scheduling:
                        </p>
                        <ul className="text-sm text-purple-700 space-y-1 ml-4">
                          <li>• Add your Calendly username and API key</li>
                          <li>• Automatic link generation for meetings</li>
                          <li>• Professional scheduling experience</li>
                          <li>• Future Scheduling API integration ready</li>
                        </ul>
                        <Button
                          onClick={openCalendlyConfig}
                          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                        >
                          <Settings className="h-4 w-4" />
                          Configure Calendly
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Meetings</p>
                <p className="text-2xl font-bold">{meetings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">
                  {meetings.filter(m => m.status === 'scheduled' && new Date(m.start_time) > new Date()).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Video className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">
                  {meetings.filter(m => {
                    const meetingDate = new Date(m.start_time);
                    const weekStart = new Date();
                    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekEnd.getDate() + 7);
                    return meetingDate >= weekStart && meetingDate < weekEnd;
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Meetings */}
      {getUpcomingMeetings().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getUpcomingMeetings().map((meeting) => (
                <div key={meeting.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getPlatformIcon(meeting.platform)}
                    <div>
                      <p className="font-medium">{meeting.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {meeting.lead_name} • {formatDateTime(meeting.start_time)}
                      </p>
                    </div>
                  </div>
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
                    {meeting.calendly_link && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(meeting.calendly_link, '_blank')}
                      >
                        <LinkIcon className="h-3 w-3 mr-1" />
                        Schedule
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(meeting)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Meetings */}
      <Card>
        <CardHeader>
          <CardTitle>All Meetings</CardTitle>
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
              <Button onClick={openCreateModal}>
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
                          <span className="capitalize">{meeting.platform.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(meeting.status)}>
                          {meeting.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {meeting.meeting_link && meeting.status === 'scheduled' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(meeting.meeting_link, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Join
                            </Button>
                          )}
                          
                          {meeting.calendly_link && meeting.status === 'scheduled' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(meeting.calendly_link, '_blank')}
                            >
                              <LinkIcon className="h-3 w-3 mr-1" />
                              Schedule
                            </Button>
                          )}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditModal(meeting)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              
                              {meeting.status === 'scheduled' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleStatusUpdate(meeting.id, 'completed')}>
                                    <Clock className="h-4 w-4 mr-2" />
                                    Mark Complete
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCancelMeeting(meeting.id)}>
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel
                                  </DropdownMenuItem>
                                </>
                              )}
                              
                              {meeting.status === 'completed' && (
                                <DropdownMenuItem onClick={() => handleStatusUpdate(meeting.id, 'scheduled')}>
                                  <Clock className="h-4 w-4 mr-2" />
                                  Mark Incomplete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Meeting Modal */}
      <MeetingModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        meeting={editingMeeting}
        leads={leads}
        mode={modalMode}
      />

      {/* Calendly Configuration Modal */}
      <CalendlyConfigModal
        isOpen={isCalendlyConfigOpen}
        onClose={closeCalendlyConfig}
        onConfigSaved={handleCalendlyConfigSaved}
      />
    </div>
  );
}
