import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/middleware/api-handler';
import { z } from 'zod';
import { indexConnectionService } from '@/lib/services/index-connection-service';
import { organizationAuth } from '@/lib/services/organization-auth';

// Provider-agnostic disconnect request schema
const IndexProviderDisconnectRequestSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
});

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    // Parse and validate request body
    const body = await request.json();
    const validatedRequest = IndexProviderDisconnectRequestSchema.parse(body);

    // Get authenticated user
    const user = await organizationAuth.getAuthenticatedAdminUser(validatedRequest.organizationId);

    // Disconnect from document index provider using service layer
    const result = await indexConnectionService.disconnect(validatedRequest, user.id);

    // Log success
    console.log(`Successfully disconnected organization ${validatedRequest.organizationId} from document index provider`);

    return result;
  });
} 