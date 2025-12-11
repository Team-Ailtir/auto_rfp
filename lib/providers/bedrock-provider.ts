/**
 * Amazon Bedrock Provider Implementation
 *
 * Implements IDocumentIndexProvider for Amazon Bedrock Knowledge Bases.
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
import { LlamaCloudConnectionError } from '@/lib/errors/api-errors';
import {
  BedrockAgentClient,
  ListKnowledgeBasesCommand,
  GetKnowledgeBaseCommand,
  ListDataSourcesCommand,
} from '@aws-sdk/client-bedrock-agent';
import { BedrockKnowledgeBaseRetriever } from './bedrock-retriever';

/**
 * Bedrock Provider
 *
 * Provides access to Amazon Bedrock Knowledge Bases for document indexing and retrieval.
 */
export class BedrockProvider implements IDocumentIndexProvider {
  private config: Required<ProviderConfig>;

  constructor(config: Partial<ProviderConfig> = {}) {
    this.config = {
      baseUrl: '', // Not used for Bedrock
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      region: config.region || 'us-east-1',
    };
  }

  /**
   * Get provider type identifier
   */
  getProviderType(): ProviderType {
    return 'bedrock';
  }

  /**
   * Verify credentials and fetch available Knowledge Bases
   */
  async verifyCredentialsAndFetchProjects(
    credentials: ProviderCredentials
  ): Promise<IndexProject[]> {
    const client = this.createBedrockClient(credentials);

    try {
      const command = new ListKnowledgeBasesCommand({
        maxResults: 100,
      });

      const response = await client.send(command);

      if (!response.knowledgeBaseSummaries) {
        return [];
      }

      // Map Knowledge Bases to IndexProject format
      return response.knowledgeBaseSummaries.map((kb) => ({
        id: kb.knowledgeBaseId || '',
        name: kb.name || 'Unnamed Knowledge Base',
        description: kb.description || null,
        createdAt: kb.updatedAt?.toISOString() || null,
        updatedAt: kb.updatedAt?.toISOString() || null,
      }));
    } catch (error) {
      throw new LlamaCloudConnectionError(
        `Failed to list Bedrock Knowledge Bases: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Verify access to a specific Knowledge Base
   */
  async verifyProjectAccess(
    credentials: ProviderCredentials,
    projectId: string
  ): Promise<IndexProject> {
    const client = this.createBedrockClient(credentials);

    try {
      const command = new GetKnowledgeBaseCommand({
        knowledgeBaseId: projectId,
      });

      const response = await client.send(command);

      if (!response.knowledgeBase) {
        throw new LlamaCloudConnectionError(
          `Knowledge Base ${projectId} not found or not accessible`
        );
      }

      const kb = response.knowledgeBase;

      return {
        id: kb.knowledgeBaseId || projectId,
        name: kb.name || 'Unnamed Knowledge Base',
        description: kb.description || null,
        createdAt: kb.updatedAt?.toISOString() || null,
        updatedAt: kb.updatedAt?.toISOString() || null,
      };
    } catch (error) {
      throw new LlamaCloudConnectionError(
        `Failed to verify access to Knowledge Base ${projectId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Fetch data sources for a Knowledge Base
   */
  async fetchPipelinesForProject(
    credentials: ProviderCredentials,
    projectId: string
  ): Promise<IndexPipeline[]> {
    const client = this.createBedrockClient(credentials);

    try {
      const command = new ListDataSourcesCommand({
        knowledgeBaseId: projectId,
        maxResults: 100,
      });

      const response = await client.send(command);

      if (!response.dataSourceSummaries) {
        return [];
      }

      // Map Data Sources to IndexPipeline format
      return response.dataSourceSummaries.map((ds) => ({
        id: ds.dataSourceId || '',
        name: ds.name || 'Unnamed Data Source',
        projectId: projectId,
        description: ds.description || null,
        status: ds.status || null,
        createdAt: ds.updatedAt?.toISOString() || null,
        updatedAt: ds.updatedAt?.toISOString() || null,
      }));
    } catch (error) {
      throw new LlamaCloudConnectionError(
        `Failed to list data sources for Knowledge Base ${projectId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Fetch documents for a data source
   *
   * Note: Bedrock doesn't expose individual documents via API,
   * so this returns an empty array.
   */
  async fetchDocumentsForPipeline(
    credentials: ProviderCredentials,
    pipelineId: string
  ): Promise<IndexDocument[]> {
    // Bedrock Knowledge Bases don't expose individual documents via API
    // Documents are managed through S3/other sources directly
    console.info(
      `Bedrock provider doesn't support listing individual documents for data source ${pipelineId}`
    );
    return [];
  }

  /**
   * Create a retriever for querying the Knowledge Base
   */
  async createRetriever(
    credentials: ProviderCredentials,
    projectId: string,
    indexIds: string[]
  ): Promise<BedrockKnowledgeBaseRetriever> {
    const { awsAccessKeyId, awsSecretAccessKey, awsRegion } = this.extractAwsCredentials(credentials);

    try {
      // For Bedrock, we create a single retriever for the Knowledge Base
      // indexIds represent data sources, but querying happens at KB level
      const retriever = new BedrockKnowledgeBaseRetriever({
        knowledgeBaseId: projectId,
        region: awsRegion,
        topK: 10,
        credentials: {
          accessKeyId: awsAccessKeyId,
          secretAccessKey: awsSecretAccessKey,
        },
      });

      return retriever;
    } catch (error) {
      throw new LlamaCloudConnectionError(
        `Failed to create Bedrock retriever: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Create Bedrock Agent client with credentials
   */
  private createBedrockClient(credentials: ProviderCredentials): BedrockAgentClient {
    const { awsAccessKeyId, awsSecretAccessKey, awsRegion } = this.extractAwsCredentials(credentials);

    return new BedrockAgentClient({
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
    });
  }

  /**
   * Extract AWS credentials from provider credentials
   */
  private extractAwsCredentials(credentials: ProviderCredentials): {
    awsAccessKeyId: string;
    awsSecretAccessKey: string;
    awsRegion: string;
  } {
    if (!credentials.awsAccessKeyId) {
      throw new LlamaCloudConnectionError(
        'AWS Access Key ID is required but not provided in credentials'
      );
    }

    if (!credentials.awsSecretAccessKey) {
      throw new LlamaCloudConnectionError(
        'AWS Secret Access Key is required but not provided in credentials'
      );
    }

    return {
      awsAccessKeyId: credentials.awsAccessKeyId,
      awsSecretAccessKey: credentials.awsSecretAccessKey,
      awsRegion: credentials.awsRegion || this.config.region,
    };
  }
}
