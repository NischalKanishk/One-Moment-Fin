import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Edit, Trash2, Calendar, FileText } from "lucide-react";

interface KYCTemplate {
  id: string;
  name: string;
  description?: string;
  fields: any[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Static template data
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

export default function KYC() {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "default" : "secondary";
  };

  return (
    <div className="space-y-4">
      <Helmet>
        <title>KYC – OneMFin</title>
        <meta name="description" content="Manage KYC templates and forms." />
      </Helmet>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">KYC</h1>
          <p className="text-muted-foreground">Manage your KYC templates and forms</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/app/kyc/templates/new')} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staticTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{template.name}</CardTitle>
                  {template.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/app/kyc/templates/${template.id}/edit`)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => alert('This is a static template and cannot be deleted.')}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Updated {formatDate(template.updated_at)}</span>
                </div>
                <Badge variant={getStatusColor(template.is_active)}>
                  {template.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              
              <div className="text-sm text-muted-foreground">
                {template.fields.length} field{template.fields.length !== 1 ? 's' : ''}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
