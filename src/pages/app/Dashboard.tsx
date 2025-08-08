import { Helmet } from "react-helmet-async";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

const data = Array.from({length:24}, (_,i)=>({x:i, y: Math.round(60+Math.sin(i/2)*20 + (Math.random()*10)) }))

export default function Dashboard(){
  return (
    <div className="space-y-6">
      <Helmet>
        <title>Dashboard – OneMFin</title>
        <meta name="description" content="Overview of leads, meetings, KYC and AUM." />
      </Helmet>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[{t:'Total leads',v:'2,341'},{t:'Meetings today',v:'8'},{t:'KYC pending',v:'23'},{t:'Total AUM',v:'₹7.4Cr'}].map((s)=> (
          <Card key={s.t} className="shadow-[var(--shadow-card)]">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{s.t}</CardTitle></CardHeader>
            <CardContent className="flex items-end justify-between">
              <div className="text-2xl font-semibold">{s.v}</div>
              <div className="h-10 w-24">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{left:0,right:0,top:10,bottom:0}}>
                    <Area type="monotone" dataKey="y" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent AI suggestions</CardTitle>
          <Button variant="outline">View all</Button>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="border rounded-md p-4">
              <div className="text-sm font-medium mb-1">Balanced Growth Fund</div>
              <div className="text-xs text-muted-foreground mb-2">Match score 82%</div>
              <ul className="text-xs text-muted-foreground list-disc ml-4 space-y-1">
                <li>Risk score aligns with profile</li>
                <li>3Y stable performance</li>
                <li>Low expense ratio</li>
              </ul>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="cta">Add</Button>
                <Button size="sm" variant="outline">Why this?</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
