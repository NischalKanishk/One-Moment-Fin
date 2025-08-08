import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function Auth() {
  const [step, setStep] = useState<'start'|'otp'>('start');
  return (
    <div className="min-h-screen grid place-items-center p-6 bg-background">
      <Helmet>
        <title>Sign in – OneMFin</title>
        <meta name="description" content="Passwordless sign in with email or phone. 6‑digit OTP sent instantly." />
      </Helmet>
      <div className="w-full max-w-md bg-card border rounded-lg p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-semibold mb-1">Welcome back</h1>
        <p className="text-sm text-muted-foreground mb-6">Sign in with phone or email — 6‑digit OTP sent instantly.</p>
        {step === 'start' ? (
          <form className="space-y-4" onSubmit={(e)=>{e.preventDefault(); setStep('otp')}}>
            <Input placeholder="Email or phone" required />
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" /> Remember me</label>
              <span className="text-muted-foreground">Session: 30 days</span>
            </div>
            <Button type="submit" variant="cta" className="w-full">Send OTP</Button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={(e)=>{e.preventDefault();}}>
            <Input placeholder="Enter 6‑digit OTP" inputMode="numeric" maxLength={6} />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Resend in 20s</span>
              <a href="#" className="underline">Use magic link</a>
            </div>
            <Button type="submit" variant="cta" className="w-full">Verify</Button>
          </form>
        )}
      </div>
    </div>
  )
}
