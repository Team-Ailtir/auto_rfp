'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Cloud, Loader2, AlertCircle, CheckCircle2, Unplug } from 'lucide-react';

interface IndexProject {
  id: string;
  name: string;
  description?: string;
  organization_id?: string;
  organizationName?: string;
  region?: string;
  created_at?: string;
  updated_at?: string;
}

interface IndexProviderConnectionProps {
  orgId: string;
  organization: any;
  onConnectionUpdate: (organization: any) => void;
}

export function LlamaCloudConnection({ orgId, organization, onConnectionUpdate }: IndexProviderConnectionProps) {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [availableProjects, setAvailableProjects] = useState<IndexProject[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isFetchingProjects, setIsFetchingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const isConnected = organization?.indexConnectedAt;
  const connectedProjectName = organization?.indexProjectName;
  const connectedProjectId = organization?.indexProjectId;
  const providerType = organization?.indexProvider || 'LlamaCloud';
  const providerDisplayName = providerType === 'bedrock' ? 'Amazon Bedrock Knowledge Base' : 'LlamaCloud Project';

  // Fetch available projects using environment API key
  const fetchProjects = async () => {
    setIsFetchingProjects(true);
    setError(null);

    try {
      // Fetch projects through our API route (which uses environment variables on server side)
      const response = await fetch('/api/index-provider/projects', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Document index provider API key is not configured or invalid. Please check your environment variables.');
        }
        throw new Error('Failed to fetch projects from document index provider.');
      }

      const data = await response.json();
      setAvailableProjects(data.projects || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch projects';
      setError(errorMessage);
      setAvailableProjects([]);
    } finally {
      setIsFetchingProjects(false);
    }
  }

  // Fetch projects when component mounts
  useEffect(() => {
    if (!isConnected) {
      fetchProjects();
    }
  }, [isConnected]);

  // Connect to document index provider project
  const handleConnect = async () => {
    if (!selectedProjectId) {
      toast({
        title: 'Error',
        description: 'Please select a project.',
        variant: 'destructive',
      });
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const selectedProject = availableProjects.find(p => p.id === selectedProjectId);

      const response = await fetch('/api/index-provider/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: orgId,
          projectId: selectedProjectId,
          projectName: selectedProject?.name || 'Unknown Project',
          organizationName: selectedProject?.organizationName || selectedProject?.organization_name || 'Unknown Organization',
          region: selectedProject?.region,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to connect to document index provider');
      }

      const updatedOrg = await response.json();
      onConnectionUpdate(updatedOrg.organization);

      toast({
        title: 'Success',
        description: `Connected to ${providerDisplayName} "${selectedProject?.name}"`,
      });

      // Clear form
      setSelectedProjectId('');
      setAvailableProjects([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to document index provider';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect from document index provider
  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setError(null);

    try {
      const response = await fetch('/api/index-provider/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: orgId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disconnect from document index provider');
      }

      const updatedOrg = await response.json();
      onConnectionUpdate(updatedOrg.organization);

      toast({
        title: 'Success',
        description: 'Disconnected from document index provider',
      });

      // Refresh projects for potential reconnection
      fetchProjects();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect from document index provider';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Document Index Integration
        </CardTitle>
        <CardDescription>
          Connect your organization to a document index provider for document indexing and search.
          The API credentials are configured via environment variables.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isConnected ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Connected to {providerDisplayName}</AlertTitle>
              <AlertDescription>
                {organization?.indexOrganizationName && organization?.indexProjectName ?
                  `Connected to ${organization.indexOrganizationName} - ${organization.indexProjectName}` :
                  `Your organization is connected to the ${providerDisplayName.toLowerCase()} "${connectedProjectName}"`
                }
                {organization?.indexRegion && ` (${organization.indexRegion})`}
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleDisconnect}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <Unplug className="h-4 w-4 mr-2" />
                    Disconnect
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Environment Configuration</AlertTitle>
              <AlertDescription>
                Document index provider credentials are configured via environment variables.
                Make sure your provider API credentials are properly set.
              </AlertDescription>
            </Alert>

            {isFetchingProjects && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Fetching available projects...
              </div>
            )}

            {availableProjects.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="project-select">Select Project</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a project to connect to" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {project.organizationName || project.organization_name || ''}{project.organizationName || project.organization_name ? ' - ' : ''}{project.name}
                          </span>
                          {project.description && (
                            <span className="text-xs text-muted-foreground">{project.description}</span>
                          )}
                          {project.region && (
                            <span className="text-xs text-muted-foreground">Region: {project.region}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This will connect your organization to the selected project
                </p>
              </div>
            )}

            {!isFetchingProjects && availableProjects.length === 0 && !error && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Projects Found</AlertTitle>
                <AlertDescription>
                  No projects were found. Make sure you have created a project in your document index provider and the credentials are properly configured.
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleConnect}
              disabled={!selectedProjectId || isConnecting || isFetchingProjects}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Cloud className="h-4 w-4 mr-2" />
                  Connect Document Index
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 