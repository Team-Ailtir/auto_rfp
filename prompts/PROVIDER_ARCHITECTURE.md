# Provider Architecture Design

This document outlines the provider abstraction layer for document indexing and retrieval services in AutoRFP.

## Overview

The provider pattern allows AutoRFP to support multiple document indexing backends (LlamaCloud, Amazon Bedrock, etc.) through a unified interface. The active provider is configured via the `LLAMA_SDK_PROVIDER` environment variable.

## Architecture Principles

1. **Single Interface**: All providers implement the same interface
2. **Configuration-Based**: Provider selection via environment variable, no feature flags
3. **Provider-Agnostic Data Model**: Database schema stores provider type alongside provider-specific IDs
4. **Factory Pattern**: Services obtain provider instances through a factory
5. **Zero Business Logic Changes**: Service layer is unaware of which provider is active
6. **One Provider Per Organization**: Each organization connects to exactly one provider
7. **Environment-Based Credentials**: All credentials stored in environment variables (no per-org credentials)
8. **Single PR Migration**: Complete implementation before deployment to minimize risk

## Provider Interface

### Core Interface: `IDocumentIndexProvider`

```typescript
// lib/interfaces/document-index-provider.ts

export type ProviderType = 'llamacloud' | 'bedrock';

export interface ProviderCredentials {
  // LlamaCloud credentials
  apiKey?: string;

  // AWS Bedrock credentials
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;
  roleArn?: string;
}

export interface IndexProject {
  id: string;
  name: string;
  organizationName?: string;
  metadata?: Record<string, unknown>;
}

export interface IndexPipeline {
  id: string;
  name: string;
  projectId: string;
  status?: string;
  documentCount?: number;
  metadata?: Record<string, unknown>;
}

export interface IndexDocument {
  id: string;
  name: string;
  pipelineId: string;
  status?: string;
  uploadedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface ProviderConfig {
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  region?: string;
}

/**
 * Common interface for all document indexing providers
 */
export interface IDocumentIndexProvider {
  /**
   * Get the provider type identifier
   */
  getProviderType(): ProviderType;

  /**
   * Verify credentials and fetch available projects/knowledge bases
   */
  verifyCredentialsAndFetchProjects(credentials: ProviderCredentials): Promise<IndexProject[]>;

  /**
   * Verify access to a specific project/knowledge base
   */
  verifyProjectAccess(credentials: ProviderCredentials, projectId: string): Promise<IndexProject>;

  /**
   * Fetch indexes/pipelines/data sources for a project
   */
  fetchPipelinesForProject(
    credentials: ProviderCredentials,
    projectId: string
  ): Promise<IndexPipeline[]>;

  /**
   * Fetch documents for a specific pipeline/data source
   */
  fetchDocumentsForPipeline(
    credentials: ProviderCredentials,
    pipelineId: string
  ): Promise<IndexDocument[]>;

  /**
   * Create a retriever instance for querying
   * Returns provider-specific retriever that works with LlamaIndex SDK
   */
  createRetriever(
    credentials: ProviderCredentials,
    projectId: string,
    indexIds: string[]
  ): Promise<unknown>; // Returns LlamaIndex retriever type
}
```

## Database Schema Changes

### Provider-Agnostic Schema

```prisma
model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Provider-agnostic connection info
  indexProvider         String?   // 'llamacloud' | 'bedrock'
  indexProjectId        String?   // Provider-specific project/KB ID
  indexProjectName      String?   // Human-readable name
  indexOrganizationName String?   // Provider organization name (if applicable)
  indexConnectedAt      DateTime? // Connection timestamp
  indexRegion           String?   // AWS region (for bedrock), null for llamacloud

  // Relationships
  projects          Project[]
  organizationUsers OrganizationUser[]
  knowledgeBases    KnowledgeBase[]

  @@map("organizations")
}

model ProjectIndex {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Provider-agnostic index information
  indexId   String // Pipeline ID (LlamaCloud) or Data Source ID (Bedrock)
  indexName String // Human-readable name

  // Foreign key
  projectId String

  // Relationships
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, indexId])
  @@index([projectId])
  @@map("project_indexes")
}
```

**Migration Strategy:**
- Rename existing fields: `llamaCloudProjectId` → `indexProjectId`, etc.
- Add `indexProvider` field (default to 'llamacloud' for existing data)
- Existing data continues to work with the renamed fields

