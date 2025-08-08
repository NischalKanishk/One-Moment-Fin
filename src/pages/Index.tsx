import { Helmet } from "react-helmet-async";
import heroImage from "@/assets/hero-dashboard.jpg";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>OneMFin – AI for Mutual Fund Distributors</title>
        <meta name="description" content="AI-powered lead to investor platform: capture, assess risk, run KYC, schedule meetings, suggest products, and report — fast." />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : 'https://onemfin.app'} />
      </Helmet>

      <header className="border-b">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="font-semibold text-lg">OneMFin</a>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="story-link">Features</a>
            <a href="#how" className="story-link">How it works</a>
            <a href="#pricing" className="story-link">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <a href="/auth" className="hidden sm:inline-flex"><Button variant="outline">Sign in</Button></a>
            <a href="/auth"><Button variant="cta" className="hover-scale">Try free</Button></a>
          </div>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-6 py-16 grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6 animate-enter">
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">AI-powered lead → investor platform for MFDs</h1>
            <p className="text-lg text-muted-foreground">Capture leads, auto‑assess risk, one‑click KYC, smart product suggestions and clean reports. Built for speed and clarity.</p>
            <div className="flex items-center gap-3">
              <a href="/auth"><Button variant="cta" size="lg">Start in 30s</Button></a>
              <a href="/app/dashboard"><Button variant="outline" size="lg">View dashboard</Button></a>
            </div>
            <ul className="text-sm text-muted-foreground grid grid-cols-2 gap-2">
              <li>• WhatsApp & Calendar sync</li>
              <li>• Risk forms & AI suggestions</li>
              <li>• KYC links</li>
              <li>• Portfolio & reports</li>
            </ul>
          </div>
          <div className="rounded-lg overflow-hidden shadow-[var(--shadow-card)] border">
            <img src={heroImage} alt="OneMFin dashboard preview for MFDs" loading="lazy" className="w-full h-auto" />
          </div>
        </section>

        <section id="how" className="bg-secondary py-16">
          <div className="container mx-auto px-6 grid md:grid-cols-3 gap-8">
            {[
              {title: 'Create link', desc: 'Get your public lead link. Share on WhatsApp/website.'},
              {title: 'Assess & suggest', desc: 'Run risk in 2 clicks. AI suggests products with reasons.'},
              {title: 'Convert & report', desc: 'Schedule meetings, complete KYC, track AUM & reports.'},
            ].map((s) => (
              <div key={s.title} className="p-6 bg-background rounded-lg border shadow-sm">
                <h3 className="font-medium mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-10 text-center text-sm text-muted-foreground">© {new Date().getFullYear()} OneMFin</footer>
    </div>
  );
};

export default Index;
