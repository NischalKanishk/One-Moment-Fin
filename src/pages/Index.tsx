import { Helmet } from "react-helmet-async";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle,
  Target,
  AlertTriangle,
  Clock,
  FileText,
  BarChart3,
  Zap,
  Star,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const Index = () => {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>OneMFin – AI for Mutual Fund Distributors</title>
        <meta name="description" content="AI-powered lead to investor platform: capture leads, assess risk, and manage your MFD business — fast." />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : 'https://onemfin.app'} />
      </Helmet>

      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">1M</span>
              </div>
              <span className="text-xl font-semibold text-foreground">OneMFin</span>
            </div>

            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </a>
            </nav>

            <div className="flex items-center gap-2">
              <SignedOut>
                <SignInButton mode="modal">
                  <Button variant="outline">Sign In</Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button variant="primary">Get Started</Button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <UserButton afterSignOutUrl="/" />
                <Link to="/app/dashboard">
                  <Button variant="primary">Open Dashboard</Button>
                </Link>
              </SignedIn>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-24 bg-gradient-to-b from-muted/50 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <h1 className="text-5xl lg:text-6xl font-bold text-foreground leading-tight">Your Smart MFD Assistant.</h1>
                <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                  Transform your mutual fund distribution business with AI-powered lead management, automated risk
                  profiling, and intelligent product recommendations.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <SignedOut>
                  <SignUpButton mode="modal">
                    <Button size="lg" variant="primary" className="px-8 py-4 text-lg">
                      Get Started Free
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Link to="/app/dashboard">
                    <Button size="lg" variant="primary" className="px-8 py-4 text-lg">
                      Open Dashboard
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </SignedIn>
                <Button size="lg" variant="ghost" className="text-foreground border-border px-8 py-4 text-lg">
                  Learn More
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-muted to-muted/50 rounded-2xl p-8 shadow-lg">
                <img
                  src="/Photo1.png"
                  alt="OneMFin Dashboard Preview"
                  className="w-full h-auto rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem → Solution Section */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">From Chaos to Control</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              See how OneMFin transforms common MFD challenges into streamlined solutions
            </p>
          </div>

          {/* Problems */}
          <div className="mb-12">
            <h3 className="text-2xl font-semibold text-foreground mb-8 text-center">Common MFD Pain Points</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: AlertTriangle,
                  title: "Missed Leads",
                  desc: "Leads slip through cracks without proper tracking",
                },
                { icon: Clock, title: "Manual Onboarding", desc: "Hours spent on repetitive data entry" },
                { icon: FileText, title: "No Central Tracking", desc: "Client data scattered across platforms" },
                { icon: Target, title: "Slow Follow-ups", desc: "Delayed responses hurt conversion rates" },
              ].map((problem, index) => (
                <Card key={index} className="border-destructive/20 bg-destructive/5 hover:shadow-lg transition-all duration-200">
                  <CardContent className="p-6 text-center">
                    <problem.icon className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h4 className="font-semibold text-foreground mb-2">{problem.title}</h4>
                    <p className="text-muted-foreground text-sm">{problem.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Solutions */}
          <div>
            <h3 className="text-2xl font-semibold text-foreground mb-8 text-center">OneMFin Solutions</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: CheckCircle,
                  title: "Smart Lead Capture",
                  desc: "Automated forms with AI-powered risk scoring",
                },
                { icon: Zap, title: "Instant Onboarding", desc: "Streamlined onboarding with progress tracking" },
                { icon: BarChart3, title: "Unified Dashboard", desc: "All client data in one powerful interface" },
                { icon: Clock, title: "Automated Follow-ups", desc: "Smart reminders and engagement tools" },
              ].map((solution, index) => (
                <Card key={index} className="border-primary/20 bg-primary/5 hover:shadow-lg transition-all duration-200">
                  <CardContent className="p-6 text-center">
                    <solution.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h4 className="font-semibold text-foreground mb-2">{solution.title}</h4>
                    <p className="text-muted-foreground text-sm">{solution.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dives */}
      <section id="features" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Powerful Features for Modern MFDs</h2>
            <p className="text-xl text-muted-foreground">Everything you need to scale your mutual fund distribution business</p>
          </div>

          <div className="space-y-24">
            {/* Feature 1 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                    <Target className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-3xl font-bold text-foreground">Lead Capture & Risk Profiling</h3>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Create public forms that automatically capture leads and use AI to assess risk profiles. Get detailed
                  insights about each prospect before your first meeting.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-foreground">Customizable lead capture forms</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-foreground">AI-powered risk assessment</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-foreground">Automated lead scoring</span>
                  </li>
                </ul>
              </div>
              <div className="bg-card rounded-2xl p-8 shadow-lg">
                <img
                  src="/Photo2.png"
                  alt="Lead Capture Interface"
                  className="w-full h-auto rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground">Start free, scale as you grow</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Trial */}
            <Card className="border-2 border-border hover:shadow-lg transition-all duration-200">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-foreground mb-2">Free Trial</h3>
                  <div className="text-4xl font-bold text-foreground mb-2">₹0</div>
                  <p className="text-muted-foreground">30 days free</p>
                </div>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-foreground">Up to 50 leads</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-foreground">Basic risk profiling</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-foreground">Email support</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-foreground">Basic dashboard</span>
                  </li>
                </ul>

                <SignedOut>
                  <SignUpButton mode="modal">
                    <Button
                      className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
                      variant="outline"
                    >
                      Start Free Trial
                    </Button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Link to="/app/dashboard">
                    <Button
                      className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
                      variant="outline"
                    >
                      Open Dashboard
                    </Button>
                  </Link>
                </SignedIn>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="border-2 border-primary hover:shadow-lg transition-all duration-200 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium">Most Popular</span>
              </div>
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-foreground mb-2">Pro Plan</h3>
                  <div className="text-4xl font-bold text-foreground mb-2">₹2,999</div>
                  <p className="text-muted-foreground">per month</p>
                </div>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-foreground">Unlimited leads</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-foreground">Advanced AI recommendations</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-foreground">Calendar integrations</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-foreground">Priority support</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-foreground">Custom branding</span>
                  </li>
                </ul>

                <SignedOut>
                  <SignUpButton mode="modal">
                    <Button className="w-full" variant="primary">Get Started</Button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Link to="/app/dashboard">
                    <Button className="w-full" variant="primary">Open Dashboard</Button>
                  </Link>
                </SignedIn>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-card px-6 py-3 rounded-full shadow-sm border border-border">
              <Star className="h-5 w-5 text-primary" />
              <span className="text-foreground font-medium">Built specifically for Indian MFDs</span>
            </div>
            <p className="text-muted-foreground mt-4">Trusted by forward-thinking mutual fund distributors across India</p>
          </div>
        </div>
      </section>

      {/* Early Access CTA Banner */}
      <section className="py-24 bg-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-background mb-4">Get 2 Months Free as an Early User</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join the waitlist and be among the first to transform your MFD business
          </p>

          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <Input type="email" placeholder="Enter your email" className="flex-1 bg-background border-0 text-foreground" />
            <SignedOut>
              <SignUpButton mode="modal">
                <Button variant="primary" className="px-8">Get Early Access</Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link to="/app/dashboard">
                <Button variant="primary" className="px-8">Open Dashboard</Button>
              </Link>
            </SignedIn>
          </div>

          <p className="text-muted-foreground text-sm mt-4">No spam. Unsubscribe anytime.</p>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-background border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">1M</span>
                </div>
                <span className="text-xl font-semibold text-foreground">OneMFin</span>
              </div>
              <p className="text-muted-foreground">Empowering MFDs with AI-powered productivity tools.</p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Support</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Documentation
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Connect</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Mail className="h-5 w-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Phone className="h-5 w-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <MapPin className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-border mt-12 pt-8 text-center">
            <p className="text-muted-foreground">© {new Date().getFullYear()} OneMFin. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