## Provider Implementations

### 1. LlamaCloud Provider

```typescript
// lib/providers/llamacloud-provider.ts

import { IDocumentIndexProvider, ProviderType, /* ... */ } from '@/lib/interfaces/document-index-provider';
import { LlamaCloudIndex } from 'llamaindex';

export class LlamaCloudProvider implements IDocumentIndexProvider {
  private config: ProviderConfig;

  constructor(config: Partial<ProviderConfig> = {}) {
    this.config = {
      baseUrl: 'https://api.cloud.llamaindex.ai/api/v1',
      timeout: 30000,
      retryAttempts: 3,
      ...config,
    };
  }

  getProviderType(): ProviderType {
    return 'llamacloud';
  }

  async verifyCredentialsAndFetchProjects(
    credentials: ProviderCredentials
  ): Promise<IndexProject[]> {
    // Implementation similar to current llamacloud-client.ts
    // Maps LlamaCloudProject → IndexProject
  }

  async verifyProjectAccess(
    credentials: ProviderCredentials,
    projectId: string
  ): Promise<IndexProject> {
    // Current implementation
  }

  async fetchPipelinesForProject(
    credentials: ProviderCredentials,
    projectId: string
  ): Promise<IndexPipeline[]> {
    // Maps LlamaCloudPipeline → IndexPipeline
  }

  async fetchDocumentsForPipeline(
    credentials: ProviderCredentials,
    pipelineId: string
  ): Promise<IndexDocument[]> {
    // Maps LlamaCloudFile → IndexDocument
  }

  async createRetriever(
    credentials: ProviderCredentials,
    projectId: string,
    indexIds: string[]
  ): Promise<unknown> {
    // Create LlamaCloudIndex instances for each indexId
    const indexes = indexIds.map(indexId =>
      new LlamaCloudIndex({
        name: indexId,
        projectName: projectId,
        apiKey: credentials.apiKey,
      })
    );

    return indexes; // Or wrap in multi-index retriever
  }
}
```

### 2. Bedrock Provider

```typescript
// lib/providers/bedrock-provider.ts

import { IDocumentIndexProvider, ProviderType, /* ... */ } from '@/lib/interfaces/document-index-provider';
import { BedrockKnowledgeBaseRetriever } from 'llamaindex';
import {
  BedrockAgentClient,
  ListKnowledgeBasesCommand,
  ListDataSourcesCommand,
} from '@aws-sdk/client-bedrock-agent';

export class BedrockProvider implements IDocumentIndexProvider {
  private config: ProviderConfig;

  constructor(config: Partial<ProviderConfig> = {}) {
    this.config = {
      region: 'us-east-1',
      timeout: 30000,
      retryAttempts: 3,
      ...config,
    };
  }

  getProviderType(): ProviderType {
    return 'bedrock';
  }

  async verifyCredentialsAndFetchProjects(
    credentials: ProviderCredentials
  ): Promise<IndexProject[]> {
    const client = this.createBedrockClient(credentials);

    const command = new ListKnowledgeBasesCommand({});
    const response = await client.send(command);

    return (response.knowledgeBaseSummaries || []).map(kb => ({
      id: kb.knowledgeBaseId!,
      name: kb.name!,
      metadata: {
        status: kb.status,
        description: kb.description,
      },
    }));
  }

  async verifyProjectAccess(
    credentials: ProviderCredentials,
    projectId: string
  ): Promise<IndexProject> {
    const projects = await this.verifyCredentialsAndFetchProjects(credentials);
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      throw new Error('Knowledge Base not found or not accessible');
    }

    return project;
  }

  async fetchPipelinesForProject(
    credentials: ProviderCredentials,
    projectId: string // knowledgeBaseId
  ): Promise<IndexPipeline[]> {
    const client = this.createBedrockClient(credentials);

    const command = new ListDataSourcesCommand({
      knowledgeBaseId: projectId,
    });
    const response = await client.send(command);

    return (response.dataSourceSummaries || []).map(ds => ({
      id: ds.dataSourceId!,
      name: ds.name!,
      projectId: projectId,
      status: ds.status,
      metadata: {
        description: ds.description,
      },
    }));
  }

  async fetchDocumentsForPipeline(
    credentials: ProviderCredentials,
    pipelineId: string // dataSourceId
  ): Promise<IndexDocument[]> {
    // Bedrock doesn't expose individual document listing via API
    // Return empty array or fetch from S3 directly if needed
    return [];
  }

  async createRetriever(
    credentials: ProviderCredentials,
    projectId: string, // knowledgeBaseId
    indexIds: string[] // dataSourceIds (optional filter)
  ): Promise<unknown> {
    // Create BedrockKnowledgeBaseRetriever
    const retriever = new BedrockKnowledgeBaseRetriever({
      knowledgeBaseId: projectId,
      region: credentials.awsRegion || this.config.region,
      // Note: indexIds (dataSourceIds) filtering may need custom implementation
      retrievalConfiguration: {
        vectorSearchConfiguration: {
          numberOfResults: 10,
        },
      },
    });

    return retriever;
  }

  private createBedrockClient(credentials: ProviderCredentials) {
    return new BedrockAgentClient({
      region: credentials.awsRegion || this.config.region,
      credentials: {
        accessKeyId: credentials.awsAccessKeyId!,
        secretAccessKey: credentials.awsSecretAccessKey!,
      },
    });
  }
}
```

