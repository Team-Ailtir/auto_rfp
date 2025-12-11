/**
 * LlamaCloud Provider Implementation
 *
 * Implements IDocumentIndexProvider for LlamaCloud document indexing service.
 */

import {
  IDocumentIndexProvider,
  ProviderCredentials,
  ProviderType,
  IndexProject,
  IndexPipeline,
  IndexDocument,
  ProviderConfig,
} from '@/lib/interfaces/document-index-provider';
import {
  LlamaCloudProject,
  LlamaCloudProjectSchema,
  LlamaCloudPipeline,
  LlamaCloudPipelineSchema,
  LlamaCloudFile,
  LlamaCloudFileSchema,
} from '@/lib/validators/llamacloud';
import { ExternalServiceError, LlamaCloudConnectionError } from '@/lib/errors/api-errors';
import { z } from 'zod';
import { LlamaCloudIndex } from 'llamaindex';

/**
 * LlamaCloud Provider
 *
 * Provides access to LlamaCloud document indexing and retrieval services.
 */
export class LlamaCloudProvider implements IDocumentIndexProvider {
  private config: Required<ProviderConfig>;

  constructor(config: Partial<ProviderConfig> = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'https://api.cloud.llamaindex.ai/api/v1',
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      region: config.region || '', // Not used for LlamaCloud
    };
  }

  /**
   * Get provider type identifier
   */
  getProviderType(): ProviderType {
    return 'llamacloud';
  }

  /**
   * Verify credentials and fetch available projects
   */
  async verifyCredentialsAndFetchProjects(
    credentials: ProviderCredentials
  ): Promise<IndexProject[]> {
    const apiKey = this.extractApiKey(credentials);

    try {
      const response = await this.makeRequest('/projects', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new LlamaCloudConnectionError(
          `Invalid API key or unable to connect to LlamaCloud (status: ${response.status})`
        );
      }

      const projects = await response.json();

      // Validate the response structure
      const ProjectsArraySchema = z.array(LlamaCloudProjectSchema);
      const validatedProjects = ProjectsArraySchema.parse(projects || []);

      // Map to common IndexProject type
      return validatedProjects.map(this.mapProjectToIndexProject);
    } catch (error) {
      if (error instanceof LlamaCloudConnectionError) {
        throw error;
      }
      throw new LlamaCloudConnectionError(
        `Failed to verify API key: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Verify access to a specific project
   */
  async verifyProjectAccess(
    credentials: ProviderCredentials,
    projectId: string
  ): Promise<IndexProject> {
    try {
      const projects = await this.verifyCredentialsAndFetchProjects(credentials);

      const selectedProject = projects.find((p) => p.id === projectId);
      if (!selectedProject) {
        throw new LlamaCloudConnectionError(
          'The specified project is not accessible with this API key'
        );
      }

      return selectedProject;
    } catch (error) {
      if (error instanceof LlamaCloudConnectionError) {
        throw error;
      }
      throw new LlamaCloudConnectionError(
        `Failed to verify project access: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Fetch pipelines for a specific project
   */
  async fetchPipelinesForProject(
    credentials: ProviderCredentials,
    projectId: string
  ): Promise<IndexPipeline[]> {
    const apiKey = this.extractApiKey(credentials);

    try {
      const response = await this.makeRequest('/pipelines', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new LlamaCloudConnectionError(
          `Failed to fetch pipelines (status: ${response.status})`
        );
      }

      const pipelines = await response.json();

      // Validate the response structure
      const PipelinesArraySchema = z.array(LlamaCloudPipelineSchema);
      const validatedPipelines = PipelinesArraySchema.parse(pipelines || []);

      console.log("from llamacloud-provider 'validatedPipelines'", validatedPipelines);
      console.log("from llamacloud-provider 'projectId'", projectId);

      // Filter pipelines to only include those from the specified project
      const filteredPipelines = validatedPipelines.filter(
        (pipeline) => pipeline.project_id === projectId
      );

      // Map to common IndexPipeline type
      return filteredPipelines.map(this.mapPipelineToIndexPipeline);
    } catch (error) {
      if (error instanceof LlamaCloudConnectionError) {
        throw error;
      }
      throw new LlamaCloudConnectionError(
        `Failed to fetch pipelines: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Fetch documents for a specific pipeline
   */
  async fetchDocumentsForPipeline(
    credentials: ProviderCredentials,
    pipelineId: string
  ): Promise<IndexDocument[]> {
    const apiKey = this.extractApiKey(credentials);

    try {
      const response = await this.makeRequest(`/pipelines/${pipelineId}/files`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(
          `Failed to fetch files for pipeline ${pipelineId} (status: ${response.status})`
        );
        return [];
      }

      const files = await response.json();

      // Validate the response structure
      const FilesArraySchema = z.array(LlamaCloudFileSchema);
      const validatedFiles = FilesArraySchema.parse(files || []);

      // Map to common IndexDocument type
      return validatedFiles.map(this.mapFileToIndexDocument);
    } catch (error) {
      // Log error but return empty array to not break the entire operation
      console.error(`Error fetching files for pipeline ${pipelineId}:`, error);
      return [];
    }
  }

  /**
   * Create a retriever for querying the index
   */
  async createRetriever(
    credentials: ProviderCredentials,
    projectId: string,
    indexIds: string[]
  ): Promise<LlamaCloudIndex[]> {
    const apiKey = this.extractApiKey(credentials);

    try {
      // Create LlamaCloudIndex instances for each pipeline ID
      const indexes = indexIds.map((pipelineId) => {
        return new LlamaCloudIndex({
          name: pipelineId,
          projectName: projectId,
          apiKey: apiKey,
        });
      });

      return indexes;
    } catch (error) {
      throw new LlamaCloudConnectionError(
        `Failed to create retriever: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Extract API key from credentials
   */
  private extractApiKey(credentials: ProviderCredentials): string {
    if (!credentials.llamaCloudApiKey) {
      throw new LlamaCloudConnectionError(
        'LlamaCloud API key is required but not provided in credentials'
      );
    }
    return credentials.llamaCloudApiKey;
  }

  /**
   * Map LlamaCloud project to common IndexProject type
   */
  private mapProjectToIndexProject(project: LlamaCloudProject): IndexProject {
    return {
      id: project.id,
      name: project.name,
      description: project.description || null,
      createdAt: project.created_at || null,
      updatedAt: project.updated_at || null,
    };
  }

  /**
   * Map LlamaCloud pipeline to common IndexPipeline type
   */
  private mapPipelineToIndexPipeline(pipeline: LlamaCloudPipeline): IndexPipeline {
    return {
      id: pipeline.id,
      name: pipeline.name,
      projectId: pipeline.project_id,
      description: pipeline.description || null,
      status: pipeline.status || null,
      createdAt: pipeline.created_at || null,
      updatedAt: pipeline.updated_at || null,
    };
  }

  /**
   * Map LlamaCloud file to common IndexDocument type
   */
  private mapFileToIndexDocument(file: LlamaCloudFile): IndexDocument {
    return {
      id: file.id || null,
      name: file.name,
      size: file.file_size || null,
      type: file.file_type || null,
      pipelineId: file.pipeline_id || null,
      lastModified: file.last_modified_at || null,
      status: file.status || null,
    };
  }

  /**
   * Make HTTP request to LlamaCloud API with retry logic
   */
  private async makeRequest(endpoint: string, options: RequestInit): Promise<Response> {
    const url = `${this.config.baseUrl}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt === this.config.retryAttempts) {
          break;
        }

        // Wait before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw new ExternalServiceError(
      `LlamaCloud API request failed after ${this.config.retryAttempts} attempts: ${lastError?.message}`,
      'LlamaCloud'
    );
  }
}
