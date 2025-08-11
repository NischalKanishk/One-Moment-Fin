import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Phone, Mail, Calendar, FileText, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface Lead {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  status: string;
  source_link?: string;
  created_at: string;
  hasAssessment: boolean;
  hasMeeting: boolean;
  riskCategory?: string;
}

interface TopLeadsCardProps {
  title: string;
  leads: Lead[];
  loading?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'lead':
      return 'bg-blue-100 text-blue-800';
    case 'assessment_done':
      return 'bg-green-100 text-green-800';
    case 'meeting_scheduled':
      return 'bg-yellow-100 text-yellow-800';
    case 'converted':
      return 'bg-purple-100 text-purple-800';
    case 'dropped':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getRiskColor = (risk?: string) => {
  switch (risk) {
    case 'low':
      return 'bg-green-100 text-green-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'high':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

export function TopLeadsCard({ title, leads, loading = false }: TopLeadsCardProps) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (leads.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="text-muted-foreground mb-2">No leads found</div>
            <p className="text-sm text-muted-foreground">
              {title.includes('week') ? 'No leads added this week' : 'Start by adding your first lead'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <Link to="/app/leads">
            <Button variant="ghost" size="sm" className="text-xs">
              View All
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {leads.map((lead, index) => (
            <div key={lead.id} className="relative">
              <Link 
                to={`/app/leads/${lead.id}`}
                className="block hover:bg-gray-50 rounded-lg p-3 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  {/* Avatar with ranking */}
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {lead.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                  </div>

                  {/* Lead Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm truncate">{lead.full_name}</h4>
                      <Badge className={`text-xs px-2 py-0.5 ${getStatusColor(lead.status)}`}>
                        {lead.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    {/* Contact Info */}
                    <div className="space-y-1">
                      {lead.email && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Mail className="w-3 h-3 mr-1" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Phone className="w-3 h-3 mr-1" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Status Indicators */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2">
                        {lead.hasAssessment && (
                          <div className="flex items-center text-xs text-green-600">
                            <FileText className="w-3 h-3 mr-1" />
                            <span>Assessed</span>
                          </div>
                        )}
                        {lead.hasMeeting && (
                          <div className="flex items-center text-xs text-blue-600">
                            <Calendar className="w-3 h-3 mr-1" />
                            <span>Meeting</span>
                          </div>
                        )}
                      </div>
                      
                      {lead.riskCategory && (
                        <Badge className={`text-xs px-2 py-0.5 ${getRiskColor(lead.riskCategory)}`}>
                          {lead.riskCategory}
                        </Badge>
                      )}
                    </div>

                    {/* Created Date */}
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(lead.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
