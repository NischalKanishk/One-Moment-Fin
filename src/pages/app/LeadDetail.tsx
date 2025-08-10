import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MessageSquare, 
  Calendar, 
  Phone, 
  Mail, 
  ExternalLink,
  User,
  TrendingUp,
  FileText,
  Lightbulb,
  StickyNote
} from "lucide-react";
import KYCStatus from "@/components/KYCStatus";

export default function LeadDetail(){
  // Mock lead data - in real app this would come from API
  const lead = {
    id: "mock-lead-id",
    full_name: "Rohit Sharma",
    email: "rohit.sharma@email.com",
    phone: "+91 90000 11111",
    source_link: "website",
    status: "assessment_done",
    kyc_status: "pending",
    age: 35,
    notes: "Interested in mutual funds for child education. Has stable government job."
  };

  const handleKYCStatusChange = () => {
    // Refresh lead data or update UI as needed
    console.log("KYC status changed");
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>{lead.full_name} – OneMFin</title>
        <meta name="description" content="Lead summary, risk assessment, meetings, KYC, portfolio and AI suggestions." />
      </Helmet>

      {/* Lead Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <User className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold">{lead.full_name}</h1>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {lead.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {lead.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <ExternalLink className="h-4 w-4" />
                      Source: {lead.source_link}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Age: {lead.age}</Badge>
                <Badge variant="secondary">Status: {lead.status.replace('_', ' ')}</Badge>
                <Badge variant={lead.kyc_status === 'completed' ? 'default' : 'secondary'}>
                  KYC: {lead.kyc_status}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Message
              </Button>
              <Button variant="default" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedule
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Lead Notes */}
      {lead.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{lead.notes}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="kyc">KYC</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Lead Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Full Name:</span>
                  <p className="font-medium">{lead.full_name}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Age:</span>
                  <p className="font-medium">{lead.age} years</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <p className="font-medium">{lead.email}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Phone:</span>
                  <p className="font-medium">{lead.phone}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Source:</span>
                  <p className="font-medium capitalize">{lead.source_link}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Current Status:</span>
                  <p className="font-medium capitalize">{lead.status.replace('_', ' ')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">AI analysis • Confidence 78%</div>
                <Button size="sm" variant="outline">Re-run AI</Button>
              </div>
              <Separator />
              <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1">
                <li>Stable income, medium horizon</li>
                <li>Comfortable with moderate volatility</li>
                <li>Goal: child education</li>
                <li>Risk tolerance: Moderate</li>
                <li>Investment horizon: 10-15 years</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Meetings & updates timeline will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="kyc" className="space-y-4">
          <KYCStatus leadId={lead.id} onStatusChange={handleKYCStatusChange} />
        </TabsContent>
        
        <TabsContent value="portfolio" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Portfolio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Holdings & allocation will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="suggestions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                AI Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Suggested products with actions will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="h-5 w-5" />
                Internal Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Internal notes and comments will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
