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
import { Users, Calendar, ClipboardList, TrendingUp, Plus, Send, Clock } from "lucide-react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { leadsAPI } from "@/lib/api";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useChartTheme } from "@/components/charts/ThemeProvider";

const spark = Array.from({ length: 24 }, (_, i) => ({
  x: i,
  y: Math.round(60 + Math.sin(i / 2) * 20 + Math.random() * 10),
}));

export default function Dashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const chartTheme = useChartTheme();
  const [stats, setStats] = useState({
    total: 0,
    byStatus: { lead: 0, assessment_done: 0, meeting_scheduled: 0, converted: 0, dropped: 0 },
    thisMonth: 0
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get the Clerk token for authentication
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      const { stats: statsData } = await leadsAPI.getStats(token);
      setStats(statsData);
    } catch (error) {
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

      {/* Quick Actions */}
      <section className="flex flex-wrap gap-3">
        <Button variant="primary" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Lead
        </Button>
        <Button variant="outline" size="sm">
          <Send className="mr-2 h-4 w-4" />
          Send Assessment
        </Button>
        <Button variant="secondary" size="sm">
          <Clock className="mr-2 h-4 w-4" />
          Schedule Meeting
        </Button>
      </section>

      {/* Overview Cards */}
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { 
            title: "Total Leads", 
            value: loading ? "..." : stats.total.toString(),
            icon: Users,
            trend: "+12% from last month"
          },
          { 
            title: "Meetings Scheduled", 
            value: loading ? "..." : stats.byStatus.meeting_scheduled.toString(),
            icon: Calendar,
            trend: "+5 this week"
          },
          { 
            title: "Risk Profiles Completed", 
            value: loading ? "..." : stats.byStatus.assessment_done.toString(),
            icon: ClipboardList,
            trend: "+8% completion rate"
          },
          { 
            title: "KYC Complete", 
            value: loading ? "..." : (stats.byStatus.converted || 0).toString(),
            icon: TrendingUp,
            trend: "+3 this month"
          },
        ].map((stat, index) => (
          <Card key={stat.title} className="group hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <stat.icon className="h-5 w-5 text-muted-foreground" />
                <Badge variant="secondary" className="text-xs">
                  {stat.trend}
                </Badge>
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="h-12 w-20">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={spark} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                    <Area 
                      type="monotone" 
                      dataKey="y" 
                      stroke={chartTheme.colors.primary} 
                      fill={chartTheme.colors.primary} 
                      fillOpacity={0.15} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Charts + Activity */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Risk Category Mix</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={riskData} 
                  dataKey="value" 
                  nameKey="name" 
                  innerRadius={50} 
                  outerRadius={80}
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

      {/* Activity & Insights */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Latest Activity</CardTitle>
            <Button variant="outline" size="sm">View all</Button>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4 text-sm">
              {loading ? (
                <li className="text-center text-muted-foreground py-8">Loading activity...</li>
              ) : stats.total === 0 ? (
                <li className="text-center text-muted-foreground py-8">No recent activity</li>
              ) : (
                <li className="text-center text-muted-foreground py-8">Activity data will appear here</li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">AI Insights</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            {loading ? (
              <div className="text-center text-muted-foreground py-8">Loading insights...</div>
            ) : stats.total === 0 ? (
              <div className="text-center text-muted-foreground py-8">No insights available</div>
            ) : (
              <div className="text-center text-muted-foreground py-8">AI insights will appear here</div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
