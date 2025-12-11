import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/middleware/api-handler';
import { LlamaCloudConnectRequestSchema } from '@/lib/validators/llamacloud';
import { llamaCloudConnectionService } from '@/lib/services/llamacloud-connection-service';
import { organizationAuth } from '@/lib/services/organization-auth';

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    // Parse and validate request body
    const body = await request.json();
    const validatedRequest = LlamaCloudConnectRequestSchema.parse(body);
    
    // Get authenticated user
    const user = await organizationAuth.getAuthenticatedAdminUser(validatedRequest.organizationId);
    
    // Connect to LlamaCloud using service layer
    const result = await llamaCloudConnectionService.connectToLlamaCloud(validatedRequest, user.id);
    
    // Log success
    console.log(`Successfully connected organization ${validatedRequest.organizationId} to LlamaCloud project ${validatedRequest.projectName}`);
    
    return result;
  });
} 