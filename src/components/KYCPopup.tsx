import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Edit, 
  Share2, 
  Copy, 
  Mail, 
  MessageSquare, 
  QrCode, 
  Link as LinkIcon,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface KYCPopupProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  getToken: () => Promise<string | null>;
}

interface KYCTemplate {
  id: string;
  name: string;
  description?: string;
  fields: any[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Static template data from KYC page
const staticTemplates: KYCTemplate[] = [
  {
    id: "1",
    name: "Individual KYC",
    description: "Standard KYC form for individual clients with basic identity verification",
    fields: [
      { name: "Full Name", type: "text", required: true },
      { name: "Date of Birth", type: "date", required: true },
      { name: "National ID", type: "text", required: true },
      { name: "Address", type: "textarea", required: true },
      { name: "Phone Number", type: "tel", required: true },
      { name: "Email", type: "email", required: true },
      { name: "Occupation", type: "text", required: false },
      { name: "Annual Income", type: "number", required: false }
    ],
    is_active: true,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z"
  },
  {
    id: "2",
    name: "Corporate KYC",
    description: "Comprehensive KYC form for corporate entities and businesses",
    fields: [
      { name: "Company Name", type: "text", required: true },
      { name: "Registration Number", type: "text", required: true },
      { name: "Business Type", type: "select", required: true },
      { name: "Incorporation Date", type: "date", required: true },
      { name: "Registered Address", type: "textarea", required: true },
      { name: "Contact Person", type: "text", required: true },
      { name: "Contact Phone", type: "tel", required: true },
      { name: "Contact Email", type: "email", required: true },
      { name: "Annual Revenue", type: "number", required: false },
      { name: "Number of Employees", type: "number", required: false }
    ],
    is_active: true,
    created_at: "2024-01-10T14:30:00Z",
    updated_at: "2024-01-12T09:15:00Z"
  },
  {
    id: "3",
    name: "High-Value Client KYC",
    description: "Enhanced KYC form for high-net-worth individuals and VIP clients",
    fields: [
      { name: "Full Name", type: "text", required: true },
      { name: "Date of Birth", type: "date", required: true },
      { name: "Passport Number", type: "text", required: true },
      { name: "Nationality", type: "text", required: true },
      { name: "Residential Address", type: "textarea", required: true },
      { name: "Mailing Address", type: "textarea", required: false },
      { name: "Phone Number", type: "tel", required: true },
      { name: "Email", type: "email", required: true },
      { name: "Source of Wealth", type: "textarea", required: true },
      { name: "Expected Investment Amount", type: "number", required: true },
      { name: "Risk Tolerance", type: "select", required: true },
      { name: "Investment Experience", type: "select", required: true }
    ],
    is_active: true,
    created_at: "2024-01-08T11:20:00Z",
    updated_at: "2024-01-14T16:45:00Z"
  }
];

interface SharingMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
}

export default function KYCPopup({ isOpen, onClose, leadId, leadName }: KYCPopupProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<KYCTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("templates");
  const [sharingLink, setSharingLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && staticTemplates.length > 0) {
      // Set the first template as default when popup opens
      setSelectedTemplate(staticTemplates[0]);
    }
  }, [isOpen]);

  const handleEditTemplate = (template: KYCTemplate) => {
    // Navigate to template edit page
    window.open(`/app/kyc/templates/${template.id}`, '_blank');
  };

  const generateSharingLink = () => {
    if (selectedTemplate) {
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/kyc/${leadId}?template=${selectedTemplate.id}`;
      setSharingLink(link);
      return link;
    }
    return "";
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const sendEmail = () => {
    if (sharingLink) {
      const subject = `KYC Form for ${leadName}`;
      const body = `Please complete your KYC form using this link: ${sharingLink}`;
      window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    } else {
      toast({
        title: "Error",
        description: "Please generate a sharing link first",
        variant: "destructive",
      });
    }
  };

  const sendSMS = () => {
    if (sharingLink) {
      const message = `Complete your KYC form: ${sharingLink}`;
      window.open(`sms:?body=${encodeURIComponent(message)}`);
    } else {
      toast({
        title: "Error",
        description: "Please generate a sharing link first",
        variant: "destructive",
      });
    }
  };

  const generateQRCode = () => {
    if (sharingLink) {
      // In a real implementation, you would generate a QR code
      // For now, we'll just show the link
      toast({
        title: "QR Code",
        description: "QR Code would be generated for: " + sharingLink,
      });
    } else {
      toast({
        title: "Error",
        description: "Please generate a sharing link first",
        variant: "destructive",
      });
    }
  };

  const sharingMethods: SharingMethod[] = [
    {
      id: "link",
      name: "Direct Link",
      description: "Share the form link directly",
      icon: <LinkIcon className="h-5 w-5" />,
      action: () => copyToClipboard(sharingLink || generateSharingLink())
    },
    {
      id: "email",
      name: "Email",
      description: "Send form link via email",
      icon: <Mail className="h-5 w-5" />,
      action: sendEmail
    },
    {
      id: "sms",
      name: "SMS",
      description: "Send form link via SMS",
      icon: <MessageSquare className="h-5 w-5" />,
      action: sendSMS
    },
    {
      id: "qr",
      name: "QR Code",
      description: "Generate QR code for the form",
      icon: <QrCode className="h-5 w-5" />,
      action: generateQRCode
    }
  ];

  const renderFormPreview = () => {
    if (!selectedTemplate) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No template selected
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground mb-4">
          Preview of form fields in "{selectedTemplate.name}" template
        </div>
        {selectedTemplate.fields.map((field, index) => (
          <div key={index} className="space-y-2">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                {field.name}
                {field.required && <span className="text-red-500">*</span>}
              </label>
              <div>
                {field.type === 'text' || field.type === 'email' || field.type === 'tel' ? (
                  <Input 
                    placeholder={`Enter ${field.name.toLowerCase()}`}
                    disabled
                  />
                ) : field.type === 'number' ? (
                  <Input 
                    type="number" 
                    placeholder={`Enter ${field.name.toLowerCase()}`}
                    disabled
                  />
                ) : field.type === 'date' ? (
                  <Input 
                    type="date" 
                    disabled
                  />
                ) : field.type === 'select' ? (
                  <Select disabled>
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${field.name.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option1">Option 1</SelectItem>
                      <SelectItem value="option2">Option 2</SelectItem>
                      <SelectItem value="option3">Option 3</SelectItem>
                    </SelectContent>
                  </Select>
                ) : field.type === 'checkbox' ? (
                  <Switch disabled />
                ) : field.type === 'file' ? (
                  <Input 
                    type="file" 
                    disabled
                  />
                ) : (
                  <Textarea 
                    placeholder={`Enter ${field.name.toLowerCase()}`}
                    disabled
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) {
      toast({
        title: "Error",
        description: "Please select a KYC template first",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      // Here you would typically submit the KYC form data
      // For now, we'll just show a success message
      toast({
        title: "Success",
        description: "KYC form submitted successfully",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit KYC form",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            KYC Form for {leadName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="preview">Form Preview</TabsTrigger>
            <TabsTrigger value="sharing">Sharing</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">KYC Templates</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('/app/kyc/templates/new', '_blank')}
              >
                Create New Template
              </Button>
            </div>
            
            <div className="grid gap-4">
              {staticTemplates.map((template) => (
                <Card 
                  key={template.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id 
                      ? 'ring-2 ring-primary' 
                      : 'hover:bg-secondary/50'
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {template.name}
                          {template.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              Active
                            </Badge>
                          )}
                        </CardTitle>
                        {template.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {template.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{template.fields.length} fields</span>
                          <span>Created {new Date(template.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Template
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Form Preview</h3>
              {selectedTemplate && (
                <Badge variant="outline">
                  Template: {selectedTemplate.name}
                </Badge>
              )}
            </div>
            
            {renderFormPreview()}
          </TabsContent>

          <TabsContent value="sharing" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Sharing Methods</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const link = generateSharingLink();
                  if (link) {
                    copyToClipboard(link);
                  }
                }}
              >
                {copied ? <CheckCircle className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>

            {!selectedTemplate ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Please select a KYC template first to generate sharing options</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {sharingMethods.map((method) => (
                    <Card key={method.id} className="hover:bg-secondary/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              {method.icon}
                            </div>
                            <div>
                              <h4 className="font-medium">{method.name}</h4>
                              <p className="text-sm text-muted-foreground">{method.description}</p>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={method.action}
                          >
                            Use
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {sharingLink && (
                  <Card className="bg-secondary/30">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Generated Link:</label>
                        <div className="flex items-center gap-2">
                          <Input 
                            value={sharingLink} 
                            readOnly 
                            className="font-mono text-sm"
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => copyToClipboard(sharingLink)}
                          >
                            {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedTemplate || loading}
            className="min-w-[100px]"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Submit KYC
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
