import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Video, Mail, Plus, Edit, X, Link as LinkIcon } from 'lucide-react';
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
  calendly_link?: string;
}

interface MeetingFormData {
  lead_id: string;
  title: string;
  start_time: string;
  end_time: string;
  description: string;
  platform: 'calendly' | 'zoom' | 'manual';
  attendees: string[];
  calendly_link: string;
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
    platform: 'calendly',
    attendees: [],
    calendly_link: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [newAttendee, setNewAttendee] = useState('');

  useEffect(() => {
    if (meeting && mode === 'edit') {
      setFormData({
        lead_id: meeting.lead_id,
        title: meeting.title,
        start_time: meeting.start_time,
        end_time: meeting.end_time,
        description: meeting.description || '',
        platform: meeting.platform as 'calendly' | 'zoom' | 'manual',
        attendees: meeting.attendees || [],
        calendly_link: meeting.calendly_link || ''
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
        platform: 'calendly',
        attendees: [],
        calendly_link: ''
      });
    }
  }, [meeting, mode]);

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

    // Check if user is trying to use Calendly without providing a link
    if (formData.platform === 'calendly' && !formData.calendly_link.trim()) {
      toast({
        title: "Calendly Link Required",
        description: "Please provide a Calendly link when using Calendly as the platform.",
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
              onValueChange={(value: 'calendly' | 'zoom' | 'manual') => 
                handleInputChange('platform', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="calendly">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Calendly
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
          </div>

          {/* Calendly Link Input */}
          {formData.platform === 'calendly' && (
            <div className="space-y-2">
              <Label htmlFor="calendly_link">Calendly Link *</Label>
              <Input
                id="calendly_link"
                type="url"
                value={formData.calendly_link}
                onChange={(e) => handleInputChange('calendly_link', e.target.value)}
                placeholder="https://calendly.com/your-link"
                required
              />
              <p className="text-sm text-muted-foreground">
                Enter your Calendly scheduling link. This will be shared with the lead for easy scheduling.
              </p>
            </div>
          )}

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
                {formData.platform === 'calendly' && formData.calendly_link
                  ? `Calendly link will be shared with the lead for easy scheduling`
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
