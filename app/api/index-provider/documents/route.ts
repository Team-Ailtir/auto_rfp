import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/middleware/api-handler';
import { LlamaCloudDocumentsRequestSchema } from '@/lib/validators/llamacloud';
import { llamaCloudDocumentsService } from '@/lib/services/llamacloud-documents-service';
import { organizationAuth } from '@/lib/services/organization-auth';

export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    console.log('organizationId from /api/llamacloud/documents', organizationId)
    
    const validatedRequest = LlamaCloudDocumentsRequestSchema.parse({
      organizationId,
    });
    
    // Get authenticated user
    const user = await organizationAuth.getAuthenticatedMember(validatedRequest.organizationId);
      
    // Fetch documents using service layer
    const result = await llamaCloudDocumentsService.getDocuments(validatedRequest, user.id);
      
    // Log success
    console.log(`Successfully fetched ${result.documents.length} documents from ${result.pipelines.length} pipelines for organization ${validatedRequest.organizationId}`);
    
    return result;
  });
} 