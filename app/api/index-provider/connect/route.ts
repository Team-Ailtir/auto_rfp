import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/middleware/api-handler';
import { IndexProviderConnectRequestSchema } from '@/lib/validators/index-provider';
import { indexConnectionService } from '@/lib/services/index-connection-service';
import { organizationAuth } from '@/lib/services/organization-auth';
import { getLlamaSdkProvider } from '@/lib/env';

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