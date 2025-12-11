import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/middleware/api-handler';
import { z } from 'zod';
import { indexConnectionService } from '@/lib/services/index-connection-service';
import { organizationAuth } from '@/lib/services/organization-auth';
import { getLlamaSdkProvider } from '@/lib/env';

// Provider-agnostic connect request schema
const IndexProviderConnectRequestSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  projectId: z.string().min(1, 'Project ID is required'),
  projectName: z.string().min(1, 'Project name is required'),
  organizationName: z.string().optional(),
  region: z.string().optional(), // For AWS Bedrock
});

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    // Parse and validate request body
    const body = await request.json();
    const validatedRequest = IndexProviderConnectRequestSchema.parse(body);

    // Get authenticated user
    const user = await organizationAuth.getAuthenticatedAdminUser(validatedRequest.organizationId);

    // Get current provider type for logging
    const providerType = getLlamaSdkProvider();

    // Connect to document index provider using service layer
    const result = await indexConnectionService.connect(validatedRequest, user.id);

    // Log success
    console.log(
      `Successfully connected organization ${validatedRequest.organizationId} to ${providerType} project ${validatedRequest.projectName}`
    );

    return result;
  });
} 