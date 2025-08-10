import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, ExternalLink } from 'lucide-react';
import { useSettings } from '@/hooks/use-settings';

interface Lead {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}

interface CalendlyEmbedProps {
  lead: Lead;
  onEventScheduled: (eventData: any) => void;
}

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (options: any) => void;
    };
  }
}

export function CalendlyEmbed({ lead, onEventScheduled }: CalendlyEmbedProps) {
  const { settings, hasCalendlyConfig } = useSettings();
  const calendlyRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    // Load Calendly script if not already loaded
    if (!window.Calendly) {
      const script = document.createElement('script');
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.async = true;
      script.onload = initCalendlyWidget;
      document.head.appendChild(script);
    } else {
      initCalendlyWidget();
    }

    // Cleanup function
    return () => {
      if (widgetRef.current) {
        // Clean up any existing widget
        const container = calendlyRef.current;
        if (container) {
          container.innerHTML = '';
        }
      }
    };
  }, [lead]);

  const initCalendlyWidget = () => {
    if (!calendlyRef.current || !window.Calendly) return;

    // Clear previous widget
    calendlyRef.current.innerHTML = '';

    // Initialize Calendly inline widget
    window.Calendly.initInlineWidget({
      url: settings?.calendly_url || '',
      parentElement: calendlyRef.current,
      prefill: {
        name: lead.full_name,
        email: lead.email || '',
      },
      utm: {
        utmCampaign: 'onemfin',
        utmSource: 'website',
        utmMedium: 'meetings'
      },
      styles: {
        minWidth: '100%',
        height: '500px'
      }
    });

    // Listen for Calendly events
    const handleCalendlyEvent = (event: MessageEvent) => {
      if (event.data.event && event.data.event.indexOf('calendly') === 0) {
        if (event.data.event === 'calendly.event_scheduled') {
          const payload = event.data.payload;
          onEventScheduled(payload);
        }
      }
    };

    window.addEventListener('message', handleCalendlyEvent);

    // Cleanup listener
    return () => {
      window.removeEventListener('message', handleCalendlyEvent);
    };
  };

  // Show message if Calendly is not configured
  if (!hasCalendlyConfig) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Schedule Meeting</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Calendly Integration Required</h3>
            <p className="text-muted-foreground mb-4">
              To schedule meetings with your leads, you need to configure your Calendly integration first.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a 
                href="/app/settings?tab=calendly" 
                className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Configure Calendly
              </a>
              <a 
                href="https://help.calendly.com/hc/en-us/articles/360019511834-API-keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-4 py-2 bg-white text-blue-600 rounded-md border border-blue-200 hover:bg-blue-50 transition-colors"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Get API Key
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>Schedule Meeting</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Instructions */}
        <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
          <div className="flex items-start space-x-2">
            <Clock className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">Ready to schedule?</p>
              <p>Select your preferred time below. The meeting will be automatically added to your calendar.</p>
            </div>
          </div>
        </div>

        {/* Calendly Widget Container */}
        <div 
          ref={calendlyRef}
          className="w-full border rounded-lg overflow-hidden bg-white"
          style={{ height: '500px' }}
        />
        
        {/* CSS to hide Calendly cookie settings */}
        <style jsx>{`
          iframe[src*="calendly.com"] {
            border: none;
          }
          /* Hide Calendly cookie settings button */
          .calendly-inline-widget iframe {
            border: none;
          }
          /* Target the cookie settings button specifically */
          [data-id="cookie-settings"] {
            display: none !important;
          }
          /* Alternative selector for cookie settings */
          .PPZmjUGS2z52qC30kQIg {
            display: none !important;
          }
        `}</style>
      </CardContent>
    </Card>
  );
}
