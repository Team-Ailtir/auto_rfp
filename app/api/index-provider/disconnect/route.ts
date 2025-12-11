import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/middleware/api-handler';
import { LlamaCloudDisconnectRequestSchema } from '@/lib/validators/llamacloud';
import { llamaCloudConnectionService } from '@/lib/services/llamacloud-connection-service';
import { organizationAuth } from '@/lib/services/organization-auth';

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    // Parse and validate request body
    const body = await request.json();
    const validatedRequest = LlamaCloudDisconnectRequestSchema.parse(body);
    
    // Get authenticated user
    const user = await organizationAuth.getAuthenticatedAdminUser(validatedRequest.organizationId);
    
    // Disconnect from LlamaCloud using service layer
    const result = await llamaCloudConnectionService.disconnectFromLlamaCloud(validatedRequest, user.id);
    
    // Log success
    console.log(`Successfully disconnected organization ${validatedRequest.organizationId} from LlamaCloud`);
    
    return result;
  });
} 