import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export default function LeadDetail(){
  return (
    <div className="space-y-6">
      <Helmet>
        <title>Lead – OneMFin</title>
        <meta name="description" content="Lead summary, risk assessment, meetings, KYC, portfolio and AI suggestions." />
      </Helmet>

      <div className="border rounded-lg p-4 bg-card">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div>
            <div className="text-lg font-medium">Rohit Sharma</div>
            <div className="text-sm text-muted-foreground">+91 90000 11111 • Source: Link • Risk: Balanced</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Message</Button>
            <Button variant="cta">Schedule</Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          {['overview','risk','timeline','kyc','portfolio','suggestions','notes'].map(id => (
            <TabsTrigger key={id} value={id}>{id[0].toUpperCase()+id.slice(1)}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview" className="p-4 border rounded-lg">Recent activity and summary.</TabsContent>
        <TabsContent value="risk" className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">AI analysis • Confidence 78%</div>
            <Button size="sm" variant="outline">Re-run AI</Button>
          </div>
          <ul className="text-sm text-muted-foreground list-disc ml-5">
            <li>Stable income, medium horizon</li>
            <li>Comfortable with moderate volatility</li>
            <li>Goal: child education</li>
          </ul>
        </TabsContent>
        <TabsContent value="timeline" className="p-4 border rounded-lg">Meetings & updates timeline.</TabsContent>
        <TabsContent value="kyc" className="p-4 border rounded-lg">KYC uploads & status.</TabsContent>
        <TabsContent value="portfolio" className="p-4 border rounded-lg">Holdings & allocation.</TabsContent>
        <TabsContent value="suggestions" className="p-4 border rounded-lg">Suggested products with actions.</TabsContent>
        <TabsContent value="notes" className="p-4 border rounded-lg">Internal notes.</TabsContent>
      </Tabs>
    </div>
  )
}
