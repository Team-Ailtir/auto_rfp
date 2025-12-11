/**
 * Document Index Provider Connection Service
 *
 * Provider-agnostic service for managing organization connections to
 * document index providers (LlamaCloud, Bedrock, etc.)
 */

import { organizationAuth } from './organization-auth';
import { db } from '@/lib/db';
import { DatabaseError, LlamaCloudConnectionError } from '@/lib/errors/api-errors';
import { getProviderCredentials, getLlamaSdkProvider } from '@/lib/env';
import { providerFactory } from '@/lib/providers/provider-factory';

/**
 * Connect request (provider-agnostic)
 */
export interface IndexProviderConnectRequest {
  organizationId: string;
  projectId: string;
  projectName: string;
  organizationName?: string;
  region?: string; // For AWS Bedrock
}

/**
 * Disconnect request
 */
export interface IndexProviderDisconnectRequest {
  organizationId: string;
}

/**
 * Connect response
 */
export interface IndexProviderConnectResponse {
  success: boolean;
  organization: {
    id: string;
    name: string;
    indexProvider: string | null;
    indexProjectId: string | null;
    indexProjectName: string | null;
    indexOrganizationName: string | null;
    indexConnectedAt: Date | null;
    indexRegion: string | null;
  };
}

/**
 * Disconnect response
 */
export interface IndexProviderDisconnectResponse {
  success: boolean;
  message: string;
  organization: {
    id: string;
    name: string;
    indexProvider: null;
    indexProjectId: null;
    indexProjectName: null;
    indexConnectedAt: null;
    indexRegion: null;
  };
}

/**
 * Index Provider Connection Service
 *
 * Manages organization connections to document index providers.
 */
export class IndexConnectionService {
  /**
   * Connect organization to a document index provider
   */
  async connect(
    request: IndexProviderConnectRequest,
    userId: string
  ): Promise<IndexProviderConnectResponse> {
    try {
      // Step 1: Verify user has admin access
      await organizationAuth.requireAdminAccess(userId, request.organizationId);

      // Step 2: Get current provider and credentials
      const providerType = getLlamaSdkProvider();
      const provider = providerFactory.getProvider();

      // Get user's email for credential selection (internal vs external key)
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      const credentials = getProviderCredentials(user?.email);

      // Step 3: Verify project access
      const verifiedProject = await provider.verifyProjectAccess(
        credentials,
        request.projectId
      );

      console.log(
        `Verified access to ${providerType} project: ${verifiedProject.name} (${verifiedProject.id})`
      );

      // Step 4: Store connection in database
      const updatedOrganization = await db.organization.update({
        where: { id: request.organizationId },
        data: {
          indexProvider: providerType,
          indexProjectId: request.projectId,
          indexProjectName: request.projectName,
          indexOrganizationName: request.organizationName || null,
          indexRegion: request.region || null,
          indexConnectedAt: new Date(),
        },
      });

      // Step 5: Return success response
      return {
        success: true,
        organization: {
          id: updatedOrganization.id,
          name: updatedOrganization.name,
          indexProvider: updatedOrganization.indexProvider,
          indexProjectId: updatedOrganization.indexProjectId,
          indexProjectName: updatedOrganization.indexProjectName,
          indexOrganizationName: updatedOrganization.indexOrganizationName,
          indexConnectedAt: updatedOrganization.indexConnectedAt,
          indexRegion: updatedOrganization.indexRegion,
        },
      };
    } catch (error) {
      if (error instanceof LlamaCloudConnectionError || error instanceof DatabaseError) {
        throw error;
      }
      throw new LlamaCloudConnectionError(
        `Failed to connect to document index provider: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Disconnect organization from document index provider
   */
  async disconnect(
    request: IndexProviderDisconnectRequest,
    userId: string
  ): Promise<IndexProviderDisconnectResponse> {
    try {
      // Step 1: Verify user has admin access
      await organizationAuth.requireAdminAccess(userId, request.organizationId);

      // Step 2: Clear connection from database
      const updatedOrganization = await db.organization.update({
        where: { id: request.organizationId },
        data: {
          indexProvider: null,
          indexProjectId: null,
          indexProjectName: null,
          indexOrganizationName: null,
          indexConnectedAt: null,
          indexRegion: null,
        },
      });

      // Step 3: Return success response
      return {
        success: true,
        message: 'Successfully disconnected from document index provider',
        organization: {
          id: updatedOrganization.id,
          name: updatedOrganization.name,
          indexProvider: null,
          indexProjectId: null,
          indexProjectName: null,
          indexConnectedAt: null,
          indexRegion: null,
        },
      };
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to disconnect from document index provider: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
}

// Export singleton instance
export const indexConnectionService = new IndexConnectionService();
