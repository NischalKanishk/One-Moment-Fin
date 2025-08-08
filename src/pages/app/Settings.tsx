import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";

export default function Settings(){
  return (
    <div className="space-y-4">
      <Helmet>
        <title>Settings – OneMFin</title>
        <meta name="description" content="Subscription, billing, team and integrations." />
        <link rel="canonical" href="/app/settings" />
      </Helmet>

      <Tabs defaultValue="profile">
        <TabsList className="w-full md:w-auto overflow-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input placeholder="Name" />
            <Input placeholder="Email" />
            <Input placeholder="Phone" />
            <div className="flex gap-2">
              <Input placeholder="Referral Link" value="https://onemfin.app/r/rahul123" readOnly />
              <Button variant="outline">Copy</Button>
            </div>
          </div>
          <Button variant="cta">Save</Button>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <div className="flex items-center gap-3"><Switch id="ai-score" defaultChecked /><label htmlFor="ai-score">AI scoring</label></div>
          <div className="flex items-center gap-3"><Switch id="notif-email" defaultChecked /><label htmlFor="notif-email">Email notifications</label></div>
          <div className="flex items-center gap-3"><Switch id="notif-wa" /><label htmlFor="notif-wa">WhatsApp notifications</label></div>
          <Input placeholder="Default Risk Form" />
          <Button variant="cta">Save Preferences</Button>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Current plan: Pro</div>
                <div className="text-sm text-muted-foreground">Next billing: Sep 15</div>
              </div>
              <div className="space-x-2">
                <Button variant="cta">Upgrade Plan</Button>
                <Button variant="outline">Change Payment Method</Button>
                <Button variant="outline">Cancel Plan</Button>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="text-sm">Lead usage: 75/100</div>
              <Progress value={75} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <div className="text-sm text-muted-foreground">Team management coming soon.</div>
          <Button variant="outline">Invite teammate</Button>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input placeholder="New password" type="password" />
            <Input placeholder="Confirm password" type="password" />
          </div>
          <div className="flex items-center gap-3"><Switch id="twofa" /><label htmlFor="twofa">Enable 2FA</label></div>
          <Button variant="cta">Save security</Button>
          <div className="text-sm text-muted-foreground">Recent logins will appear here.</div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
