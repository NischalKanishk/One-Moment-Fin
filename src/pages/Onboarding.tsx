import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Onboarding – OneMFin</title>
        <meta name="description" content="Set up profile, lead form, AI suggestions, and integrations in minutes." />
      </Helmet>
      <div className="container mx-auto px-6 py-10">
        <h1 className="text-3xl font-semibold mb-6">Let’s set you up</h1>
        <div className="bg-card border rounded-lg shadow-[var(--shadow-card)]">
          <div className="border-b p-4 flex items-center justify-between text-sm">
            <div>Step {step} of 4</div>
            <div className="text-muted-foreground">Complete in ~3 minutes</div>
          </div>
          <div className="p-6 space-y-6">
            {step === 1 && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input placeholder="Rahul" />
                  </div>
                  <div>
                    <Label>Firm</Label>
                    <Input placeholder="Rahul Investments" />
                  </div>
                  <div>
                    <Label>PAN (optional)</Label>
                    <Input placeholder="ABCDE1234F" />
                  </div>
                </div>
                <div className="space-y-4">
                  <Label>Your public link</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">onemfin.app/r/</span>
                    <Input className="w-40" defaultValue="rahul123" />
                    <Button variant="outline">Preview</Button>
                  </div>
                  <p className="text-sm text-muted-foreground">Share this link to capture leads instantly.</p>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-medium">Default form & assessment</h3>
                <p className="text-sm text-muted-foreground">Use our defaults or import a template. You can edit questions later.</p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-4 border rounded-md">Form preview</div>
                  <div className="p-4 border rounded-md">Assessment preview</div>
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-medium">AI settings</h3>
                <div className="flex items-center justify-between border rounded-md p-4">
                  <div>
                    <div className="font-medium">AI suggestions</div>
                    <p className="text-sm text-muted-foreground">Let AI suggest products based on risk and profile.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            )}
            {step === 4 && (
              <div className="space-y-4">
                <h3 className="font-medium">Integrations</h3>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="border rounded-md p-4">Google Calendar</div>
                  <div className="border rounded-md p-4">WhatsApp API</div>
                  <div className="border rounded-md p-4">KYC provider</div>
                </div>
              </div>
            )}
          </div>
          <div className="border-t p-4 flex items-center justify-between">
            <Button variant="outline" onClick={()=>setStep((s)=>Math.max(1,s-1))}>Back</Button>
            <div className="flex gap-2">
              {step < 4 ? (
                <Button variant="cta" onClick={()=>setStep((s)=>Math.min(4,s+1))}>Next</Button>
              ) : (
                <a href="/app/dashboard"><Button variant="cta">Finish</Button></a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
