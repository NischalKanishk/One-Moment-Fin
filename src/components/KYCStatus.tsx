import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Upload, 
  Eye,
  Edit3,
  UserCheck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { kycAPI } from "@/lib/api";
import KYCForm from "./KYCForm";

interface KYCStatusProps {
  leadId: string;
  onStatusChange?: () => void;
}

interface KYCData {
  id: string;
  lead_id: string;
  user_id: string;
  kyc_method?: 'manual_entry' | 'file_upload' | 'third_party_api';
  kyc_file_url?: string;
  form_data?: any;
  status: 'not_started' | 'in_progress' | 'submitted' | 'verified' | 'rejected';
  verified_by?: string;
  created_at: string;
  updated_at: string;
}

const statusConfig = {
  not_started: {
    label: 'Not Started',
    color: 'secondary',
    icon: Clock,
    description: 'KYC process has not been initiated'
  },
  in_progress: {
    label: 'In Progress',
    color: 'default',
    icon: Clock,
    description: 'KYC form is being filled out'
  },
  submitted: {
    label: 'Submitted',
    color: 'default',
    icon: FileText,
    description: 'KYC form has been submitted for verification'
  },
  verified: {
    label: 'Verified',
    color: 'default',
    icon: CheckCircle,
    description: 'KYC has been verified and approved'
  },
  rejected: {
    label: 'Rejected',
    color: 'destructive',
    icon: XCircle,
    description: 'KYC has been rejected and needs revision'
  }
};

export default function KYCStatus({ leadId, onStatusChange }: KYCStatusProps) {
  const { toast } = useToast();
  const [kycData, setKycData] = useState<KYCData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showViewForm, setShowViewForm] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadKYCStatus();
  }, [leadId]);

  const loadKYCStatus = async () => {
    try {
      setLoading(true);
      const token = await window.Clerk?.session?.getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await kycAPI.getByLeadId(leadId);
      setKycData(response.kyc || null);
    } catch (error) {
      console.error('Failed to load KYC status:', error);
      // If no KYC data exists, that's fine - it means not started
      setKycData(null);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      setUpdatingStatus(true);
      const token = await window.Clerk?.session?.getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      await kycAPI.updateStatus(leadId, newStatus);
      
      toast({
        title: "Success",
        description: `KYC status updated to ${newStatus}`,
      });

      loadKYCStatus();
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error) {
      console.error('Failed to update KYC status:', error);
      toast({
        title: "Error",
        description: "Failed to update KYC status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleFormComplete = () => {
    setShowForm(false);
    loadKYCStatus();
    if (onStatusChange) {
      onStatusChange();
    }
  };

  const getStatusIcon = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    const IconComponent = config?.icon || Clock;
    return <IconComponent className="h-4 w-4" />;
  };

  const getStatusColor = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    return config?.color || 'secondary';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            KYC Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentStatus = kycData?.status || 'not_started';
  const statusInfo = statusConfig[currentStatus as keyof typeof statusConfig];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            KYC Status
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant={getStatusColor(currentStatus) as any} className="flex items-center gap-2">
                {getStatusIcon(currentStatus)}
                {statusInfo?.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {statusInfo?.description}
              </span>
            </div>
            
            <div className="flex gap-2">
              {currentStatus === 'not_started' && (
                <Button onClick={() => setShowForm(true)} size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Start KYC
                </Button>
              )}
              
              {currentStatus === 'in_progress' && (
                <Button onClick={() => setShowForm(true)} size="sm">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Continue KYC
                </Button>
              )}
              
              {currentStatus === 'submitted' && (
                <>
                  <Button 
                    onClick={() => setShowViewForm(true)} 
                    variant="outline" 
                    size="sm"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Form
                  </Button>
                  <Button 
                    onClick={() => updateStatus('verified')} 
                    disabled={updatingStatus}
                    size="sm"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    onClick={() => updateStatus('rejected')} 
                    variant="destructive" 
                    disabled={updatingStatus}
                    size="sm"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </>
              )}
              
              {currentStatus === 'verified' && (
                <Button 
                  onClick={() => setShowViewForm(true)} 
                  variant="outline" 
                  size="sm"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Form
                </Button>
              )}
              
              {currentStatus === 'rejected' && (
                <>
                  <Button 
                    onClick={() => setShowViewForm(true)} 
                    variant="outline" 
                    size="sm"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Form
                  </Button>
                  <Button 
                    onClick={() => updateStatus('in_progress')} 
                    size="sm"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Restart
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Additional Info */}
          {kycData && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Method:</span>
                  <span className="ml-2 capitalize">
                    {kycData.kyc_method?.replace('_', ' ') || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Submitted:</span>
                  <span className="ml-2">
                    {new Date(kycData.created_at).toLocaleDateString()}
                  </span>
                </div>
                {kycData.verified_by && (
                  <div>
                    <span className="text-muted-foreground">Verified by:</span>
                    <span className="ml-2">{kycData.verified_by}</span>
                  </div>
                )}
                {kycData.updated_at && (
                  <div>
                    <span className="text-muted-foreground">Last updated:</span>
                    <span className="ml-2">
                      {new Date(kycData.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* KYC Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">KYC Form</h2>
                <Button variant="ghost" onClick={() => setShowForm(false)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
              <KYCForm
                leadId={leadId}
                onComplete={handleFormComplete}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* View KYC Form Modal */}
      {showViewForm && kycData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">KYC Form Data</h2>
                <Button variant="ghost" onClick={() => setShowViewForm(false)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
              <KYCForm
                leadId={leadId}
                isReadOnly={true}
                onCancel={() => setShowViewForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
