import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { kycTemplatesAPI } from "@/lib/api";
import { KYC_SCHEMA_FIELDS, KYCField } from "@/lib/kyc-schema";
import { useToast } from "@/hooks/use-toast";

interface KYCTemplate {
  id: string;
  name: string;
  description?: string;
  fields: string[]; // Array of field IDs
  is_active: boolean;
}

export default function KYCTemplateForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  
  // Preview form values
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});

  const isEditing = !!id;

  useEffect(() => {
    if (isEditing) {
      loadTemplate();
    }
  }, [id]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const token = await window.Clerk?.session?.getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      const response = await kycTemplatesAPI.getById(token, id!);
      const template = response.template;
      
      setName(template.name);
      setDescription(template.description || '');
      setIsActive(template.is_active);
      setSelectedFields(template.fields || []);
      
      // Initialize preview values
      const initialValues: Record<string, any> = {};
      template.fields.forEach((fieldId: string) => {
        const field = KYC_SCHEMA_FIELDS.find(f => f.id === fieldId);
        if (field) {
          if (field.type === 'checkbox') {
            initialValues[fieldId] = false;
          } else if (field.type === 'select' && field.options) {
            initialValues[fieldId] = field.options[0];
          } else {
            initialValues[fieldId] = '';
          }
        }
      });
      setPreviewValues(initialValues);
    } catch (error) {
      console.error('Failed to load template:', error);
      toast({
        title: "Error",
        description: "Failed to load template",
        variant: "destructive",
      });
      navigate('/app/kyc');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    if (selectedFields.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one field",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const token = await window.Clerk?.session?.getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const templateData = {
        name: name.trim(),
        description: description.trim() || undefined,
        fields: selectedFields,
        is_active: isActive
      };

      if (isEditing) {
        await kycTemplatesAPI.update(token, id!, templateData);
        toast({
          title: "Success",
          description: "Template updated successfully",
        });
      } else {
        await kycTemplatesAPI.create(token, templateData);
        toast({
          title: "Success",
          description: "Template created successfully",
        });
      }

      navigate('/app/kyc');
    } catch (error) {
      console.error('Failed to save template:', error);
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev => {
      if (prev.includes(fieldId)) {
        return prev.filter(id => id !== fieldId);
      } else {
        return [...prev, fieldId];
      }
    });
  };

  const updatePreviewValue = (fieldId: string, value: any) => {
    setPreviewValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const renderPreviewField = (field: KYCField) => {
    const value = previewValues[field.id] || '';

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <Input
            type={field.type === 'email' ? 'email' : 'text'}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => updatePreviewValue(field.id, e.target.value)}
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => updatePreviewValue(field.id, e.target.value)}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => updatePreviewValue(field.id, e.target.value)}
          />
        );
      
      case 'select':
        return (
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={value}
            onChange={(e) => updatePreviewValue(field.id, e.target.value)}
          >
            {field.options?.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'checkbox':
        return (
          <Switch
            checked={value}
            onCheckedChange={(checked) => updatePreviewValue(field.id, checked)}
          />
        );
      
      case 'file':
        return (
          <Input
            type="file"
            onChange={(e) => updatePreviewValue(field.id, e.target.files?.[0]?.name || '')}
          />
        );
      
      default:
        return <Input placeholder="Unsupported field type" disabled />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" disabled>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Helmet>
        <title>{isEditing ? 'Edit KYC Template' : 'Create KYC Template'} – OneMFin</title>
        <meta name="description" content="Create or edit KYC template with form builder and live preview." />
      </Helmet>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/kyc')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? 'Edit KYC Template' : 'Create KYC Template'}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? 'Modify your KYC template' : 'Build a new KYC template using the predefined schema'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2"
          >
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </header>

      <div className={`grid gap-6 ${showPreview ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
        {/* Form Builder */}
        <Card>
          <CardHeader>
            <CardTitle>Template Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Template Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter template name"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter template description (optional)"
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  id="active-status"
                />
                <label htmlFor="active-status" className="text-sm">
                  Template is active
                </label>
              </div>
            </div>

            <Separator />

            {/* Field Selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Select Fields</h3>
                <Badge variant="secondary">
                  {selectedFields.length} of {KYC_SCHEMA_FIELDS.length} selected
                </Badge>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {KYC_SCHEMA_FIELDS.map((field) => (
                  <div
                    key={field.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedFields.includes(field.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => toggleField(field.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium cursor-pointer">
                            {field.label}
                          </label>
                          {field.required && (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          )}
                        </div>
                        {field.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {field.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {field.type}
                        </Badge>
                        <Switch
                          checked={selectedFields.includes(field.id)}
                          onCheckedChange={() => toggleField(field.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Preview */}
        {showPreview && (
          <Card className="bg-secondary/50">
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <p className="text-sm text-muted-foreground">
                See how your KYC form will look to users
              </p>
            </CardHeader>
            <CardContent>
              {selectedFields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Select fields from the left to see the preview</p>
                </div>
              ) : (
                <form className="space-y-4">
                  {selectedFields.map((fieldId) => {
                    const field = KYC_SCHEMA_FIELDS.find(f => f.id === fieldId);
                    if (!field) return null;

                    return (
                      <div key={field.id} className="space-y-2">
                        <label className="text-sm font-medium">
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </label>
                        {renderPreviewField(field)}
                        {field.description && (
                          <p className="text-xs text-muted-foreground">
                            {field.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
