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

const spark = Array.from({ length: 24 }, (_, i) => ({
  x: i,
  y: Math.round(60 + Math.sin(i / 2) * 20 + Math.random() * 10),
}));

const riskData = [
  { name: "Conservative", value: 34 },
  { name: "Balanced", value: 46 },
  { name: "Aggressive", value: 20 },
];

const funnelData = [
  { stage: "Leads", value: 2341 },
  { stage: "Contacted", value: 1680 },
  { stage: "Meetings", value: 412 },
  { stage: "Converted", value: 128 },
];

const riskColors = ["hsl(var(--accent))", "hsl(var(--primary))", "hsl(var(--muted))"];

export default function Dashboard() {
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
          { t: "Total leads", v: "2,341" },
          { t: "Meetings scheduled", v: "18" },
          { t: "Risk profiles completed", v: "764" },
          { t: "KYC complete", v: "420" },
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
              {[{t:"Ankit filled assessment", ts:"2m ago"},{t:"Meeting booked with Neha", ts:"1h ago"},{t:"KYC completed by Rohan", ts:"Today 10:20"},{t:"New lead via public link", ts:"Yesterday"}].map((a,i)=> (
                <li key={i} className="flex items-center justify-between border-b last:border-0 pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span>{a.t}</span>
                  </div>
                  <span className="text-muted-foreground">{a.ts}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader className="pb-2"><CardTitle className="text-base">AI insights</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-3">
            <div className="flex items-start gap-2">
              <Badge variant="secondary">3 leads</Badge>
              <span>match <strong>High-Risk</strong> profile — consider equity-focused products.</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="secondary">+12%</Badge>
              <span>higher conversion on leads contacted within 24h.</span>
            </div>
            <Button variant="cta" size="sm" className="mt-2">View matches</Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
