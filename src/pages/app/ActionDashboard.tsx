import React, { useState } from 'react';
import { Bell, Search, Plus, TrendingUp, Calendar, FileText, Users, Target, Clock, AlertCircle, CheckCircle, Phone, MessageSquare, Eye, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

// Dummy data for the dashboard
const dummyData = {
  todayMetrics: {
    hotLeads: 8,
    scheduledMeetings: 3,
    pendingKYCs: 5,
    urgentActions: 16
  },
  hotLeads: [
    {
      id: 1,
      name: "Rahul Sharma",
      email: "rahul.sharma@email.com",
      phone: "+91 98765 43210",
      riskScore: 85,
      riskCategory: "Moderate",
      capturedAt: "2 hours ago",
      status: "assessment_completed",
      priority: "high",
      nextAction: "Schedule Meeting",
      estimatedValue: "₹5,00,000",
      source: "WhatsApp Campaign"
    },
    {
      id: 2,
      name: "Priya Patel",
      email: "priya.patel@email.com",
      phone: "+91 87654 32109",
      riskScore: 72,
      riskCategory: "Conservative",
      capturedAt: "4 hours ago",
      status: "meeting_scheduled",
      priority: "high",
      nextAction: "Prepare Meeting",
      estimatedValue: "₹3,50,000",
      source: "Referral Link"
    },
    {
      id: 3,
      name: "Amit Kumar",
      email: "amit.kumar@email.com",
      phone: "+91 76543 21098",
      riskScore: 91,
      riskCategory: "Aggressive",
      capturedAt: "6 hours ago",
      status: "products_shown",
      priority: "medium",
      nextAction: "Follow Up",
      estimatedValue: "₹7,50,000",
      source: "LinkedIn"
    }
  ],
  upcomingMeetings: [
    {
      id: 1,
      leadName: "Rahul Sharma",
      time: "10:30 AM",
      duration: "30 min",
      type: "Investment Consultation",
      meetingLink: "https://meet.google.com/abc-def-ghi",
      preparationStatus: "pending"
    },
    {
      id: 2,
      leadName: "Sneha Joshi",
      time: "2:00 PM",
      duration: "45 min",
      type: "Portfolio Review",
      meetingLink: "https://meet.google.com/xyz-uvw-rst",
      preparationStatus: "ready"
    },
    {
      id: 3,
      leadName: "Vikram Singh",
      time: "4:30 PM",
      duration: "30 min",
      type: "Risk Assessment Discussion",
      meetingLink: "https://meet.google.com/def-ghi-jkl",
      preparationStatus: "pending"
    }
  ],
  pendingKYCs: [
    {
      id: 1,
      leadName: "Anita Desai",
      submittedAt: "2 days ago",
      documentsReceived: 3,
      documentsRequired: 5,
      status: "incomplete",
      missingDocs: ["Bank Statement", "Income Proof"]
    },
    {
      id: 2,
      leadName: "Rajesh Gupta",
      submittedAt: "1 day ago",
      documentsReceived: 5,
      documentsRequired: 5,
      status: "review_required",
      missingDocs: []
    }
  ],
  pipelineData: [
    { stage: "New Leads", count: 24, change: "+12%" },
    { stage: "Assessment Done", count: 18, change: "+8%" },
    { stage: "Meetings Scheduled", count: 12, change: "+15%" },
    { stage: "KYC Initiated", count: 8, change: "+25%" },
    { stage: "Converted", count: 5, change: "+67%" }
  ],
  aiInsights: [
    {
      type: "conversion_opportunity",
      title: "High Conversion Potential",
      description: "3 leads with >80% conversion probability need immediate attention",
      action: "View Leads",
      priority: "high"
    },
    {
      type: "process_optimization",
      title: "Optimize Follow-up Timing",
      description: "Best follow-up time for your leads is between 2-4 PM",
      action: "Schedule Bulk Actions",
      priority: "medium"
    },
    {
      type: "product_recommendation",
      title: "New Product Match",
      description: "ICICI Prudential Fund matches 6 of your recent assessments",
      action: "Update Recommendations",
      priority: "low"
    }
  ]
};

const ActionDashboard: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assessment_completed': return <Target className="w-4 h-4 text-blue-600" />;
      case 'meeting_scheduled': return <Calendar className="w-4 h-4 text-green-600" />;
      case 'products_shown': return <TrendingUp className="w-4 h-4 text-purple-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">


      {/* Modern Stats Overview */}
      <div className="px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500 to-red-600 p-6 text-white shadow-xl shadow-red-500/25 hover:shadow-2xl hover:shadow-red-500/30 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-red-100 text-sm font-medium uppercase tracking-wider">Hot Leads</p>
                  <p className="text-4xl font-bold">{dummyData.todayMetrics.hotLeads}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <AlertCircle className="h-6 w-6" />
                </div>
              </div>
              <p className="text-red-100 text-sm">Require immediate attention</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-xl shadow-emerald-500/25 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider">Meetings</p>
                  <p className="text-4xl font-bold">{dummyData.todayMetrics.scheduledMeetings}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>
              <p className="text-emerald-100 text-sm">Next in 2 hours</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-6 text-white shadow-xl shadow-amber-500/25 hover:shadow-2xl hover:shadow-amber-500/30 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-amber-100 text-sm font-medium uppercase tracking-wider">Pending KYCs</p>
                  <p className="text-4xl font-bold">{dummyData.todayMetrics.pendingKYCs}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <FileText className="h-6 w-6" />
                </div>
              </div>
              <p className="text-amber-100 text-sm">2 ready for review</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">Total Actions</p>
                  <p className="text-4xl font-bold">{dummyData.todayMetrics.urgentActions}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Target className="h-6 w-6" />
                </div>
              </div>
              <p className="text-blue-100 text-sm">Across all categories</p>
            </div>
          </div>
        </div>
      </div>

             {/* Modern Action Buttons */}
       <div className="px-8 py-8">
         <div className="flex flex-wrap items-center gap-6">
          <Button className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold px-8 py-4 rounded-2xl shadow-xl shadow-red-500/25 hover:shadow-2xl hover:shadow-red-500/30 transition-all duration-300 hover:-translate-y-1">
            <AlertCircle className="w-5 h-5 mr-3" />
            Process Hot Leads ({dummyData.todayMetrics.hotLeads})
          </Button>
          
          <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold px-8 py-4 rounded-2xl shadow-xl shadow-emerald-500/25 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all duration-300 hover:-translate-y-1">
            <Calendar className="w-5 h-5 mr-3" />
            Today's Meetings ({dummyData.todayMetrics.scheduledMeetings})
          </Button>
          
          <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold px-8 py-4 rounded-2xl shadow-xl shadow-amber-500/25 hover:shadow-2xl hover:shadow-amber-500/30 transition-all duration-300 hover:-translate-y-1">
            <FileText className="w-5 h-5 mr-3" />
            Review KYCs ({dummyData.todayMetrics.pendingKYCs})
          </Button>
          
                     {/* Quick Actions */}
           <div className="flex space-x-4 ml-auto">
            <Button variant="outline" size="lg" className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 px-6 py-3 rounded-xl font-medium transition-all duration-200">
              <UserPlus className="w-5 h-5 mr-2" />
              Add Lead
            </Button>
            <Button variant="outline" size="lg" className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 px-6 py-3 rounded-xl font-medium transition-all duration-200">
              <MessageSquare className="w-5 h-5 mr-2" />
              Bulk Message
            </Button>
            <Button variant="outline" size="lg" className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 px-6 py-3 rounded-xl font-medium transition-all duration-200">
              <FileText className="w-5 h-5 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>
      </div>

             {/* Main Content Area */}
       <div className="px-8 py-8">
         <div className="grid grid-cols-3 gap-8">
          
          {/* Priority Leads - Modern Design */}
          <div className="col-span-1">
            <Card className="h-full border-0 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/30 border-b border-slate-200/50 px-6 py-5">
                <CardTitle className="text-xl font-bold text-slate-800 flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  Priority Leads
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                                 <div className="space-y-6">
                   {dummyData.hotLeads.slice(0, 2).map((lead) => (
                    <div key={lead.id} className="group relative bg-gradient-to-r from-white to-slate-50/50 border border-slate-200/60 rounded-2xl p-4 hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-300 transition-all duration-300 hover:-translate-y-1">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <Avatar className="w-10 h-10 border-2 border-slate-200">
                              <AvatarFallback className="text-sm font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                                {lead.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                              lead.priority === 'high' ? 'bg-red-500' : 
                              lead.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                            }`}></div>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-slate-800 mb-1">{lead.name}</h3>
                            <p className="text-slate-500 text-xs">{lead.capturedAt} • {lead.source}</p>
                          </div>
                        </div>
                        <Badge className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          lead.priority === 'high' ? 'bg-red-100 text-red-700 border-red-200' :
                          lead.priority === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                          'bg-green-100 text-green-700 border-green-200'
                        }`}>
                          {lead.priority.toUpperCase()}
                        </Badge>
                      </div>
                      
                                             <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Risk</p>
                          <p className="text-slate-700 font-semibold text-xs">{lead.riskCategory}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2">
                          <p className="text-xs text-green-600 uppercase tracking-wider font-medium mb-1">Value</p>
                          <p className="text-green-700 font-semibold text-xs">{lead.estimatedValue}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-slate-600">
                          {getStatusIcon(lead.status)}
                          <span className="font-medium text-xs">{lead.nextAction}</span>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs h-7 px-2">
                            <Phone className="w-3 h-3 mr-1" />
                            Call
                          </Button>
                          <Button size="sm" className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/25 text-xs h-7 px-2">
                            {lead.nextAction}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                                 <div className="mt-6 pt-6 border-t border-slate-200/50">
                  <Button variant="outline" className="w-full h-10 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-medium text-sm">
                    <Eye className="w-4 h-4 mr-2" />
                    View All Leads (24)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights - Modern Design */}
          <div className="col-span-1">
            <Card className="h-full border-0 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50/30 border-b border-blue-200/50 px-6 py-5">
                <CardTitle className="text-xl font-bold text-blue-800 flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                                 <div className="space-y-6">
                   {dummyData.aiInsights.slice(0, 2).map((insight, index) => (
                    <div key={index} className="group bg-gradient-to-r from-white to-blue-50/30 border border-blue-200/40 rounded-2xl p-4 hover:shadow-lg hover:shadow-blue-200/30 hover:border-blue-300 transition-all duration-300 hover:-translate-y-1">
                      <h4 className="font-semibold text-blue-900 text-sm mb-2">{insight.title}</h4>
                      <p className="text-xs text-blue-800 mb-3 leading-relaxed">{insight.description}</p>
                      <Button size="sm" variant="outline" className="text-xs h-8 border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl w-full">
                        {insight.action}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Today's Meetings - Modern Design */}
          <div className="col-span-1">
            <Card className="h-full border-0 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50/30 border-b border-emerald-200/50 px-6 py-5">
                <CardTitle className="text-xl font-bold text-emerald-800 flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mr-3">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  Today's Meetings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                                 <div className="space-y-6">
                   {dummyData.upcomingMeetings.map((meeting) => (
                    <div key={meeting.id} className="group bg-gradient-to-r from-white to-emerald-50/30 border border-emerald-200/40 rounded-2xl p-4 hover:shadow-lg hover:shadow-emerald-200/30 hover:border-emerald-300 transition-all duration-300 hover:-translate-y-1">
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-semibold text-slate-800 text-sm">{meeting.leadName}</span>
                        <span className="text-xs text-emerald-600 font-medium bg-emerald-100 px-2 py-1 rounded-full">{meeting.time}</span>
                      </div>
                      <p className="text-xs text-slate-600 mb-3">{meeting.type}</p>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="text-xs h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl">
                          Join
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl">
                          Prep
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

             {/* Bottom Section - Modern Design */}
       <div className="px-8 py-8">
         <div className="grid grid-cols-2 gap-10">
          {/* KYC Status - Modern Design */}
          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50/30 border-b border-amber-200/50 px-6 py-5">
              <CardTitle className="text-xl font-bold text-amber-800 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center mr-3">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                KYC Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                             <div className="space-y-6">
                 {dummyData.pendingKYCs.map((kyc) => (
                  <div key={kyc.id} className="group bg-gradient-to-r from-white to-amber-50/30 border border-amber-200/40 rounded-2xl p-4 hover:shadow-lg hover:shadow-amber-200/30 hover:border-amber-300 transition-all duration-300 hover:-translate-y-1">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-slate-800 text-sm">{kyc.leadName}</span>
                      <Badge className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border-amber-200">
                        {kyc.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-amber-700 mb-2 font-medium">
                        <span>{kyc.documentsReceived}/{kyc.documentsRequired} documents</span>
                        <span className="font-bold">{Math.round((kyc.documentsReceived / kyc.documentsRequired) * 100)}%</span>
                      </div>
                      <div className="w-full bg-amber-100 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-amber-500 to-yellow-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(kyc.documentsReceived / kyc.documentsRequired) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Summary - Modern Design */}
          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/30 border-b border-slate-200/50 px-6 py-5">
              <CardTitle className="text-xl font-bold text-slate-800 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-slate-500 to-blue-600 rounded-xl flex items-center justify-center mr-3">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                Weekly Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                             <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-green-100 rounded-2xl border border-emerald-200/50">
                  <p className="text-3xl font-bold text-emerald-700 mb-1">12</p>
                  <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider">Converted</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl border border-blue-200/50">
                  <p className="text-3xl font-bold text-blue-700 mb-1">₹2.4L</p>
                  <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">Revenue</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-yellow-100 rounded-2xl border border-amber-200/50">
                  <p className="text-3xl font-bold text-amber-700 mb-1">2.3h</p>
                  <p className="text-xs text-amber-600 font-medium uppercase tracking-wider">Avg Response</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-100 rounded-2xl border border-purple-200/50">
                  <p className="text-3xl font-bold text-purple-700 mb-1">4.8</p>
                  <p className="text-xs text-purple-600 font-medium uppercase tracking-wider">Satisfaction</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
             </div>
     </div>
   </div>
 );
};

export default ActionDashboard;