## Provider Factory

```typescript
// lib/providers/provider-factory.ts

import { IDocumentIndexProvider } from '@/lib/interfaces/document-index-provider';
import { LlamaCloudProvider } from '@/lib/providers/llamacloud-provider';
import { BedrockProvider } from '@/lib/providers/bedrock-provider';
import { getLlamaSdkProvider } from '@/lib/env';

class ProviderFactory {
  private providers: Map<string, IDocumentIndexProvider> = new Map();

  /**
   * Get provider instance based on configuration
   */
  getProvider(): IDocumentIndexProvider {
    const providerType = getLlamaSdkProvider();

    // Return cached instance if available
    if (this.providers.has(providerType)) {
      return this.providers.get(providerType)!;
    }

    // Create new provider instance
    let provider: IDocumentIndexProvider;

    switch (providerType) {
      case 'llamacloud':
        provider = new LlamaCloudProvider();
        break;
      case 'bedrock':
        provider = new BedrockProvider();
        break;
      default:
        throw new Error(`Unsupported provider: ${providerType}`);
    }

    // Cache and return
    this.providers.set(providerType, provider);
    return provider;
  }

  /**
   * Clear provider cache (useful for testing)
   */
  clearCache(): void {
    this.providers.clear();
  }
}

// Export singleton instance
export const providerFactory = new ProviderFactory();
```

## Environment Configuration

```typescript
// lib/env.ts

export type LlamaSdkProvider = 'llamacloud' | 'bedrock';

export function getLlamaSdkProvider(): LlamaSdkProvider {
  const provider = process.env.LLAMA_SDK_PROVIDER || 'llamacloud';

  if (provider !== 'llamacloud' && provider !== 'bedrock') {
    throw new Error(
      `Invalid LLAMA_SDK_PROVIDER: ${provider}. Must be 'llamacloud' or 'bedrock'`
    );
  }

  return provider as LlamaSdkProvider;
}

export function getProviderCredentials(userEmail: string): ProviderCredentials {
  const provider = getLlamaSdkProvider();

  switch (provider) {
    case 'llamacloud':
      return {
        apiKey: getLlamaCloudApiKey(userEmail),
      };

    case 'bedrock':
      return {
        awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
        awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        awsRegion: process.env.AWS_REGION || 'us-east-1',
        roleArn: process.env.BEDROCK_KNOWLEDGE_BASE_ROLE_ARN,
      };

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
```

### Environment Variables

```bash
# Provider selection
LLAMA_SDK_PROVIDER=llamacloud  # or 'bedrock'

# LlamaCloud credentials (when LLAMA_SDK_PROVIDER=llamacloud)
LLAMACLOUD_API_KEY=llx-...
LLAMACLOUD_API_KEY_INTERNAL=llx-...  # Optional
INTERNAL_EMAIL_DOMAIN=@runllama.ai   # Optional

# AWS Bedrock credentials (when LLAMA_SDK_PROVIDER=bedrock)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
BEDROCK_KNOWLEDGE_BASE_ROLE_ARN=arn:aws:iam::...  # Optional
```

## Service Layer Updates

### Connection Service

