/**
 * Document Index Provider Abstraction
 *
 * This interface defines a common abstraction for document indexing providers
 * (LlamaCloud, Amazon Bedrock Knowledge Bases, etc.).
 */

/**
 * Supported provider types
 */
export type ProviderType = 'llamacloud' | 'bedrock';

/**
 * Provider-agnostic credentials
 * Each provider implements its own credential structure
 */
export interface ProviderCredentials {
  type: ProviderType;
  // LlamaCloud credentials
  llamaCloudApiKey?: string;
  // AWS Bedrock credentials
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;
}

/**
 * Provider-agnostic project/knowledge base
 */
export interface IndexProject {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/**
 * Provider-agnostic pipeline/data source
 */
export interface IndexPipeline {
  id: string;
  name: string;
  projectId: string;
  description?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/**
 * Provider-agnostic document
 */
export interface IndexDocument {
  id?: string | null;
  name: string;
  size?: number | null;
  type?: string | null;
  pipelineId?: string | null;
  lastModified?: string | null;
  status?: string | null;
}

/**
 * Provider configuration options
 */
export interface ProviderConfig {
  /**
   * Base URL for the provider API (if applicable)
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;

  /**
   * Number of retry attempts on failure
   * @default 3
   */
  retryAttempts?: number;

  /**
   * AWS region (for Bedrock)
   */
  region?: string;
}

/**
 * Document Index Provider Interface
 *
 * All providers must implement this interface to be compatible with the system.
 */
export interface IDocumentIndexProvider {
  /**
   * Get the provider type identifier
   */
  getProviderType(): ProviderType;

  /**
   * Verify credentials and fetch available projects/knowledge bases
   *
   * @param credentials - Provider-specific credentials
   * @returns List of accessible projects
   * @throws {LlamaCloudConnectionError} If credentials are invalid or connection fails
   */
  verifyCredentialsAndFetchProjects(
    credentials: ProviderCredentials
  ): Promise<IndexProject[]>;

  /**
   * Verify access to a specific project/knowledge base
   *
   * @param credentials - Provider-specific credentials
   * @param projectId - Project/Knowledge Base ID
   * @returns Project details if accessible
   * @throws {LlamaCloudConnectionError} If project is not accessible
   */
  verifyProjectAccess(
    credentials: ProviderCredentials,
    projectId: string
  ): Promise<IndexProject>;

  /**
   * Fetch pipelines/data sources for a project
   *
   * @param credentials - Provider-specific credentials
   * @param projectId - Project/Knowledge Base ID
   * @returns List of pipelines/data sources
   * @throws {LlamaCloudConnectionError} If fetching fails
   */
  fetchPipelinesForProject(
    credentials: ProviderCredentials,
    projectId: string
  ): Promise<IndexPipeline[]>;

  /**
   * Fetch documents for a pipeline/data source
   *
   * Note: Some providers (like Bedrock) may not expose individual documents,
   * in which case this should return an empty array.
   *
   * @param credentials - Provider-specific credentials
   * @param pipelineId - Pipeline/Data Source ID
   * @returns List of documents (or empty array if not supported)
   */
  fetchDocumentsForPipeline(
    credentials: ProviderCredentials,
    pipelineId: string
  ): Promise<IndexDocument[]>;

  /**
   * Create a retriever for querying the index
   *
   * Returns a provider-specific retriever instance that can be used with LlamaIndex.
   * The actual type depends on the provider:
   * - LlamaCloud: LlamaCloudIndex[]
   * - Bedrock: BedrockKnowledgeBaseRetriever
   *
   * @param credentials - Provider-specific credentials
   * @param projectId - Project/Knowledge Base ID
   * @param indexIds - List of pipeline/data source IDs to query
   * @returns Provider-specific retriever instance
   * @throws {LlamaCloudConnectionError} If retriever creation fails
   */
  createRetriever(
    credentials: ProviderCredentials,
    projectId: string,
    indexIds: string[]
  ): Promise<unknown>;
}
