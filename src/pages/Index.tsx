import { Helmet } from "react-helmet-async";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle,
  Calendar,
  Target,
  TrendingUp,
  AlertTriangle,
  Clock,
  FileText,
  BarChart3,
  Zap,
  Shield,
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
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>OneMFin – AI for Mutual Fund Distributors</title>
        <meta name="description" content="AI-powered lead to investor platform: capture, assess risk, run KYC, schedule meetings, suggest products, and report — fast." />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : 'https://onemfin.app'} />
      </Helmet>

      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#FF8A4A] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">1M</span>
              </div>
              <span className="text-xl font-semibold text-black">OneMFin</span>
            </div>

            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-black transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-black transition-colors">
                Pricing
              </a>
              <a href="#contact" className="text-gray-600 hover:text-black transition-colors">
                Contact
              </a>
            </nav>

            <div className="flex items-center gap-2">
              <SignedOut>
                <SignInButton mode="modal">
                  <Button variant="outline">Sign In</Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button className="bg-[#FF8A4A] hover:bg-[#FF8A4A]/90 text-white">Get Started</Button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <UserButton afterSignOutUrl="/" />
                <Link to="/app/dashboard">
                  <Button className="bg-[#FF8A4A] hover:bg-[#FF8A4A]/90 text-white">Open Dashboard</Button>
                </Link>
              </SignedIn>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-24 bg-gradient-to-b from-gray-50/50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <h1 className="text-5xl lg:text-6xl font-bold text-black leading-tight">Your Smart MFD Assistant.</h1>
                <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                  Transform your mutual fund distribution business with AI-powered lead management, automated risk
                  profiling, and intelligent product recommendations.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <SignedOut>
                  <SignUpButton mode="modal">
                    <Button size="lg" className="bg-[#FF8A4A] hover:bg-[#FF8A4A]/90 text-white px-8 py-4 text-lg">
                      Get Started Free
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Link to="/app/dashboard">
                    <Button size="lg" className="bg-[#FF8A4A] hover:bg-[#FF8A4A]/90 text-white px-8 py-4 text-lg">
                      Open Dashboard
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </SignedIn>
                <Button size="lg" variant="ghost" className="text-black border-gray-200 px-8 py-4 text-lg">
                  Learn More
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-8 shadow-2xl">
                <img
                  src="/financial-dashboard-interface.png"
                  alt="OneMFin Dashboard Preview"
                  className="w-full h-auto rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem → Solution Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-black mb-4">From Chaos to Control</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              See how OneMFin transforms common MFD challenges into streamlined solutions
            </p>
          </div>

          {/* Problems */}
          <div className="mb-12">
            <h3 className="text-2xl font-semibold text-black mb-8 text-center">Common MFD Pain Points</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: AlertTriangle,
                  title: "Missed Leads",
                  desc: "Leads slip through cracks without proper tracking",
                },
                { icon: Clock, title: "Manual Onboarding", desc: "Hours spent on repetitive KYC processes" },
                { icon: FileText, title: "No Central Tracking", desc: "Client data scattered across platforms" },
                { icon: Target, title: "Slow Follow-ups", desc: "Delayed responses hurt conversion rates" },
              ].map((problem, index) => (
                <Card key={index} className="border-red-100 bg-red-50/30">
                  <CardContent className="p-6 text-center">
                    <problem.icon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h4 className="font-semibold text-black mb-2">{problem.title}</h4>
                    <p className="text-gray-600 text-sm">{problem.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Solutions */}
          <div>
            <h3 className="text-2xl font-semibold text-black mb-8 text-center">OneMFin Solutions</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: CheckCircle,
                  title: "Smart Lead Capture",
                  desc: "Automated forms with AI-powered risk scoring",
                },
                { icon: Zap, title: "Instant Onboarding", desc: "Streamlined KYC with progress tracking" },
                { icon: BarChart3, title: "Unified Dashboard", desc: "All client data in one powerful interface" },
                { icon: TrendingUp, title: "Automated Follow-ups", desc: "Smart reminders and engagement tools" },
              ].map((solution, index) => (
                <Card key={index} className="border-green-100 bg-green-50/30">
                  <CardContent className="p-6 text-center">
                    <solution.icon className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h4 className="font-semibold text-black mb-2">{solution.title}</h4>
                    <p className="text-gray-600 text-sm">{solution.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dives */}
      <section id="features" className="py-24 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-black mb-4">Powerful Features for Modern MFDs</h2>
            <p className="text-xl text-gray-600">Everything you need to scale your mutual fund distribution business</p>
          </div>

          <div className="space-y-24">
            {/* Feature 1 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-[#FF8A4A] rounded-lg flex items-center justify-center">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-black">Lead Capture & Risk Profiling</h3>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Create public forms that automatically capture leads and use AI to assess risk profiles. Get detailed
                  insights about each prospect before your first meeting.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Customizable lead capture forms</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">AI-powered risk assessment</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Automated lead scoring</span>
                  </li>
                </ul>
              </div>
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <img
                  src="/lead-capture-risk-form.png"
                  alt="Lead Capture Interface"
                  className="w-full h-auto rounded-lg"
                />
              </div>
            </div>

            {/* Feature 2 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="bg-white rounded-2xl p-8 shadow-lg lg:order-1">
                <img
                  src="/mutual-fund-recommendation-dashboard.png"
                  alt="Product Recommendations"
                  className="w-full h-auto rounded-lg"
                />
              </div>
              <div className="space-y-6 lg:order-2">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-[#FF8A4A] rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-black">Smart Product Recommendations</h3>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Get personalized mutual fund recommendations based on each client's risk profile, investment goals,
                  and market conditions. Increase conversion with relevant suggestions.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Risk-matched fund suggestions</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Goal-based recommendations</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Performance analytics</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-[#FF8A4A] rounded-lg flex items-center justify-center">
                    <Calendar className="h-6 w-5 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-black">Meeting Scheduler</h3>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Seamlessly integrate with Google Calendar and Calendly to let prospects book meetings directly.
                  Automated reminders ensure no meetings are missed.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Calendar integration</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Automated reminders</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Meeting preparation notes</span>
                  </li>
                </ul>
              </div>
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <img src="/calendar-scheduling-interface.png" alt="Meeting Scheduler" className="w-full h-auto rounded-lg" />
              </div>
            </div>

            {/* Feature 4 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="bg-white rounded-2xl p-8 shadow-lg lg:order-1">
                <img src="/kyc-onboarding-dashboard.png" alt="KYC Tracker" className="w-full h-auto rounded-lg" />
              </div>
              <div className="space-y-6 lg:order-2">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-[#FF8A4A] rounded-lg flex items-center justify-center">
                    <Shield className="h-6 w-5 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-black">KYC Tracker</h3>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Track onboarding progress for each client with visual progress indicators. Automated follow-ups ensure
                  smooth completion of KYC requirements.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Visual progress tracking</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Document management</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Compliance alerts</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-black mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">Start free, scale as you grow</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Trial */}
            <Card className="border-2 border-gray-200 relative">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-black mb-2">Free Trial</h3>
                  <div className="text-4xl font-bold text-black mb-2">₹0</div>
                  <p className="text-gray-600">30 days free</p>
                </div>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Up to 50 leads</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Basic risk profiling</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Email support</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Basic dashboard</span>
                  </li>
                </ul>

                <SignedOut>
                  <SignUpButton mode="modal">
                    <Button
                      className="w-full border-[#FF8A4A] text-[#FF8A4A] hover:bg-[#FF8A4A] hover:text-white bg-transparent"
                      variant="outline"
                    >
                      Start Free Trial
                    </Button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Link to="/app/dashboard">
                    <Button
                      className="w-full border-[#FF8A4A] text-[#FF8A4A] hover:bg-[#FF8A4A] hover:text-white bg-transparent"
                      variant="outline"
                    >
                      Open Dashboard
                    </Button>
                  </Link>
                </SignedIn>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="border-2 border-[#FF8A4A] relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-[#FF8A4A] text-white px-4 py-2 rounded-full text-sm font-medium">Most Popular</span>
              </div>
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-black mb-2">Pro Plan</h3>
                  <div className="text-4xl font-bold text-black mb-2">₹2,999</div>
                  <p className="text-gray-600">per month</p>
                </div>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Unlimited leads</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Advanced AI recommendations</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Calendar integrations</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Priority support</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Custom branding</span>
                  </li>
                </ul>

                <SignedOut>
                  <SignUpButton mode="modal">
                    <Button className="w-full bg-[#FF8A4A] hover:bg-[#FF8A4A]/90 text-white">Get Started</Button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Link to="/app/dashboard">
                    <Button className="w-full bg-[#FF8A4A] hover:bg-[#FF8A4A]/90 text-white">Open Dashboard</Button>
                  </Link>
                </SignedIn>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-white px-6 py-3 rounded-full shadow-sm border">
              <Star className="h-5 w-5 text-[#FF8A4A]" />
              <span className="text-black font-medium">Built specifically for Indian MFDs</span>
            </div>
            <p className="text-gray-600 mt-4">Trusted by forward-thinking mutual fund distributors across India</p>
          </div>
        </div>
      </section>

      {/* Early Access CTA Banner */}
      <section className="py-24 bg-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Get 2 Months Free as an Early User</h2>
          <p className="text-xl text-gray-300 mb-8">
            Join the waitlist and be among the first to transform your MFD business
          </p>

          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <Input type="email" placeholder="Enter your email" className="flex-1 bg-white border-0 text-black" />
            <SignedOut>
              <SignUpButton mode="modal">
                <Button className="bg-[#FF8A4A] hover:bg-[#FF8A4A]/90 text-white px-8">Get Early Access</Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link to="/app/dashboard">
                <Button className="bg-[#FF8A4A] hover:bg-[#FF8A4A]/90 text-white px-8">Open Dashboard</Button>
              </Link>
            </SignedIn>
          </div>

          <p className="text-gray-400 text-sm mt-4">No spam. Unsubscribe anytime.</p>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-[#FF8A4A] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">1M</span>
                </div>
                <span className="text-xl font-semibold text-black">OneMFin</span>
              </div>
              <p className="text-gray-600">Empowering MFDs with AI-powered productivity tools.</p>
            </div>

            <div>
              <h4 className="font-semibold text-black mb-4">Company</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-600 hover:text-black transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-black transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-black transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-black mb-4">Support</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-600 hover:text-black transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-black transition-colors">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-black transition-colors">
                    Documentation
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-black mb-4">Connect</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-600 hover:text-[#FF8A4A] transition-colors">
                  <Mail className="h-5 w-5" />
                </a>
                <a href="#" className="text-gray-600 hover:text-[#FF8A4A] transition-colors">
                  <Phone className="h-5 w-5" />
                </a>
                <a href="#" className="text-gray-600 hover:text-[#FF8A4A] transition-colors">
                  <MapPin className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 mt-12 pt-8 text-center">
            <p className="text-gray-600">© {new Date().getFullYear()} OneMFin. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
