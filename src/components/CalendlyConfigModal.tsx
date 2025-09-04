import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Settings, CheckCircle, AlertCircle, ExternalLink, Zap } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '@clerk/clerk-react';

interface CalendlyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

interface CalendlyConfig {
  username: string;
  isValid?: boolean;
}

export default function CalendlyConfigModal({ isOpen, onClose, onConfigSaved }: CalendlyConfigModalProps) {
  const { getToken } = useAuth();
  const [config, setConfig] = useState<CalendlyConfig>({ username: '' });
  const [currentConfig, setCurrentConfig] = useState<CalendlyConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchCurrentConfig();
    }
  }, [isOpen]);

  const fetchCurrentConfig = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/meetings/calendly-config`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setCurrentConfig(data.config);
          setConfig({ username: data.config.username || '' });
        }
      }
    } catch (error) {
      console.error('Failed to fetch current config:', error);
    }
  };

  const handleInputChange = (field: keyof CalendlyConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    // Reset validation when username changes
    if (field === 'username') {
      setConfig(prev => ({ ...prev, isValid: undefined }));
    }
  };

  const validateUsername = async () => {
    if (!config.username) {
      toast({
        title: "Validation Error",
        description: "Please enter a username first.",
        variant: "destructive"
      });
      return;
    }

    setIsValidating(true);
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/meetings/calendly-validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: config.username })
      });

      const data = await response.json();

      if (data.isValid) {
        setConfig(prev => ({ ...prev, isValid: true }));
        toast({
          title: "Success",
          description: "Username validated successfully!",
        });
      } else {
        setConfig(prev => ({ ...prev, isValid: false }));
        toast({
          title: "Validation Failed",
          description: data.error || "Invalid username. Please check and try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to validate username:', error);
      toast({
        title: "Error",
        description: "Failed to validate username. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  const saveConfig = async () => {
    if (!config.username) {
      toast({
        title: "Validation Error",
        description: "Please enter a username.",
        variant: "destructive"
      });
      return;
    }

    if (!config.isValid) {
      toast({
        title: "Validation Required",
        description: "Please validate your username before saving.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/meetings/calendly-config`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: config.username })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Calendly configuration saved successfully!",
        });
        onConfigSaved();
        onClose();
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      toast({
        title: "Error",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Calendly Configuration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status */}
          {currentConfig && (
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-700">
                  Current Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-700">
                    Connected to Calendly as <strong>@{currentConfig.username}</strong>
                  </span>
                </div>
                <div className="mt-2">
                  <a
                    href={`https://calendly.com/${currentConfig.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View your Calendly page
                  </a>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Configuration Form */}
          <div className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                Calendly Username *
              </Label>
              <div className="relative">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md px-3 py-2 text-sm text-gray-600 font-medium">
                    calendly.com/
                  </div>
                  <Input
                    id="username"
                    value={config.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    placeholder="yourusername"
                    className="rounded-l-none border-l-0 focus:border-l focus:border-l-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                {config.username && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-700">
                      <span className="font-medium">Your Calendly URL:</span>{' '}
                      <span className="font-mono text-blue-800 break-all">
                        https://calendly.com/{config.username}
                      </span>
                    </p>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-600">
                Your Calendly username (without the domain)
              </p>
            </div>

            {/* Validation Status */}
            {config.username && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {config.isValid === true && (
                      <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Username Validated
                      </Badge>
                    )}
                    {config.isValid === false && (
                      <Badge variant="destructive" className="border-red-300">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Invalid Username
                      </Badge>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={validateUsername}
                    disabled={isValidating}
                    className={config.isValid === true ? "border-green-300 text-green-700 hover:bg-green-50" : ""}
                  >
                    {isValidating ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                        Validating...
                      </>
                    ) : (
                      'Validate Username'
                    )}
                  </Button>
                </div>
                {config.isValid === false && (
                  <p className="text-sm text-red-600 mt-2">
                    Please check your username and try validating again.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Benefits */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-800">
                What This Enables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Automatic Calendly link generation</li>
                <li>• Professional scheduling experience</li>
                <li>• Easy meeting management</li>
                <li>• Future Scheduling API integration ready</li>
              </ul>
            </CardContent>
          </Card>

          {/* Coming Soon: Scheduling API */}
          <Card className="bg-purple-50 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-800 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Coming Soon: Direct Scheduling
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-purple-700 space-y-2">
                <p>
                  Calendly is launching a new <strong>Scheduling API</strong> that will allow us to:
                </p>
                <ul className="space-y-1 ml-4">
                  <li>• Schedule meetings directly in our app</li>
                  <li>• No more redirects to Calendly</li>
                  <li>• Seamless integration experience</li>
                  <li>• AI-powered scheduling assistance</li>
                </ul>
                <p className="text-xs text-purple-600 mt-3">
                  Your username configuration will automatically work with the new API when it launches!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveConfig}
              disabled={!config.username || !config.isValid || isLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
