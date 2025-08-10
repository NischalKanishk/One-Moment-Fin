import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from "@clerk/clerk-react";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, User, Mail, Phone } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

interface Lead {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}

interface LeadAutocompleteProps {
  onLeadSelect: (lead: Lead) => void;
  selectedLead: Lead | null;
}

export function LeadAutocomplete({ onLeadSelect, selectedLead }: LeadAutocompleteProps) {
  const { getToken } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debouncedSearchTerm.trim().length < 2) {
      setLeads([]);
      setIsOpen(false);
      return;
    }

    const fetchLeads = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const token = await getToken();
        if (!token) {
          throw new Error('No authentication token available');
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/leads/search?search=${encodeURIComponent(debouncedSearchTerm)}&limit=20`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to search leads');
        }

        const data = await response.json();
        setLeads(data.leads || []);
        setIsOpen(true);
      } catch (error) {
        console.error('Failed to search leads:', error);
        setError('Failed to search leads');
        setLeads([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeads();
  }, [debouncedSearchTerm, getToken]);

  const handleLeadSelect = (lead: Lead) => {
    onLeadSelect(lead);
    setSearchTerm(lead.full_name);
    setIsOpen(false);
  };

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    if (!value) {
      setLeads([]);
      setIsOpen(false);
    }
  };

  const clearSelection = () => {
    onLeadSelect(null as any);
    setSearchTerm('');
    setLeads([]);
    setIsOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search for a lead..."
            value={searchTerm}
            onChange={(e) => handleInputChange(e.target.value)}
            className="pl-10"
            disabled={!!selectedLead}
          />
          {selectedLead && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              ×
            </Button>
          )}
        </div>

        {isLoading && (
          <div className="absolute top-full left-0 right-0 bg-background border rounded-md p-4 text-center text-muted-foreground">
            Searching...
          </div>
        )}

        {error && (
          <div className="absolute top-full left-0 right-0 bg-destructive/10 border border-destructive/20 rounded-md p-4 text-center text-destructive text-sm">
            {error}
          </div>
        )}

        {isOpen && leads.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 bg-background border rounded-md shadow-lg max-h-80 overflow-y-auto z-[100] mt-1"
          >
            {leads.map((lead) => (
              <button
                key={lead.id}
                type="button"
                onClick={() => handleLeadSelect(lead)}
                className="w-full text-left p-3 hover:bg-accent hover:text-accent-foreground transition-colors border-b last:border-b-0"
              >
                <div className="flex items-center space-x-3">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{lead.full_name}</div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      {lead.email && (
                        <div className="flex items-center space-x-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3" />
                          <span className="truncate">{lead.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {isOpen && leads.length === 0 && !isLoading && debouncedSearchTerm.length >= 2 && (
          <div className="absolute top-full left-0 right-0 bg-background border rounded-md p-4 text-center text-muted-foreground z-[100] mt-1">
            No leads found
          </div>
        )}
      </div>

      {selectedLead && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">Lead Selected</div>
                  <div className="text-sm text-muted-foreground">
                    Ready to schedule meeting
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearSelection}
                className="text-muted-foreground hover:text-foreground"
              >
                Change Lead
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