```typescript
// lib/services/index-connection-service.ts (renamed from llamacloud-connection-service.ts)

import { providerFactory } from '@/lib/providers/provider-factory';
import { getProviderCredentials } from '@/lib/env';

export class IndexConnectionService {
  async connectToIndexProvider(organizationId: string, projectId: string, userId: string) {
    const provider = providerFactory.getProvider();
    const credentials = getProviderCredentials(user.email);

    // Verify access
    const project = await provider.verifyProjectAccess(credentials, projectId);

    // Update organization with provider info
    await db.organization.update({
      where: { id: organizationId },
      data: {
        indexProvider: provider.getProviderType(),
        indexProjectId: project.id,
        indexProjectName: project.name,
        indexOrganizationName: project.organizationName,
        indexConnectedAt: new Date(),
        indexRegion: credentials.awsRegion, // Only set for Bedrock
      },
    });

    return { success: true, project };
  }

  async disconnectFromIndexProvider(organizationId: string, userId: string) {
    await db.organization.update({
      where: { id: organizationId },
      data: {
        indexProvider: null,
        indexProjectId: null,
        indexProjectName: null,
        indexOrganizationName: null,
        indexConnectedAt: null,
        indexRegion: null,
      },
    });

    return { success: true };
  }
}
```

### Response Generation Service

```typescript
// lib/services/response-generation-service.ts

import { providerFactory } from '@/lib/providers/provider-factory';
import { getProviderCredentials } from '@/lib/env';

export class ResponseGenerationService {
  async generateResponse(request: GenerateResponseRequest) {
    // ... authorization checks ...

    const provider = providerFactory.getProvider();
    const credentials = getProviderCredentials(currentUser.email);

    // Get retriever from provider
    const retriever = await provider.createRetriever(
      credentials,
      project.organization.indexProjectId,
      selectedIndexIds
    );

    // Use retriever with existing LlamaIndex query logic
    // The rest of the logic remains the same!
  }
}
```

## API Routes Updates

### Rename Routes to be Provider-Agnostic

```typescript
// OLD: app/api/llamacloud/*
// NEW: app/api/index-provider/*

// app/api/index-provider/projects/route.ts
export async function GET(request: NextRequest) {
  const provider = providerFactory.getProvider();
  const credentials = getProviderCredentials(user.email);

  const projects = await provider.verifyCredentialsAndFetchProjects(credentials);

  return NextResponse.json({ projects });
}

// app/api/index-provider/connect/route.ts
export async function POST(request: NextRequest) {
  const provider = providerFactory.getProvider();
  // ... connection logic ...
}
```

## UI Component Updates

### Provider-Agnostic Terminology

```typescript
// components/organizations/ConnectionStatus.tsx

function ConnectionStatus({ organization }) {
  if (!organization.indexConnectedAt) {
    return <div>Not connected to document index</div>;
  }

  const providerLabel = organization.indexProvider === 'bedrock'
    ? 'Amazon Bedrock Knowledge Base'
    : 'LlamaCloud Project';

  return (
    <div>
      Connected to {providerLabel}: {organization.indexProjectName}
      {organization.indexRegion && ` (${organization.indexRegion})`}
    </div>
  );
}
```

## Benefits of This Architecture

1. **Clean Separation**: Business logic completely separated from provider implementation
2. **Easy Provider Switching**: Change one environment variable to switch providers
3. **Extensible**: Adding new providers (OpenSearch, Pinecone, etc.) is straightforward
4. **Testable**: Easy to mock providers for testing
5. **Type-Safe**: Full TypeScript support across all providers
6. **Zero Code Duplication**: Shared interface prevents redundant code
7. **Provider-Specific Features**: Metadata field allows provider-specific data without breaking interface

## Migration Path

1. Create interface and factory (no breaking changes)
2. Refactor LlamaCloud client to implement interface
3. Update database schema with backwards-compatible changes
4. Update services to use factory (transparent change)
5. Implement Bedrock provider
6. Test with both providers
7. Update documentation
8. Deploy with `LLAMA_SDK_PROVIDER=llamacloud` (existing behavior)
9. Switch to Bedrock when ready via config change

## Adding New Providers

To add a new provider (e.g., Pinecone, Qdrant):

1. Implement `IDocumentIndexProvider` interface
2. Add provider type to union: `type ProviderType = 'llamacloud' | 'bedrock' | 'pinecone'`
3. Update factory with new case
4. Add credentials handling in `getProviderCredentials()`
5. Add environment variable documentation
6. Done! No changes needed in service layer or UI.
