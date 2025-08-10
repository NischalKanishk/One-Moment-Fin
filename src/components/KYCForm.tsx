import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Upload, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { kycAPI } from "@/lib/api";
import { KYC_SCHEMA_FIELDS, KYCField } from "@/lib/kyc-schema";

interface KYCFormProps {
  leadId: string;
  templateId?: string;
  onComplete?: () => void;
  onCancel?: () => void;
  isReadOnly?: boolean;
}

interface KYCFormData {
  [key: string]: any;
}

export default function KYCForm({ 
  leadId, 
  templateId, 
  onComplete, 
  onCancel, 
  isReadOnly = false 
}: KYCFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<KYCFormData>({});
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Initialize form with all KYC fields if no template specified
  useEffect(() => {
    if (!templateId) {
      setSelectedFields(KYC_SCHEMA_FIELDS.map(field => field.id));
      // Initialize form values
      const initialData: KYCFormData = {};
      KYC_SCHEMA_FIELDS.forEach(field => {
        if (field.type === 'checkbox') {
          initialData[field.id] = false;
        } else if (field.type === 'select' && field.options) {
          initialData[field.id] = field.options[0];
        } else {
          initialData[field.id] = '';
        }
      });
      setFormData(initialData);
    }
  }, [templateId]);

  const updateFieldValue = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => ({
        ...prev,
        [fieldId]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    selectedFields.forEach(fieldId => {
      const field = KYC_SCHEMA_FIELDS.find(f => f.id === fieldId);
      if (field && field.required) {
        const value = formData[fieldId];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          newErrors[fieldId] = `${field.label} is required`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      
      const token = await window.Clerk?.session?.getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      await kycAPI.upload({
        lead_id: leadId,
        kyc_method: 'manual_entry',
        form_data: formData
      });

      toast({
        title: "Success",
        description: "KYC form submitted successfully",
      });

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('KYC submission error:', error);
      toast({
        title: "Error",
        description: "Failed to submit KYC form",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: KYCField) => {
    const value = formData[field.id] || '';
    const error = errors[field.id];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <div className="space-y-2">
            <Input
              type={field.type === 'email' ? 'email' : 'text'}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              disabled={isReadOnly}
              className={error ? 'border-destructive' : ''}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );
      
      case 'number':
        return (
          <div className="space-y-2">
            <Input
              type="number"
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              min={field.validation?.min}
              max={field.validation?.max}
              disabled={isReadOnly}
              className={error ? 'border-destructive' : ''}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );
      
      case 'date':
        return (
          <div className="space-y-2">
            <Input
              type="date"
              value={value}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              disabled={isReadOnly}
              className={error ? 'border-destructive' : ''}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );
      
      case 'select':
        return (
          <div className="space-y-2">
            <select
              className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? 'border-destructive' : ''}`}
              value={value}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              disabled={isReadOnly}
            >
              {field.options?.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                checked={value}
                onCheckedChange={(checked) => updateFieldValue(field.id, checked)}
                disabled={isReadOnly}
              />
              <span className="text-sm text-muted-foreground">
                {field.description || field.label}
              </span>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );
      
      case 'file':
        return (
          <div className="space-y-2">
            <Input
              type="file"
              onChange={(e) => updateFieldValue(field.id, e.target.files?.[0]?.name || '')}
              disabled={isReadOnly}
              className={error ? 'border-destructive' : ''}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );
      
      default:
        return <Input placeholder="Unsupported field type" disabled />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-primary" />
          KYC Form
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Complete the Know Your Customer verification for this lead
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {selectedFields.map((fieldId) => {
            const field = KYC_SCHEMA_FIELDS.find(f => f.id === fieldId);
            if (!field) return null;

            return (
              <div key={field.id} className="space-y-2">
                <label className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </label>
                {renderField(field)}
                {field.description && (
                  <p className="text-xs text-muted-foreground">
                    {field.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Action Buttons */}
        {!isReadOnly && (
          <div className="flex justify-end gap-3">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button 
              onClick={handleSubmit} 
              disabled={submitting}
              className="flex items-center gap-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {submitting ? 'Submitting...' : 'Submit KYC'}
            </Button>
          </div>
        )}

        {/* Read-only indicator */}
        {isReadOnly && (
          <div className="text-center py-4">
            <Badge variant="secondary" className="flex items-center gap-2 mx-auto">
              <CheckCircle className="h-4 w-4" />
              Form is read-only
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
