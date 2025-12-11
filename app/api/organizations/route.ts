import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { organizationService } from '@/lib/organization-service';
import { indexConnectionService } from '@/lib/services/index-connection-service';
import { getProviderCredentials } from '@/lib/env';
import { providerFactory } from '@/lib/providers/provider-factory';

export async function GET() {


  try {

    const currentUser = await organizationService.getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    const organizations = await db.organization.findMany({
      where: {
        organizationUsers: {
          some: {
            userId: currentUser.id
          }
        }
      },
      include: {
        organizationUsers: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              }
            }
          }
        },
        projects: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
          }
        },
        _count: {
          select: {
            projects: true,
            organizationUsers: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: organizations
    });
  } catch (error) {
    console.error('Failed to fetch organizations:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch organizations',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to fetch available projects from current provider
async function fetchProviderProjects(userEmail?: string) {
  try {
    const provider = providerFactory.getProvider();
    const credentials = getProviderCredentials(userEmail);

    // Fetch projects from current provider
    const projects = await provider.verifyCredentialsAndFetchProjects(credentials);

    return projects;
  } catch (error) {
    console.warn('Error fetching provider projects for auto-connection:', error);
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, slug, description } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name is required'
        },
        { status: 400 }
      );
    }

    // Get current authenticated user
    const currentUser = await organizationService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not authenticated'
        },
        { status: 401 }
      );
    }

    // Use the organization service to create organization and user relationship
    const organization = await organizationService.createOrganization(
      name,
      description || null,
      currentUser.id
    );

    // Attempt automatic provider connection if there's exactly one project
    let indexProviderConnectionResult = null;
    try {
      const availableProjects = await fetchProviderProjects(currentUser.email);

      if (availableProjects.length === 1) {
        const project = availableProjects[0];
        console.log(`Auto-connecting organization ${organization.id} to single project: ${project.name}`);

        indexProviderConnectionResult = await indexConnectionService.connect({
          organizationId: organization.id,
          projectId: project.id,
          projectName: project.name,
          organizationName: project.organizationName,
          region: project.region,
        }, currentUser.id);
      } else {
        console.log(`Skipping auto-connection: ${availableProjects.length} projects available`);
      }
    } catch (error) {
      // Don't fail the organization creation if provider connection fails
      console.warn('Auto-connection to document index provider failed:', error);
    }

    // Fetch the complete organization data with relationships for response
    const completeOrganization = await db.organization.findUnique({
      where: { id: organization.id },
      include: {
        organizationUsers: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              }
            }
          }
        },
        projects: true,
        _count: {
          select: {
            projects: true,
            organizationUsers: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: completeOrganization,
      indexProviderAutoConnected: !!indexProviderConnectionResult
    });
  } catch (error) {
    console.error('Failed to create organization:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create organization',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 