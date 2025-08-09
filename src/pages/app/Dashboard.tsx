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
import { Users, Calendar, ClipboardList, TrendingUp } from "lucide-react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { leadsAPI } from "@/lib/api";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const spark = Array.from({ length: 24 }, (_, i) => ({
  x: i,
  y: Math.round(60 + Math.sin(i / 2) * 20 + Math.random() * 10),
}));

const riskColors = ["hsl(var(--accent))", "hsl(var(--primary))", "hsl(var(--muted))"];

export default function Dashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { toast } = useToast();
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
    <div className="space-y-6">
      <Helmet>
        <title>Dashboard – OneMFin</title>
        <meta name="description" content="Overview of leads, meetings, KYC and AUM." />
        <link rel="canonical" href="/app/dashboard" />
      </Helmet>

      {/* Quick Actions */}
      <section className="flex flex-wrap gap-3">
        <Button variant="cta" size="sm"><Users className="mr-2 h-4 w-4" />Add Lead</Button>
        <Button variant="outline" size="sm"><ClipboardList className="mr-2 h-4 w-4" />Send Assessment</Button>
        <Button variant="secondary" size="sm"><Calendar className="mr-2 h-4 w-4" />Schedule Meeting</Button>
      </section>

      {/* Overview Cards */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { t: "Total leads", v: loading ? "..." : stats.total.toString() },
          { t: "Meetings scheduled", v: loading ? "..." : stats.byStatus.meeting_scheduled.toString() },
          { t: "Risk profiles completed", v: loading ? "..." : stats.byStatus.assessment_done.toString() },
          { t: "KYC complete", v: loading ? "..." : (stats.byStatus.converted || 0).toString() },
        ].map((s) => (
          <Card key={s.t} className="shadow-[var(--shadow-card)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{s.t}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div className="text-2xl font-semibold">{s.v}</div>
              <div className="h-10 w-24">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={spark} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                    <Area type="monotone" dataKey="y" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Charts + Activity */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1 shadow-[var(--shadow-card)]">
          <CardHeader className="pb-2"><CardTitle className="text-base">Risk category mix</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {riskData.map((_, i) => (
                    <Cell key={i} fill={riskColors[i % riskColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-[var(--shadow-card)]">
          <CardHeader className="pb-2"><CardTitle className="text-base">Lead conversion funnel</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData}>
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      {/* Activity & Insights */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-[var(--shadow-card)]">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Latest activity</CardTitle>
            <Button variant="outline" size="sm">View all</Button>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {loading ? (
                <li className="text-center text-muted-foreground py-4">Loading activity...</li>
              ) : stats.total === 0 ? (
                <li className="text-center text-muted-foreground py-4">No recent activity</li>
              ) : (
                <li className="text-center text-muted-foreground py-4">Activity data will appear here</li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader className="pb-2"><CardTitle className="text-base">AI insights</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-3">
            {loading ? (
              <div className="text-center text-muted-foreground py-4">Loading insights...</div>
            ) : stats.total === 0 ? (
              <div className="text-center text-muted-foreground py-4">No insights available</div>
            ) : (
              <div className="text-center text-muted-foreground py-4">AI insights will appear here</div>
            )}
          </CardContent>
        </Card>
      </section>


    </div>
  );
}
