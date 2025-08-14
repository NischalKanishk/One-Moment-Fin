import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  assessment?: {
    submission: any;
    assessment: any;
    questions: any[];
    mappedAnswers: Array<{
      question: string;
      answer: string;
      type: string;
      options: any;
      module: string;
    }>;
  };
  assessment_submissions?: any[];
  meetings?: any[];
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
      console.error('Failed to load lead:', error);
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
    
    try {
      setGeneratingPDF(true);
      
      // Debug: Log lead data to console
      console.log('Generating PDF for lead:', lead);
      console.log('Lead assessment data:', lead.assessment);
      console.log('Lead notes:', lead.notes);
      console.log('Lead CFA data:', {
        goals: lead.cfa_goals,
        minInvestment: lead.cfa_min_investment,
        horizon: lead.cfa_investment_horizon
      });
      
      // Dynamic import of html2pdf to avoid SSR issues
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Create a clean HTML structure for PDF with safe data access
      const pdfContent = document.createElement('div');
      
      // Safely access lead properties with fallbacks
      const leadName = lead.full_name || 'Unknown Lead';
      const leadEmail = lead.email || 'Not provided';
      const leadPhone = lead.phone || 'Not provided';
      const leadAge = lead.age || 'Not provided';
      const leadStatus = lead.status ? lead.status.replace('_', ' ') : 'Unknown';
      const leadCreatedAt = lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'Unknown';
      const leadRiskCategory = lead.risk_category || 'Not assessed';
      const leadRiskScore = lead.risk_score || 'Not assessed';
      const leadNotes = lead.notes || '';
      
      // Check if assessment data exists
      const hasAssessment = lead.assessment && lead.assessment.mappedAnswers;
      const mappedAnswers = hasAssessment ? lead.assessment.mappedAnswers : [];
      const isCFA = lead.assessment?.assessment?.framework === 'CFA';
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

          <!-- Investment Preference -->
          ${mappedAnswers.length > 0 ? `
            <div style="margin-bottom: 30px;">
              <h2 style="font-size: 20px; font-weight: bold; color: #111827; margin: 0 0 15px 0; padding: 10px; background: #f9fafb; border-left: 4px solid #f59e0b;">Investment Preference</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                ${mappedAnswers.slice(0, 3).map((answer: any, index: number) => `
                  <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 15px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #92400e;">${answer.question || 'Question not available'}</p>
                    <p style="margin: 0; font-size: 14px; color: #78350f;">${answer.answer || 'Answer not available'}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Risk Assessment -->
          ${mappedAnswers.length > 3 ? `
            <div style="margin-bottom: 30px;">
              <h2 style="margin: 0 0 15px 0; padding: 10px; background: #f9fafb; border-left: 4px solid #ef4444;">Risk Assessment</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                ${mappedAnswers.slice(3).map((answer: any, index: number) => `
                  <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #991b1b;">${answer.question || 'Question not available'}</p>
                    <p style="margin: 0; font-size: 14px; color: #7f1d1d;">${answer.answer || 'Answer not available'}</p>
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
      console.log('Generated PDF HTML:', pdfContent.innerHTML);
      
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
        console.error('Custom HTML PDF generation failed, trying with page content:', pdfError);
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
      console.error('Failed to generate PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Clean up the temporary element if it exists
      if (pdfContent.parentNode) {
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
          
          {/* Top Row - Lead Overview and Risk Profile Side by Side */}
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
            
            {/* Risk Assessment Summary */}
            {lead.assessment && (
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900">Risk Profile</CardTitle>
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
                        <div className="text-lg font-semibold text-gray-900">{lead.assessment.mappedAnswers.length}</div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Completed</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {new Date(lead.assessment.submission.submitted_at).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
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
            )}
          </div>

          {/* Investment Preference - First 3 Questions */}
          {lead.assessment && lead.assessment.mappedAnswers && lead.assessment.mappedAnswers.length > 0 && (
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">Investment Preference</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lead.assessment.mappedAnswers.slice(0, 3).map((answer, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border-l-4 border-gray-300">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-xs font-semibold text-gray-700">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-800 mb-2">{answer.question}</div>
                          <div className="text-sm text-gray-700 bg-white px-3 py-2 rounded border border-gray-200">
                            {answer.answer}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Risk Assessment - Remaining Questions */}
          {lead.assessment && lead.assessment.mappedAnswers && lead.assessment.mappedAnswers.length > 3 && (
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lead.assessment.mappedAnswers.slice(3).map((answer, index) => (
                    <div key={index + 3} className="p-4 bg-gray-50 rounded-lg border-l-4 border-gray-300">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-xs font-semibold text-gray-700">{index + 4}</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-800 mb-2">{answer.question}</div>
                          <div className="text-sm text-gray-700 bg-white px-3 py-2 rounded border border-gray-200">
                            {answer.answer}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes Display */}
          {lead.notes && (
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-gray-300">
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {lead.notes}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
