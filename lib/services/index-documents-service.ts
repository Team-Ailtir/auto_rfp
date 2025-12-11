/**
 * Document Index Provider Documents Service
 *
 * Provider-agnostic service for fetching documents from document index providers
 */

import { organizationAuth } from './organization-auth';
import { db } from '@/lib/db';
import { DatabaseError, LlamaCloudConnectionError, NotFoundError } from '@/lib/errors/api-errors';
import { getProviderCredentials } from '@/lib/env';
import { providerFactory } from '@/lib/providers/provider-factory';

/**
 * Documents request (provider-agnostic)
 */
export interface IndexProviderDocumentsRequest {
  organizationId: string;
}

/**
 * Documents response (provider-agnostic)
 */
export interface IndexProviderDocumentsResponse {
  projectName: string | null;
  projectId: string | null;
  pipelines: Array<{ id: string; name: string }>;
  documents: IndexDocument[];
  connectedAt: Date | null;
}

/**
 * Provider-agnostic document
 */
export interface IndexDocument {
  id: string;
  name: string;
  pipelineName: string;
  pipelineId: string;
  [key: string]: any; // Allow additional provider-specific fields
}

/**
 * Index Documents Service
 *
 * Manages document fetching from document index providers
 */
export class IndexDocumentsService {
  /**
   * Get documents and pipelines for an organization
   */
  async getDocuments(
    request: IndexProviderDocumentsRequest,
    userId: string
  ): Promise<IndexProviderDocumentsResponse> {
    try {
      // Step 1: Verify user has organization access
      await organizationAuth.requireMembership(userId, request.organizationId);

      // Step 2: Get connected organization
      const organization = await this.getConnectedOrganization(request.organizationId);

      // Get user's email to determine credentials
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      // Step 3: Get provider and credentials
      const provider = providerFactory.getProvider();
      const credentials = getProviderCredentials(user?.email);

      // Step 4: Fetch pipelines for the project
      const pipelines = await provider.fetchPipelinesForProject(
        credentials,
        organization.indexProjectId!
      );

      // Step 5: Collect all documents from all pipelines
      const allDocuments: IndexDocument[] = [];
      const documentFetchPromises = pipelines.map(async (pipeline) => {
        try {
          const documents = await provider.fetchDocumentsForPipeline(credentials, pipeline.id);
          return documents.map((doc) => ({
            ...doc,
            pipelineName: pipeline.name,
            pipelineId: pipeline.id,
          }));
        } catch (error) {
          console.error(`Failed to fetch documents for pipeline ${pipeline.name}:`, error);
          return [];
        }
      });

      const documentArrays = await Promise.all(documentFetchPromises);
      documentArrays.forEach((docs) => allDocuments.push(...docs));

      // Step 6: Return response
      const response: IndexProviderDocumentsResponse = {
        projectName: organization.indexProjectName,
        projectId: organization.indexProjectId,
        pipelines,
        documents: allDocuments,
        connectedAt: organization.indexConnectedAt,
      };

      return response;
    } catch (error) {
      if (
        error instanceof LlamaCloudConnectionError ||
        error instanceof DatabaseError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      throw new LlamaCloudConnectionError(
        `Failed to fetch documents: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get organization and verify provider connection
   */
  private async getConnectedOrganization(organizationId: string) {
    try {
      const organization = await db.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          name: true,
          indexProjectId: true,
          indexProjectName: true,
          indexConnectedAt: true,
          indexProvider: true,
        },
      });

      if (!organization) {
        throw new NotFoundError('Organization not found');
      }

      if (!organization.indexProjectId || !organization.indexConnectedAt) {
        throw new LlamaCloudConnectionError(
          'Organization is not connected to a document index provider'
        );
      }

      return organization;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof LlamaCloudConnectionError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to get organization: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Fetch documents for all pipelines in an organization
   */
  async fetchDocumentsForAllPipelines(organizationId: string): Promise<IndexDocument[]> {
    try {
      const organization = await this.getConnectedOrganization(organizationId);

      // Get provider and credentials
      const provider = providerFactory.getProvider();
      const credentials = getProviderCredentials();

      // Get all pipelines for the project
      const pipelines = await provider.fetchPipelinesForProject(
        credentials,
        organization.indexProjectId!
      );

      // Fetch documents for each pipeline
      const allDocuments: IndexDocument[] = [];
      for (const pipeline of pipelines) {
        try {
          const documents = await provider.fetchDocumentsForPipeline(credentials, pipeline.id);

          // Add pipeline information to each document
          const documentsWithPipeline = documents.map((doc) => ({
            ...doc,
            pipelineName: pipeline.name,
            pipelineId: pipeline.id,
          }));

          allDocuments.push(...documentsWithPipeline);
        } catch (error) {
          console.error(`Failed to fetch documents for pipeline ${pipeline.name}:`, error);
          // Continue with other pipelines if one fails
        }
      }

      return allDocuments;
    } catch (error) {
      if (
        error instanceof LlamaCloudConnectionError ||
        error instanceof DatabaseError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      throw new LlamaCloudConnectionError(
        `Failed to fetch documents for all pipelines: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
}

// Export singleton instance
export const indexDocumentsService = new IndexDocumentsService();
