import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Calendar, Zap, Clock, Users, ArrowRight } from 'lucide-react';

export default function Meetings() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Meeting Management
          </h1>
          <p className="text-lg text-gray-600">
            Professional meeting scheduling and management for your financial advisory business
          </p>
        </div>

        {/* Coming Soon Card */}
        <Card className="border-2 border-dashed border-purple-300 bg-gradient-to-br from-purple-50 to-blue-50 mb-8">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Zap className="h-8 w-8 text-purple-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-purple-800">
              Coming Soon
            </CardTitle>
            <p className="text-purple-600 font-medium">
              We're building something amazing for you!
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-700 mb-6 text-lg">
              Our meeting management system is currently under development. We're integrating with 
              <strong className="text-purple-700"> Calendly's upcoming Scheduling API</strong> to provide you with 
              the most seamless meeting experience possible.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="text-left">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  What's Coming
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-purple-500" />
                    Direct meeting scheduling in our app
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-purple-500" />
                    No more redirects to external sites
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-purple-500" />
                    AI-powered scheduling assistance
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-purple-500" />
                    Seamless lead-to-meeting workflow
                  </li>
                </ul>
              </div>
              
              <div className="text-left">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  Timeline
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Q1 2025</Badge>
                    Calendly Scheduling API Launch
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Q2 2025</Badge>
                    Our Integration Development
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Q3 2025</Badge>
                    Beta Testing & Launch
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-purple-200">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Why Wait for the API?
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Calendly is launching a revolutionary new Scheduling API that will allow us to build 
                meeting scheduling directly into our app. This means no more redirects, iframes, or 
                external dependencies. Your clients will have a seamless, professional experience 
                that matches your brand perfectly.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Current Alternatives */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">
              What You Can Do Now
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="font-medium text-blue-800">Use Calendly Directly</p>
                  <p className="text-blue-700 text-sm">
                    Share your Calendly link with leads for now. When our integration launches, 
                    you'll be able to manage everything from within the app.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="font-medium text-blue-800">Focus on Lead Management</p>
                  <p className="text-blue-700 text-sm">
                    Use our powerful lead management and assessment tools to qualify leads 
                    before scheduling meetings.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="font-medium text-blue-800">Prepare Your Workflow</p>
                  <p className="text-blue-700 text-sm">
                    Design your ideal meeting scheduling process. When we launch, we'll help 
                    you implement it seamlessly.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Newsletter Signup */}
        <Card className="mt-8 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-semibold mb-2">
              Get Notified When We Launch
            </h3>
            <p className="text-purple-100 mb-4">
              We'll send you an email as soon as our meeting management system is ready.
            </p>
            <div className="flex gap-2 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
              <button className="px-6 py-2 bg-white text-purple-600 font-medium rounded-md hover:bg-gray-100 transition-colors">
                Notify Me
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
