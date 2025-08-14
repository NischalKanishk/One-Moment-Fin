import React, { useState, useEffect } from 'react';
import { Helmet } from "react-helmet-async";
import { useUser, useAuth } from "@clerk/clerk-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, Video, ExternalLink, Plus, Edit, X, MoreHorizontal, CheckCircle, AlertCircle, Link } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import MeetingModal from "@/components/MeetingModal";
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
}

interface Lead {
  id: string;
  full_name: string;
  email: string;
}

interface GoogleCalendarStatus {
  isConnected: boolean;
  email?: string;
  name?: string;
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
  const [googleStatus, setGoogleStatus] = useState<GoogleCalendarStatus>({ isConnected: false });
  const [isCheckingGoogle, setIsCheckingGoogle] = useState(true);

  // Fetch meetings and leads on component mount
  useEffect(() => {
    fetchMeetings();
    fetchLeads();
    checkGoogleConnection();
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

      const data = await response.json();
      setMeetings(data.meetings || []);
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

      const data = await response.json();
      setLeads(data.leads || []);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    }
  };

  const checkGoogleConnection = async () => {
    try {
      setIsCheckingGoogle(true);
      const token = await getToken();
      if (!token) return;

      console.log('🔍 Frontend: Google status check - token length:', token.length);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/meetings/google-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('🔍 Frontend: Google status API error:', response.status, errorData);
        return;
      }

      const status = await response.json();
      setGoogleStatus(status);
    } catch (error) {
      console.error('Failed to check Google connection:', error);
    } finally {
      setIsCheckingGoogle(false);
    }
  };

  const connectGoogleCalendar = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      console.log('🔍 Frontend: Google auth - token length:', token.length);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/meetings/google-auth`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('🔍 Frontend: Google auth API error:', response.status, errorData);
        throw new Error('Failed to get Google auth URL');
      }

      const { authUrl } = await response.json();
      const popup = window.open(authUrl, '_blank', 'width=600,height=600');
      
      // Check for popup closure and refresh status
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          checkGoogleConnection();
        }
      }, 1000);
    } catch (error) {
      console.error('Failed to get Google auth URL:', error);
      toast({
        title: "Error",
        description: "Failed to connect Google Calendar. Please try again.",
        variant: "destructive"
      });
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
      case 'google_meet':
        return <Video className="h-4 w-4 text-blue-600" />;
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
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Schedule Meeting
        </Button>
      </div>

      {/* Google Calendar Connection Status */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {isCheckingGoogle ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              ) : googleStatus.isConnected ? (
                <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-6 w-6 text-amber-600 mt-0.5" />
              )}
              
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {isCheckingGoogle 
                    ? 'Checking Google Calendar connection...'
                    : googleStatus.isConnected 
                    ? 'Google Calendar Connected'
                    : 'Connect Your Google Calendar'
                  }
                </h3>
                
                {!isCheckingGoogle && (
                  <div className="space-y-2">
                    {googleStatus.isConnected ? (
                      <p className="text-green-700">
                        ✅ You're connected to Google Calendar as <strong>{googleStatus.email}</strong>. 
                        All meetings will be automatically synced and invitations sent from your email.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-amber-700">
                          🔗 Connect your Google Calendar to unlock powerful meeting features:
                        </p>
                        <ul className="text-sm text-amber-700 space-y-1 ml-4">
                          <li>• Automatic Google Meet link generation</li>
                          <li>• Send meeting invitations from your email</li>
                          <li>• Sync meetings with your Google Calendar</li>
                          <li>• Professional email templates</li>
                        </ul>
                        <Button
                          onClick={connectGoogleCalendar}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                          <Link className="h-4 w-4" />
                          Connect Google Calendar
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
    </div>
  );
}
