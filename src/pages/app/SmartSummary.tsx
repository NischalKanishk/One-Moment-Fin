import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft,
  User,
  TrendingUp,
  Calendar,
  FileText,
  Phone,
  Mail,
  AlertTriangle,
  Download
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { leadsAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import SipForecasterReadOnly from "@/components/SipForecasterReadOnly";

// Question mapping for better display - Updated to match current assessment form
const CFA_QUESTION_MAPPING: Record<string, string> = {
  // Profile Questions
  'name': 'Name',
  'contact_no': 'Contact No',
  'email_address': 'Email Address',
  
  // Need Questions
  'investment_goals': 'Investment Goals (Select 5 that are the most important)',
  'primary_reason_for_investing': 'What is your primary reason for investing in mutual funds?',
  
  // Capacity Questions
  'investment_horizon': 'Investment Horizon',
  'financial_situation': 'What is your current financial situation?',
  'investment_experience': 'What is your investment experience?',
  'access_to_funds_timeline': 'How soon do you anticipate needing access to the invested funds?',
  'monthly_investment_amount': 'How much money are you willing to set aside every month for investments?',
  'lumpsum_investment': 'Do you have a lumpsum amount/savings that you are willing to invest? If Yes, then what is the amount?',
  
  // Tolerance Questions
  'risk_tolerance': 'Risk Tolerance (High Risk=High Return)',
  'comfort_with_fluctuations': 'How comfortable are you with fluctuations in the value of your investments?',
  'attitude_towards_risk': 'What is your attitude towards risk?',
  'reaction_to_20_percent_drop': 'How would you react if the value of your investment dropped by 20% in a short period?',
  'continue_investing_during_downturn': 'In the event of an economic downturn, how likely are you to continue investing?',
  
  // Fallback for any other questions
  'other': 'Additional Question'
};

// Helper function to format question text
const formatQuestionText = (questionKey: string) => {
  return CFA_QUESTION_MAPPING[questionKey] || questionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Helper function to extract monthly investment amount from lead data
const extractMonthlyInvestmentAmount = (lead: Lead): number => {
  // First, try to find monthly investment in assessment submissions
  if (lead.assessment_submissions && lead.assessment_submissions.length > 0) {
    const latestSubmission = lead.assessment_submissions[0];
    const answers = latestSubmission.answers;
    
    // Look for various possible keys that might contain monthly investment
    const possibleKeys = [
      'monthly_investment',
      'monthly_investment_amount',
      'investment_amount',
      'monthly_amount',
      'sip_amount',
      'monthly_sip'
    ];
    
    for (const key of possibleKeys) {
      if (answers[key]) {
        const value = Number(answers[key]);
        if (!isNaN(value) && value > 0) {
          return value;
        }
      }
    }
  }
  
  // Fallback to cfa_min_investment if available
  if (lead.cfa_min_investment) {
    // Try to extract number from the string (e.g., "₹15,000" -> 15000)
    const match = lead.cfa_min_investment.match(/[\d,]+/);
    if (match) {
      const value = Number(match[0].replace(/,/g, ''));
      if (!isNaN(value) && value > 0) {
        return value;
      }
    }
  }
  
  // Default fallback
  return 15000;
};

interface Lead {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  age?: number;
  status: string;
  source_link?: string;
  created_at: string;
  risk_profile_id?: string;
  risk_bucket?: string;
  risk_score?: number;
  notes?: string;
  cfa_goals?: string;
  cfa_min_investment?: string;
  cfa_investment_horizon?: string;
  assessment_submissions?: Array<{
    id: string;
    submitted_at: string;
    answers: Record<string, any>;
    result: {
      bucket: string;
      score: number;
      rubric: {
        capacity: number;
        tolerance: number;
        need: number;
      };
    };
    status: string;
  }>;
  meetings?: any[];
  sip_forecast?: {
    monthly_investment: number;
    years: number;
    expected_return_pct: number;
    inflation_pct: number;
    saved_at: string;
  };
}

export default function SmartSummary() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    if (id) {
      loadLead();
    }
  }, [id]);

  const loadLead = async () => {
    try {
      setLoading(true);
      
      if (!id) {
        throw new Error('No lead ID provided');
      }
      
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const leadData = await leadsAPI.getById(token, id);
      setLead(leadData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load lead details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lead details...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <AlertTriangle className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Lead Not Found</h2>
          <p className="text-gray-600 mb-4">The lead you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate('/app/leads')} variant="outline">
            Back to Leads
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'converted':
        return 'bg-green-50 text-green-700 border-green-300';
      case 'dropped':
        return 'bg-red-50 text-red-700 border-red-300';
      case 'meeting_scheduled':
        return 'bg-orange-50 text-orange-700 border-orange-300';
      case 'assessment_done':
        return 'bg-purple-50 text-purple-700 border-purple-300';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-300';
    }
  };

  const getRiskCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'conservative':
        return 'bg-blue-50 text-blue-700 border-blue-300';
      case 'moderate':
        return 'bg-green-50 text-green-700 border-green-300';
      case 'growth':
        return 'bg-yellow-50 text-yellow-700 border-yellow-300';
      case 'aggressive':
        return 'bg-red-50 text-red-700 border-red-300';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-300';
    }
  };

  const generatePDF = async () => {
    if (!contentRef.current || !lead) {
      toast({
        title: "Error",
        description: "Lead data not available for PDF generation.",
        variant: "destructive",
      });
      return;
    }
    
    let pdfContent: HTMLDivElement | null = null;
    
    try {
      setGeneratingPDF(true);

      // Dynamic import of html2pdf to avoid SSR issues
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Create a clean HTML structure for PDF with safe data access
      pdfContent = document.createElement('div');
      
      // Safely access lead properties with fallbacks
      const leadName = lead.full_name || 'Unknown Lead';
      const leadEmail = lead.email || 'Not provided';
      const leadPhone = lead.phone || 'Not provided';
      const leadAge = lead.age || 'Not provided';
      const leadStatus = lead.status ? lead.status.replace('_', ' ') : 'Unknown';
      const leadCreatedAt = lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'Unknown';
      const leadRiskCategory = lead.risk_bucket || 'Not assessed';
      const leadRiskScore = lead.risk_score || 'Not assessed';
      const leadNotes = lead.notes || '';
      
      // Check if assessment data exists
      const hasAssessment = lead.assessment_submissions && lead.assessment_submissions.length > 0;
      const mappedAnswers = hasAssessment ? lead.assessment_submissions.map((sub) => ({
        question: formatQuestionText(Object.keys(sub.answers)[0]), // Assuming only one question per submission for simplicity
        answer: String(Object.values(sub.answers)[0]),
        type: 'text',
        options: null,
        module: 'Assessment'
      })) : [];
      const isCFA = lead.assessment_submissions?.[0]?.result?.bucket; // Check if the first submission has a bucket
      
      // If no mapped answers but have assessment submissions, create a basic structure for PDF
      let pdfAnswers = mappedAnswers;
      if (!hasAssessment) {
        pdfAnswers = Object.entries(lead.assessment_submissions?.[0]?.answers || {}).map(([question, answer]) => ({
          question: formatQuestionText(question),
          answer: String(answer),
          type: 'text',
          options: null,
          module: 'Assessment'
        }));
      }
      pdfContent.innerHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: white; color: black;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px;">
            <h1 style="font-size: 28px; font-weight: bold; color: #111827; margin: 0 0 10px 0;">Smart Summary</h1>
            <p style="font-size: 16px; color: #6b7280; margin: 0;">Comprehensive overview for ${leadName}</p>
            <p style="font-size: 14px; color: #9ca3af; margin: 10px 0 0 0;">Generated on ${new Date().toLocaleDateString()}</p>
          </div>

          <!-- Lead Overview -->
          <div style="margin-bottom: 30px;">
            <h2 style="font-size: 20px; font-weight: bold; color: #111827; margin: 0 0 15px 0; padding: 10px; background: #f9fafb; border-left: 4px solid #3b82f6;">Lead Overview</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div>
                <p style="margin: 8px 0; font-size: 14px;"><strong>Name:</strong> ${leadName}</p>
                <p style="margin: 8px 0; font-size: 14px;"><strong>Email:</strong> ${leadEmail}</p>
                <p style="margin: 8px 0; font-size: 14px;"><strong>Phone:</strong> ${leadPhone}</p>
              </div>
              <div>
                <p style="margin: 8px 0; font-size: 14px;"><strong>Age:</strong> ${leadAge}</p>
                <p style="margin: 8px 0; font-size: 14px;"><strong>Status:</strong> ${leadStatus}</p>
                <p style="margin: 8px 0; font-size: 14px;"><strong>Added on:</strong> ${leadCreatedAt}</p>
              </div>
            </div>
          </div>

          <!-- Risk Profile -->
          <div style="margin-bottom: 30px;">
            <h2 style="font-size: 20px; font-weight: bold; color: #111827; margin: 0 0 15px 0; padding: 10px; background: #f9fafb; border-left: 4px solid #10b981;">Risk Profile</h2>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 15px;">
              <p style="margin: 8px 0; font-size: 14px;"><strong>Risk Category:</strong> ${leadRiskCategory}</p>
              <p style="margin: 8px 0; font-size: 14px;"><strong>Risk Score:</strong> ${leadRiskScore}</p>
            </div>
          </div>

          <!-- Assessment Questions & Answers -->
          ${pdfAnswers.length > 0 ? `
            <div style="margin-bottom: 30px;">
              <h2 style="font-size: 20px; font-weight: bold; color: #111827; margin: 0 0 15px 0; padding: 10px; background: #f9fafb; border-left: 4px solid #3b82f6;">Assessment Questions & Answers</h2>
              <div style="display: grid; grid-template-columns: 1fr; gap: 15px;">
                ${pdfAnswers.map((answer: any, index: number) => `
                  <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 15px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #1e293b;">${answer.question || 'Question not available'}</p>
                    <p style="margin: 0; font-size: 14px; color: #475569;">${answer.answer || 'Answer not available'}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Notes -->
          ${leadNotes ? `
            <div style="margin-bottom: 30px;">
              <h2 style="font-size: 20px; font-weight: bold; color: #111827; margin: 0 0 15px 0; padding: 10px; background: #f9fafb; border-left: 4px solid #8b5cf6;">Notes</h2>
              <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 6px; padding: 15px;">
                <p style="margin: 0; font-size: 14px; color: #581c87; line-height: 1.5;">${leadNotes}</p>
              </div>
            </div>
          ` : ''}

          <!-- CFA Information -->
          ${isCFA && (lead.cfa_goals || lead.cfa_min_investment || lead.cfa_investment_horizon) ? `
            <div style="margin-bottom: 30px;">
              <h2 style="font-size: 20px; font-weight: bold; color: #111827; margin: 0 0 15px 0; padding: 10px; background: #f9fafb; border-left: 4px solid #06b6d4;">CFA Framework Information</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                ${lead.cfa_goals ? `
                  <div style="background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 6px; padding: 15px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #0e7490;">Goals</p>
                    <p style="margin: 0; font-size: 14px; color: #0c4a6e;">${lead.cfa_goals}</p>
                  </div>
                ` : ''}
                ${lead.cfa_min_investment ? `
                  <div style="background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 6px; padding: 15px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #0e7490;">Minimum Investment</p>
                    <p style="margin: 0; font-size: 14px; color: #0c4a6e;">${lead.cfa_min_investment}</p>
                  </div>
                ` : ''}
                ${lead.cfa_investment_horizon ? `
                  <div style="background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 6px; padding: 15px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #0e7490;">Investment Horizon</p>
                    <p style="margin: 0; font-size: 14px; color: #0c4a6e;">${lead.cfa_investment_horizon}</p>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}

          <!-- Footer -->
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">Generated by OneMFin - ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      `;
      
      // Debug: Log the generated HTML

      // Temporarily add to DOM for proper rendering
      pdfContent.style.position = 'absolute';
      pdfContent.style.left = '-9999px';
      pdfContent.style.top = '-9999px';
      document.body.appendChild(pdfContent);
      
      // Small delay to ensure proper rendering
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const opt = {
        margin: [20, 20, 20, 20],
        filename: `smart-summary-${lead?.full_name?.replace(/\s+/g, '-').toLowerCase() || 'lead'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 800,
          height: 1200,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true
        }
      };
      
      try {
        await html2pdf().set(opt).from(pdfContent).save();
      } catch (pdfError) {
        // Fallback: try with the actual page content
        await html2pdf().set(opt).from(contentRef.current).save();
      }
      
      // Clean up the temporary element
      document.body.removeChild(pdfContent);
      
      toast({
        title: "Success",
        description: "PDF generated and downloaded successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Clean up the temporary element if it exists
      if (pdfContent && pdfContent.parentNode) {
        document.body.removeChild(pdfContent);
      }
      setGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Smart Summary - {lead.full_name} – OneMFin</title>
        <meta name="description" content="Comprehensive overview and insights for lead information, assessments, and notes." />
      </Helmet>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(`/app/leads/${lead.id}`)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Lead
            </Button>
            <div className="text-center flex-1">
              <h1 className="text-2xl font-semibold text-gray-900">Smart Summary</h1>
              <p className="text-sm text-gray-600 mt-1">Comprehensive overview for {lead.full_name}</p>
            </div>
            <Button
              onClick={generatePDF}
              disabled={generatingPDF}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 min-w-[140px]"
            >
              <Download className="w-4 h-4" />
              {generatingPDF ? 'Generating...' : 'Save as PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8" ref={contentRef}>
        <div className="space-y-6">
          
          {/* Top Row - Lead Overview and Risk Factor Summary Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Lead Overview */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">Lead Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center pb-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl font-semibold text-gray-700">
                      {lead.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{lead.full_name}</h3>
                  <Badge className={`mt-2 ${getStatusColor(lead.status)}`}>
                    {lead.status.replace('_', ' ')}
                  </Badge>
                </div>
                
                <Separator className="bg-gray-200" />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{lead.email || 'No email'}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{lead.phone || 'No phone'}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{lead.age ? `${lead.age} years` : 'Age not specified'}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">Added {new Date(lead.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Risk Factor Summary */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">Risk Factor Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Risk Score and Category Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Risk Score</div>
                      <div className="text-3xl font-bold text-gray-900">{lead.risk_score || 0}</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Risk Category</div>
                      <Badge className={`text-sm px-3 py-1 ${getRiskCategoryColor(lead.risk_bucket)}`}>
                        {lead.risk_bucket || 'Not Assessed'}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Assessment Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                                              <div className="text-sm text-gray-600 mb-1">Questions Answered</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {lead.assessment_submissions?.[0]?.answers ? Object.keys(lead.assessment_submissions[0].answers).length : 0}
                        </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Completed</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {lead.assessment_submissions?.[0]?.submitted_at ? 
                          new Date(lead.assessment_submissions[0].submitted_at).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          }) :
                          new Date(lead.created_at).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        }
                      </div>
                    </div>
                  </div>
                  
                  {/* Risk Insight */}
                  <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-gray-300">
                    <div className="text-sm text-gray-700">
                      {lead.risk_bucket === 'Conservative' && 'Low risk tolerance - suitable for stable investments'}
                      {lead.risk_bucket === 'Moderate' && 'Balanced approach - mix of growth and stability'}
                      {lead.risk_bucket === 'Growth' && 'Growth-oriented - comfortable with market volatility'}
                      {lead.risk_bucket === 'Aggressive' && 'High risk tolerance - potential for higher returns'}
                      {!lead.risk_bucket && 'Risk profile assessment completed'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs Section - Questions & Answers and Notes */}
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-0">
              <Tabs defaultValue="questions" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-white border-b border-gray-200 rounded-none p-0 h-14">
                  <TabsTrigger 
                    value="questions" 
                    className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200 data-[state=active]:shadow-sm rounded-none h-14 transition-all duration-200 font-medium border-b-2 data-[state=active]:border-b-blue-500"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Questions & Answers
                  </TabsTrigger>
                  <TabsTrigger 
                    value="notes" 
                    className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 data-[state=active]:border-amber-200 data-[state=active]:shadow-sm rounded-none h-14 transition-all duration-200 font-medium border-b-2 data-[state=active]:border-b-amber-500"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Notes
                  </TabsTrigger>
                  <TabsTrigger 
                    value="sip" 
                    className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:border-emerald-200 data-[state=active]:shadow-sm rounded-none h-14 transition-all duration-200 font-medium border-b-2 data-[state=active]:border-b-emerald-500"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    SIP Forecast
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="questions" className="p-6">
                  {(lead.assessment_submissions?.length > 0) ? (
                    <div className="space-y-6">
                      {/* Group answers by module for better organization */}
                      {(() => {
                        const answers = lead.assessment_submissions || [];
                        const answersByModule: Record<string, Array<[string, any]>> = {};
                        
                                                 if (answers.length > 0) {
                           // Process assessment submissions
                           answers.forEach((sub) => {
                             if (sub.answers) {
                               Object.entries(sub.answers).forEach(([questionKey, answer]) => {
                                 let module = 'General';
                                 if (questionKey.includes('investment_goals') || questionKey.includes('primary_reason_for_investing')) module = 'Needs';
                                 if (questionKey.includes('investment_horizon') || questionKey.includes('financial_situation') || questionKey.includes('investment_experience') || questionKey.includes('access_to_funds_timeline') || questionKey.includes('monthly_investment_amount')) module = 'Capacity';
                                 if (questionKey.includes('risk_tolerance') || questionKey.includes('comfort_with_fluctuations') || questionKey.includes('attitude_towards_risk')) module = 'Tolerance';
                                 if (questionKey.includes('reaction_to_20_percent_drop') || questionKey.includes('continue_investing_during_downturn')) module = 'Behavior';
                                 if (questionKey.includes('lumpsum_investment')) module = 'Investment';
                                 
                                 if (!answersByModule[module]) {
                                   answersByModule[module] = [];
                                 }
                                 answersByModule[module].push([questionKey, answer]);
                               });
                             }
                           });
                         }
                        
                        return Object.entries(answersByModule).map(([module, moduleAnswers]) => (
                          <div key={module} className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <h4 className="font-semibold text-blue-800 text-sm uppercase tracking-wide">{module}</h4>
                              <div className="ml-auto text-xs text-blue-600 bg-white px-2 py-1 rounded-full">
                                {moduleAnswers.length} question{moduleAnswers.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                            
                            <div className="space-y-4 ml-5">
                              {moduleAnswers.map(([question, answer], index) => (
                                <div key={index} className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-5 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200">
                                  <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                      <span className="text-xs font-semibold text-blue-700">{index + 1}</span>
                                    </div>
                                    <div className="flex-1 space-y-3">
                                      <h5 className="font-medium text-gray-900 text-sm leading-relaxed">
                                        {typeof question === 'string' ? formatQuestionText(question) : question}
                                      </h5>
                                      <div className="bg-white rounded border border-gray-200 p-3">
                                        <span className="text-sm font-medium text-gray-700">Answer:</span>
                                        <span className="ml-2 text-sm text-gray-900 font-medium">{String(answer)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assessment Completed</h3>
                      <p className="text-gray-600 max-w-md mx-auto">
                        This lead hasn't completed an assessment yet. Send them an assessment link to get started with risk profiling.
                      </p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="sip" className="p-6">
                  <div className="space-y-6">
                    {lead && (
                      <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-700">
                          💡 Monthly investment amount pre-filled from: {
                            lead.assessment_submissions?.[0]?.answers?.monthly_investment ? 'Assessment submission' :
                            lead.assessment_submissions?.[0]?.answers?.investment_amount ? 'Assessment submission' :
                            lead.cfa_min_investment ? 'CFA minimum investment' : 'Default value'
                          }
                        </p>
                      </div>
                    )}
                    
                    <SipForecasterReadOnly
                      monthlyInvestment={extractMonthlyInvestmentAmount(lead)}
                      years={15}
                      expectedAnnualReturnPct={12}
                      inflationPct={6}
                      showEditButton={false}
                      showSaveButton={false}
                      className="border-0 shadow-none"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* CFA Information Display */}
          {(lead.cfa_goals || lead.cfa_min_investment || lead.cfa_investment_horizon) && (
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">CFA Framework Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lead.cfa_goals && (
                    <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-gray-300">
                      <div className="text-sm font-medium text-gray-800 mb-1">Goals</div>
                      <div className="text-sm text-gray-700">{lead.cfa_goals}</div>
                    </div>
                  )}
                  
                  {lead.cfa_min_investment && (
                    <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-gray-300">
                      <div className="text-sm font-medium text-gray-800 mb-1">Minimum Investment Amount</div>
                      <div className="text-sm text-gray-700">{lead.cfa_min_investment}</div>
                    </div>
                  )}
                  
                  {lead.cfa_investment_horizon && (
                    <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-gray-300">
                      <div className="text-sm font-medium text-gray-800 mb-1">Investment Horizon</div>
                      <div className="text-sm text-gray-700">
                        {lead.cfa_investment_horizon === 'short_term' && 'Short Term (1-3 years)'}
                        {lead.cfa_investment_horizon === 'medium_term' && 'Medium Term (3-7 years)'}
                        {lead.cfa_investment_horizon === 'long_term' && 'Long Term (7+ years)'}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
