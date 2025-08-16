import { Helmet } from "react-helmet-async";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { Users, Calendar, ClipboardList, TrendingUp, Plus, Send, Clock, Video, ExternalLink } from "lucide-react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { leadsAPI } from "@/lib/api";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useChartTheme } from "@/components/charts/ThemeProvider";
import { useNavigate } from "react-router-dom";

const spark = Array.from({ length: 24 }, (_, i) => ({
  x: i,
  y: Math.round(60 + Math.sin(i / 2) * 20 + Math.random() * 10),
}));

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  lead_name: string | null;
  platform: string;
  meeting_link: string | null;
  status: string;
}

export default function Dashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const chartTheme = useChartTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    byStatus: { lead: 0, assessment_done: 0, meeting_scheduled: 0, converted: 0, dropped: 0 },
    thisMonth: 0
  });
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadStats();
    loadMeetings();
    loadRecentLeads();
  }, []);

  const loadStats = async () => {
    try {
      // Get the Clerk token for authentication
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      const response = await leadsAPI.getStats(token);
      const statsData = response?.stats || response;
      
      // Ensure proper structure
      if (statsData && typeof statsData === 'object') {
        setStats({
          total: statsData.total || 0,
          byStatus: {
            lead: statsData.byStatus?.lead || 0,
            assessment_done: statsData.byStatus?.assessment_done || 0,
            meeting_scheduled: statsData.byStatus?.meeting_scheduled || 0,
            converted: statsData.byStatus?.converted || 0,
            dropped: statsData.byStatus?.dropped || 0
          },
          thisMonth: statsData.thisMonth || 0
        });
      } else {
        throw new Error('Invalid stats data structure');
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      // Use empty data instead of mock data
      setStats({
        total: 0,
        byStatus: { 
          lead: 0, 
          assessment_done: 0, 
          meeting_scheduled: 0, 
          converted: 0, 
          dropped: 0 
        },
        thisMonth: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMeetings = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/leads/meetings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        try {
          const data = await response.json();
          // Handle both old and new response formats
          const meetingsData = data.meetings || data || [];
          
          // Ensure meetingsData is an array
          if (Array.isArray(meetingsData)) {
            // Get only upcoming meetings (scheduled and in the future)
            const upcomingMeetings = meetingsData
              ?.filter((meeting: Meeting) => 
                meeting.status === 'scheduled' && new Date(meeting.start_time) > new Date()
              )
              .sort((a: Meeting, b: Meeting) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
              .slice(0, 3) || [];
            
            setMeetings(upcomingMeetings);
          } else {
            console.warn('Meetings data is not an array:', meetingsData);
            setMeetings([]);
          }
        } catch (jsonError) {
          console.error('Failed to parse meetings JSON:', jsonError);
          setMeetings([]);
        }
      }
    } catch (error) {
      console.error('Failed to load meetings:', error);
      // Set empty array on error to prevent undefined errors
      setMeetings([]);
    }
  };

  const loadRecentLeads = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/leads?limit=5&sort=created_at&order=desc`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        try {
          const data = await response.json();
          // Handle both old and new response formats
          const leadsData = data.leads || data || [];
          
          // Ensure leadsData is an array
          if (Array.isArray(leadsData)) {
            setRecentLeads(leadsData);
          } else {
            console.warn('Leads data is not an array:', leadsData);
            setRecentLeads([]);
          }
        } catch (jsonError) {
          console.error('Failed to parse leads JSON:', jsonError);
          setRecentLeads([]);
        }
      }
    } catch (error) {
      console.error('Failed to load recent leads:', error);
      // Set empty array on error to prevent undefined errors
      setRecentLeads([]);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const riskData = [
    { name: "Conservative", value: stats.byStatus.lead },
    { name: "Balanced", value: stats.byStatus.assessment_done },
    { name: "Aggressive", value: stats.byStatus.converted },
  ];

  const funnelData = [
    { stage: "Leads", value: stats.total },
    { stage: "Assessment Done", value: stats.byStatus.assessment_done },
    { stage: "Meetings", value: stats.byStatus.meeting_scheduled },
    { stage: "Converted", value: stats.byStatus.converted },
  ];

  return (
    <div className="space-y-8">
      <Helmet>
        <title>Dashboard – OneMFin</title>
        <meta name="description" content="Overview of leads, meetings, KYC and AUM." />
        <link rel="canonical" href="/app/dashboard" />
      </Helmet>

      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.firstName || 'User'}. Here's what's happening with your business.
        </p>
      </div>

      {/* Quick Stats */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.thisMonth > 0 ? `+${stats.thisMonth} this month` : 'No new leads this month'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assessments Done</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byStatus.assessment_done}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? `${Math.round((stats.byStatus.assessment_done / stats.total) * 100)}% completion rate` : 'No leads yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meetings Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byStatus.meeting_scheduled}</div>
            <p className="text-xs text-muted-foreground">
              {stats.byStatus.assessment_done > 0 ? `${Math.round((stats.byStatus.meeting_scheduled / stats.byStatus.assessment_done) * 100)}% conversion rate` : 'No assessments yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Converted</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byStatus.converted}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? `${Math.round((stats.byStatus.converted / stats.total) * 100)}% success rate` : 'No leads yet'}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Charts Section */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Risk Profile Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={riskData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={60}
                  paddingAngle={2}
                >
                  {riskData.map((_, i) => (
                    <Cell 
                      key={i} 
                      fill={[chartTheme.colors.primary, chartTheme.colors.success, chartTheme.colors.muted][i % 3]} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: chartTheme.colors.tooltip.background,
                    border: `1px solid ${chartTheme.colors.tooltip.border}`,
                    borderRadius: '8px',
                    boxShadow: chartTheme.shadows.tooltip
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Lead Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData}>
                <XAxis 
                  dataKey="stage" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTheme.colors.axis, fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTheme.colors.axis, fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: chartTheme.colors.tooltip.background,
                    border: `1px solid ${chartTheme.colors.tooltip.border}`,
                    borderRadius: '8px',
                    boxShadow: chartTheme.shadows.tooltip
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill={chartTheme.colors.primary} 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      {/* Upcoming Meetings Section */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Meetings
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/app/meetings')}
              >
                View all
              </Button>
              <Button 
                size="sm"
                onClick={() => navigate('/app/meetings')}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Schedule
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {meetings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No upcoming meetings</h3>
                <p className="text-muted-foreground mb-4">
                  Schedule your first meeting to get started.
                </p>
                <Button onClick={() => navigate('/app/meetings')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Meeting
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {meetings.map((meeting) => (
                  <div key={meeting.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
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
                        onClick={() => navigate('/app/meetings')}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Latest Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center text-muted-foreground py-8">Loading leads...</div>
            ) : recentLeads.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">No leads available</div>
            ) : (
              <div className="space-y-3">
                {recentLeads.map((lead, index) => (
                  <div key={lead.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{lead.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {lead.email || lead.phone || 'No contact info'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge 
                        variant="outline" 
                        className="text-xs px-2 py-1"
                      >
                        {lead.status || 'New'}
                      </Badge>
                      <p className="text-xs text-gray-400">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/app/leads/${lead.id}`)}
                      className="shrink-0"
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
