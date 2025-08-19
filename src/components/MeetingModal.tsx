import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Video, Mail, Plus, Edit, X, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@clerk/clerk-react';

interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (meetingData: MeetingFormData) => void;
  meeting?: MeetingData | null;
  leads: Lead[];
  mode: 'create' | 'edit';
}

interface Lead {
  id: string;
  full_name: string;
  email: string;
}

interface MeetingData {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  description?: string;
  platform: string;
  lead_id: string;
  attendees?: string[];
}

interface MeetingFormData {
  lead_id: string;
  title: string;
  start_time: string;
  end_time: string;
  description: string;
  platform: 'google_meet' | 'zoom' | 'manual';
  attendees: string[];
}

interface GoogleCalendarStatus {
  isConnected: boolean;
  email?: string;
  name?: string;
}

export default function MeetingModal({
  isOpen,
  onClose,
  onSubmit,
  meeting,
  leads,
  mode
}: MeetingModalProps) {
  const { getToken } = useAuth();
  const [formData, setFormData] = useState<MeetingFormData>({
    lead_id: '',
    title: '',
    start_time: '',
    end_time: '',
    description: '',
    platform: 'google_meet',
    attendees: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [newAttendee, setNewAttendee] = useState('');
  const [googleStatus, setGoogleStatus] = useState<GoogleCalendarStatus>({ isConnected: false });
  const [isCheckingGoogle, setIsCheckingGoogle] = useState(true);

  useEffect(() => {
    if (meeting && mode === 'edit') {
      setFormData({
        lead_id: meeting.lead_id,
        title: meeting.title,
        start_time: meeting.start_time,
        end_time: meeting.end_time,
        description: meeting.description || '',
        platform: meeting.platform as 'google_meet' | 'zoom' | 'manual',
        attendees: meeting.attendees || []
      });
    } else {
      // Set default times for new meetings
      const now = new Date();
      const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration
      
      setFormData({
        lead_id: '',
        title: '',
        start_time: startTime.toISOString().slice(0, 16),
        end_time: endTime.toISOString().slice(0, 16),
        description: '',
        platform: 'google_meet',
        attendees: []
      });
    }
  }, [meeting, mode]);

  useEffect(() => {
    if (isOpen) {
      checkGoogleConnection();
    }
  }, [isOpen]);

  const checkGoogleConnection = async () => {
    try {
      setIsCheckingGoogle(true);
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/meetings/google-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const status = await response.json();
        setGoogleStatus(status);
      }
    } catch (error) {
      console.error('Failed to check Google connection:', error);
    } finally {
      setIsCheckingGoogle(false);
    }
  };

  const handleInputChange = (field: keyof MeetingFormData, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addAttendee = () => {
    if (newAttendee.trim() && !formData.attendees.includes(newAttendee.trim())) {
      setFormData(prev => ({
        ...prev,
        attendees: [...prev.attendees, newAttendee.trim()]
      }));
      setNewAttendee('');
    }
  };

  const removeAttendee = (email: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.filter(attendee => attendee !== email)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.lead_id || !formData.title || !formData.start_time || !formData.end_time) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (new Date(formData.start_time) >= new Date(formData.end_time)) {
      toast({
        title: "Validation Error",
        description: "End time must be after start time.",
        variant: "destructive"
      });
      return;
    }

    // Check if user is trying to use Google Meet without connecting
    if (formData.platform === 'google_meet' && !googleStatus.isConnected) {
      toast({
        title: "Google Calendar Not Connected",
        description: "Please connect your Google Calendar first to use Google Meet.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(formData);
      onClose();
      toast({
        title: "Success",
        description: `Meeting ${mode === 'create' ? 'created' : 'updated'} successfully.`,
      });
    } catch (error) {
      console.error('Meeting submission error:', error);
      toast({
        title: "Error",
        description: `Failed to ${mode} meeting. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const connectGoogleCalendar = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/meetings/google-auth`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const { authUrl } = await response.json();
        const popup = window.open(authUrl, '_blank', 'width=600,height=600');
        
        // Check for popup closure and refresh status
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            checkGoogleConnection();
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to get Google auth URL:', error);
      toast({
        title: "Error",
        description: "Failed to connect Google Calendar. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getSelectedLead = () => {
    return leads.find(lead => lead.id === formData.lead_id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'create' ? (
              <>
                <Plus className="h-5 w-5" />
                Schedule New Meeting
              </>
            ) : (
              <>
                <Edit className="h-5 w-5" />
                Edit Meeting
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Lead Selection */}
          <div className="space-y-2">
            <Label htmlFor="lead_id">Lead *</Label>
            <Select
              value={formData.lead_id}
              onValueChange={(value) => handleInputChange('lead_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a lead" />
              </SelectTrigger>
              <SelectContent>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{lead.full_name}</span>
                      <span className="text-sm text-muted-foreground">{lead.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Meeting Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Meeting Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter meeting title"
              required
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => handleInputChange('start_time', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => handleInputChange('end_time', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Platform Selection */}
          <div className="space-y-2">
            <Label htmlFor="platform">Meeting Platform *</Label>
            <Select
              value={formData.platform}
              onValueChange={(value: 'google_meet' | 'zoom' | 'manual') => 
                handleInputChange('platform', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google_meet">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Google Meet
                  </div>
                </SelectItem>
                <SelectItem value="zoom">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Zoom
                  </div>
                </SelectItem>
                <SelectItem value="manual">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Manual/Other
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {/* Google Calendar Connection Status */}
            {formData.platform === 'google_meet' && (
              <div className="mt-2">
                {isCheckingGoogle ? (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      <span className="text-sm text-gray-600">Checking Google Calendar connection...</span>
                    </div>
                  </div>
                ) : googleStatus.isConnected ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700">
                        Connected to Google Calendar ({googleStatus.email})
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-amber-800 mb-2">
                          Connect your Google Calendar to automatically create Google Meet links and send invitations from your email.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={connectGoogleCalendar}
                          className="text-amber-700 border-amber-300 hover:bg-amber-100"
                        >
                          Connect Google Calendar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter meeting description"
              rows={3}
            />
          </div>

          {/* Attendees */}
          <div className="space-y-2">
            <Label>Additional Attendees</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={newAttendee}
                onChange={(e) => setNewAttendee(e.target.value)}
                placeholder="Enter email address"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAttendee())}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAttendee}
                disabled={!newAttendee.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {formData.attendees.length > 0 && (
              <div className="space-y-2">
                {formData.attendees.map((email, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{email}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttendee(email)}
                      className="h-6 w-6 p-0 ml-auto"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lead Email Preview */}
          {getSelectedLead() && (
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">
                <strong>Lead:</strong> {getSelectedLead()?.full_name} ({getSelectedLead()?.email})
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {formData.platform === 'google_meet' && googleStatus.isConnected
                  ? `Meeting invitation will be sent automatically via email from ${googleStatus.email}`
                  : 'You can manually share meeting details with the lead'}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-[100px]"
            >
              {isLoading ? (
                'Saving...'
              ) : mode === 'create' ? (
                'Schedule Meeting'
              ) : (
                'Update Meeting'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
