import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/middleware/api-handler';
import { IndexProviderDocumentsRequestSchema } from '@/lib/validators/index-provider';
import { indexDocumentsService } from '@/lib/services/index-documents-service';
import { organizationAuth } from '@/lib/services/organization-auth';

export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    const validatedRequest = IndexProviderDocumentsRequestSchema.parse({
      organizationId,
    });

    // Get authenticated user
    const user = await organizationAuth.getAuthenticatedMember(validatedRequest.organizationId);

    // Fetch documents using service layer
    const result = await indexDocumentsService.getDocuments(validatedRequest, user.id);

    // Log success
    console.log(
      `Successfully fetched ${result.documents.length} documents from ${result.pipelines.length} pipelines for organization ${validatedRequest.organizationId}`
    );

    return result;
  });
} 