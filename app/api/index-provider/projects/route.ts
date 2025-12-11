import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/middleware/api-handler';
import { getProviderCredentials, getLlamaSdkProvider } from '@/lib/env';
import { organizationService } from '@/lib/organization-service';
import { providerFactory } from '@/lib/providers/provider-factory';

export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    try {
      // Get current user to determine credentials
      const currentUser = await organizationService.getCurrentUser();

      // Get provider and credentials
      const provider = providerFactory.getProvider();
      const credentials = getProviderCredentials(currentUser?.email);
      const providerType = getLlamaSdkProvider();

      // Fetch projects from current provider
      const projects = await provider.verifyCredentialsAndFetchProjects(credentials);

      console.log(`Successfully fetched ${projects.length} projects from ${providerType}`);

      return {
        success: true,
        projects,
      };
    } catch (error) {
      console.error('Error fetching projects from document index provider:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch projects from document index provider',
          details: error instanceof Error ? error.message : 'Unknown error'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  });
} 