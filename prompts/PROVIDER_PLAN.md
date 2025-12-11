# Provider Architecture Implementation Plan

This document outlines the step-by-step implementation plan for introducing the provider abstraction layer to AutoRFP.

## Project Goals

1. Abstract document indexing providers behind a unified interface
2. Support both LlamaCloud and Amazon Bedrock Knowledge Bases
3. Allow provider switching via environment variable (`LLAMA_SDK_PROVIDER`)
4. Maintain backwards compatibility during migration
5. Deploy everything in a single, well-tested PR

## Key Decisions

Based on clarifying questions, the following architectural decisions have been made:

### 1. API Route Naming
**Decision**: Use `/api/index-provider/*`

**Rationale**: Generic and accurate - emphasizes it's about the indexing provider without being tied to a specific implementation.

**Routes to rename**:
- `/api/llamacloud/projects` → `/api/index-provider/projects`
- `/api/llamacloud/connect` → `/api/index-provider/connect`
- `/api/llamacloud/disconnect` → `/api/index-provider/disconnect`
- `/api/llamacloud/documents` → `/api/index-provider/documents`

### 2. Multi-Provider Support
**Decision**: One provider per organization

**Rationale**: Simpler implementation and data model. Organizations connect to either LlamaCloud OR Bedrock, not both simultaneously. Can switch by disconnecting and reconnecting.

**Implementation**: Organization table stores single provider connection with `indexProvider` field.

### 3. Credential Management
**Decision**: Environment variables only

**Rationale**: Simple, secure, and sufficient for current needs. No per-organization credentials, no encryption key management complexity.

**Implementation**:
- Credentials stored in `.env`
- Shared across all organizations
- Provider selection via `LLAMA_SDK_PROVIDER` env var

### 4. Migration Strategy
**Decision**: Implement everything, then migrate in one PR

**Rationale**: Lower risk of breaking changes, thorough testing before deployment, cleaner git history.

**Implementation**:
- Complete all development in feature branch
- Comprehensive testing with both providers
- Single PR for review
- Deploy all at once

## Implementation Phases

### Task 0.0: Pre-Flight Verification

**Purpose**: Verify external dependencies before starting implementation to avoid blocking issues.

**Deliverables**:

1. **Verify Bedrock SDK Compatibility**:
```typescript
// Create: scratch/verify-bedrock-sdk.ts
import { BedrockKnowledgeBaseRetriever } from 'llamaindex';
import { BedrockAgentClient, ListKnowledgeBasesCommand } from '@aws-sdk/client-bedrock-agent';

// Test 1: Verify BedrockKnowledgeBaseRetriever exists
console.log('BedrockKnowledgeBaseRetriever:', typeof BedrockKnowledgeBaseRetriever);

// Test 2: Verify AWS SDK works
const client = new BedrockAgentClient({ region: 'us-east-1' });
console.log('BedrockAgentClient created successfully');

// Document: Actual API for creating retriever
const exampleUsage = `
const retriever = new BedrockKnowledgeBaseRetriever({
  knowledgeBaseId: 'kb-xxx',
  region: 'us-east-1',
  // Document actual parameters here
});
`;
```

2. **Install Required Packages**:
```bash
pnpm add @aws-sdk/client-bedrock-agent
# Verify llamaindex version supports Bedrock
pnpm list llamaindex
```

3. **Document Findings**:
   - Does `BedrockKnowledgeBaseRetriever` exist in current llamaindex version?
   - What are the actual constructor parameters?
   - Any version incompatibilities?
   - Alternative approaches if retriever doesn't exist

**Success Criteria**:
- Confirmed Bedrock retriever API or documented alternative approach
- All required packages installable
- No blocking version conflicts

**Time Estimate**: 30-60 minutes

---

### Phase 0: Establish Test Baseline (Tasks 0.1-0.7)

**Purpose**: Create a baseline test suite that documents current behavior before refactoring. This ensures the provider abstraction doesn't break existing functionality.

**Testing Framework**: Vitest with TypeScript
**Database Testing**: Mocked Prisma Client (fast, no database setup)
**Coverage Target**: 50%+ coverage on critical paths
**Coverage Tool**: Vitest built-in coverage (v8 provider)

**Testing Strategy**: Mock Prisma at the database boundary. Focus on business logic validation rather than database behavior. This is appropriate because:
- The refactor changes provider abstraction, not database schema
- Tests run in milliseconds (important for TDD during refactor)
- Avoids SQLite vs PostgreSQL differences
- Sufficient coverage for the scope of this refactor

---

#### Task 0.1: Configure Vitest and Test Infrastructure

**Files to Create**:
- `vitest.config.ts` - Vitest configuration
- `vitest.setup.ts` - Global test setup
- `.env.test` - Test environment variables
- `lib/test-utils/` - Test utilities directory

**Dependencies to Add**:
```bash
pnpm add -D vitest @vitest/ui @vitest/coverage-v8
pnpm add -D @testing-library/react @testing-library/jest-dom
pnpm add -D vitest-mock-extended  # For mocking Prisma client
```

**Vitest Configuration** (`vitest.config.ts`):
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: [
        'lib/**/*.ts',
        'lib/**/*.tsx',
        'app/api/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/node_modules/**',
        '**/dist/**',
        '**/.next/**',
        '**/coverage/**',
      ],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 45,
        statements: 50,
      },
    },
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

**Global Setup** (`vitest.setup.ts`):
```typescript
import { beforeEach, vi } from 'vitest';
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LLAMA_SDK_PROVIDER = 'llamacloud';
process.env.LLAMACLOUD_API_KEY = 'test-key-123';

// Create mock Prisma client
export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

// Mock the db module
vi.mock('@/lib/db', () => ({
  db: prismaMock,
}));

// Reset mocks between tests
beforeEach(() => {
  mockReset(prismaMock);
});
```

**Note**: This approach mocks Prisma at the database boundary. Tests will validate business logic without actually touching a database. This is appropriate for Phase 0 because:
- We're testing that the current code works, not the database schema
- The refactor doesn't change database behavior
- Tests run instantly (important for TDD during refactor)
- We avoid PostgreSQL vs SQLite differences

**Package.json Scripts**:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:run": "vitest run"
  }
}
```

**Success Criteria**:
- `pnpm test` runs successfully
- Coverage reports generate in terminal and HTML

---

#### Task 0.2: Test Utility Functions and Validators

**Files to Create**:
- `lib/validators/__tests__/llamacloud.test.ts`
- `lib/env.test.ts`
- `lib/test-utils/factories.ts` - Test data factories

**Test Coverage Areas**:

1. **Zod Validators** (`lib/validators/llamacloud.test.ts`):
```typescript
import { describe, it, expect } from 'vitest';
import {
  LlamaCloudProjectSchema,
  LlamaCloudPipelineSchema,
  LlamaCloudConnectRequestSchema,
} from '../llamacloud';

describe('LlamaCloud Validators', () => {
  describe('LlamaCloudProjectSchema', () => {
    it('should validate correct project data', () => {
      const validProject = {
        id: 'proj_123',
        name: 'Test Project',
      };

      expect(() => LlamaCloudProjectSchema.parse(validProject)).not.toThrow();
    });

    it('should reject missing required fields', () => {
      const invalidProject = { name: 'Test Project' };

      expect(() => LlamaCloudProjectSchema.parse(invalidProject)).toThrow();
    });
  });

  describe('LlamaCloudPipelineSchema', () => {
    it('should validate pipeline with all fields', () => {
      const validPipeline = {
        id: 'pipe_123',
        name: 'Test Pipeline',
        project_id: 'proj_123',
      };

      const result = LlamaCloudPipelineSchema.parse(validPipeline);
      expect(result).toEqual(validPipeline);
    });
  });
});
```

2. **Environment Configuration** (`lib/env.test.ts`):
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getLlamaCloudApiKey } from './env';

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getLlamaCloudApiKey', () => {
    it('should return regular API key for non-internal email', () => {
      process.env.LLAMACLOUD_API_KEY = 'regular-key';

      const apiKey = getLlamaCloudApiKey('user@external.com');

      expect(apiKey).toBe('regular-key');
    });

    it('should return internal API key for internal email', () => {
      process.env.LLAMACLOUD_API_KEY = 'regular-key';
      process.env.LLAMACLOUD_API_KEY_INTERNAL = 'internal-key';
      process.env.INTERNAL_EMAIL_DOMAIN = '@runllama.ai';

      const apiKey = getLlamaCloudApiKey('user@runllama.ai');

      expect(apiKey).toBe('internal-key');
    });

    it('should throw error when API key is missing', () => {
      delete process.env.LLAMACLOUD_API_KEY;

      expect(() => getLlamaCloudApiKey('user@test.com')).toThrow();
    });
  });
});
```

3. **Test Factories** (`lib/test-utils/factories.ts`):
```typescript
import { Organization, Project, User } from '@prisma/client';

export const userFactory = (overrides: Partial<User> = {}): User => ({
  id: 'user_test_123',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const organizationFactory = (overrides: Partial<Organization> = {}): Organization => ({
  id: 'org_test_123',
  name: 'Test Organization',
  slug: 'test-org',
  description: 'Test organization description',
  llamaCloudProjectId: null,
  llamaCloudProjectName: null,
  llamaCloudOrgName: null,
  llamaCloudConnectedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const projectFactory = (overrides: Partial<Project> = {}): Project => ({
  id: 'proj_test_123',
  name: 'Test Project',
  description: 'Test project description',
  summary: null,
  eligibility: [],
  organizationId: 'org_test_123',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
```

**Success Criteria**: All validator and utility tests pass

---

#### Task 0.3: Test LlamaCloud Client

**File to Create**: `lib/services/__tests__/llamacloud-client.test.ts`

**Test Coverage**:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LlamaCloudClient } from '../llamacloud-client';
import { LlamaCloudConnectionError } from '@/lib/errors/api-errors';

describe('LlamaCloudClient', () => {
  let client: LlamaCloudClient;

  beforeEach(() => {
    client = new LlamaCloudClient();
    global.fetch = vi.fn();
  });

  describe('verifyApiKeyAndFetchProjects', () => {
    it('should fetch projects with valid API key', async () => {
      const mockProjects = [
        { id: 'proj_1', name: 'Project 1' },
        { id: 'proj_2', name: 'Project 2' },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
      });

      const result = await client.verifyApiKeyAndFetchProjects('valid-key');

      expect(result).toEqual(mockProjects);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-key',
          }),
        })
      );
    });

    it('should throw error for invalid API key', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(
        client.verifyApiKeyAndFetchProjects('invalid-key')
      ).rejects.toThrow(LlamaCloudConnectionError);
    });

    it('should retry on network errors', async () => {
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const result = await client.verifyApiKeyAndFetchProjects('valid-key');

      expect(result).toEqual([]);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('fetchPipelinesForProject', () => {
    it('should fetch and filter pipelines by project ID', async () => {
      const mockPipelines = [
        { id: 'pipe_1', name: 'Pipeline 1', project_id: 'proj_1' },
        { id: 'pipe_2', name: 'Pipeline 2', project_id: 'proj_2' },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPipelines,
      });

      const result = await client.fetchPipelinesForProject('key', 'proj_1');

      expect(result).toEqual([mockPipelines[0]]);
    });
  });
});
```

**Success Criteria**: LlamaCloud client tests pass with good coverage

---

#### Task 0.4: Test Service Layer with Mocked Database

**Files to Create**:
- `lib/organization-service.test.ts`
- `lib/project-service.test.ts`

**Organization Service Tests** (`lib/organization-service.test.ts`):
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { organizationService } from './organization-service';
import { prismaMock } from '../vitest.setup';
import { userFactory, organizationFactory } from './test-utils/factories';

describe('OrganizationService', () => {
  describe('isUserOrganizationMember', () => {
    it('should return true for organization member', async () => {
      const user = userFactory();
      const org = organizationFactory();

      // Mock the database response
      prismaMock.organizationUser.findUnique.mockResolvedValue({
        id: 'ou_123',
        userId: user.id,
        organizationId: org.id,
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const isMember = await organizationService.isUserOrganizationMember(
        user.id,
        org.id
      );

      expect(isMember).toBe(true);
      expect(prismaMock.organizationUser.findUnique).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: org.id,
          },
        },
      });
    });

    it('should return false for non-member', async () => {
      const org = organizationFactory();

      // Mock null response (no membership found)
      prismaMock.organizationUser.findUnique.mockResolvedValue(null);

      const isMember = await organizationService.isUserOrganizationMember(
        'non-existent-user',
        org.id
      );

      expect(isMember).toBe(false);
    });
  });

  describe('getUserOrganizationRole', () => {
    it('should return correct role for user', async () => {
      const user = userFactory();
      const org = organizationFactory();

      prismaMock.organizationUser.findUnique.mockResolvedValue({
        id: 'ou_123',
        userId: user.id,
        organizationId: org.id,
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const role = await organizationService.getUserOrganizationRole(
        user.id,
        org.id
      );

      expect(role).toBe('owner');
    });

    it('should return null for non-member', async () => {
      const org = organizationFactory();

      prismaMock.organizationUser.findUnique.mockResolvedValue(null);

      const role = await organizationService.getUserOrganizationRole(
        'non-existent-user',
        org.id
      );

      expect(role).toBeNull();
    });
  });
});
```

**Success Criteria**: Service tests pass with mocked database operations

---

#### Task 0.5: Test Organization Authorization

**File to Create**: `lib/services/__tests__/organization-auth.test.ts`

**Test Coverage**:
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { organizationAuth } from '../organization-auth';
import { seedTestDatabase, cleanDatabase } from '@/lib/test-utils/db-helpers';
import { AuthorizationError, ForbiddenError } from '@/lib/errors/api-errors';

// Mock Supabase
vi.mock('@/lib/utils/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
  })),
}));

describe('OrganizationAuth', () => {
  describe('getAuthenticatedMember', () => {
    it('should return user if authenticated and member', async () => {
      const user = userFactory();
      const org = organizationFactory();

      // Mock organization membership
      prismaMock.organizationUser.findUnique.mockResolvedValue({
        id: 'ou_123',
        userId: user.id,
        organizationId: org.id,
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock authenticated user
      const { createClient } = await import('@/lib/utils/supabase/server');
      (createClient as any).mockReturnValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValueOnce({
            data: { user: { id: user.id } },
            error: null,
          }),
        },
      });

      const result = await organizationAuth.getAuthenticatedMember(org.id);

      expect(result.id).toBe(user.id);
    });

    it('should throw AuthorizationError if not authenticated', async () => {
      const org = organizationFactory();

      // Mock no user
      const { createClient } = await import('@/lib/utils/supabase/server');
      (createClient as any).mockReturnValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValueOnce({
            data: { user: null },
            error: null,
          }),
        },
      });

      await expect(
        organizationAuth.getAuthenticatedMember(org.id)
      ).rejects.toThrow(AuthorizationError);
    });

    it('should throw ForbiddenError if not a member', async () => {
      const org = organizationFactory();

      // Mock no membership found
      prismaMock.organizationUser.findUnique.mockResolvedValue(null);

      // Mock different user
      const { createClient } = await import('@/lib/utils/supabase/server');
      (createClient as any).mockReturnValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValueOnce({
            data: { user: { id: 'different-user-id' } },
            error: null,
          }),
        },
      });

      await expect(
        organizationAuth.getAuthenticatedMember(org.id)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getAuthenticatedAdminUser', () => {
    it('should return user if admin', async () => {
      const user = userFactory();
      const org = organizationFactory();

      // Mock admin membership
      prismaMock.organizationUser.findUnique.mockResolvedValue({
        id: 'ou_123',
        userId: user.id,
        organizationId: org.id,
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { createClient } = await import('@/lib/utils/supabase/server');
      (createClient as any).mockReturnValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValueOnce({
            data: { user: { id: user.id } },
            error: null,
          }),
        },
      });

      const result = await organizationAuth.getAuthenticatedAdminUser(org.id);

      expect(result.id).toBe(user.id);
    });

    it('should throw ForbiddenError if only member', async () => {
      const user = userFactory();
      const org = organizationFactory();

      // Mock member role (not admin)
      prismaMock.organizationUser.findUnique.mockResolvedValue({
        id: 'ou_123',
        userId: user.id,
        organizationId: org.id,
        role: 'member',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { createClient } = await import('@/lib/utils/supabase/server');
      (createClient as any).mockReturnValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValueOnce({
            data: { user: { id: user.id } },
            error: null,
          }),
        },
      });

      await expect(
        organizationAuth.getAuthenticatedAdminUser(org.id)
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
```

**Success Criteria**: Authorization logic tests pass

---

#### Task 0.6: Test Response Generation Service (Core Logic Only)

**File to Create**: `lib/services/__tests__/response-generation-service.test.ts`

**Focus**: Test pure logic without external API calls

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ResponseGenerationService } from '../response-generation-service';
import { seedTestDatabase, cleanDatabase } from '@/lib/test-utils/db-helpers';
import { NotFoundError, ForbiddenError, LlamaCloudConnectionError } from '@/lib/errors/api-errors';

// Mock external dependencies
vi.mock('@/lib/llama-index-service');
vi.mock('@/lib/utils/supabase/server');

describe('ResponseGenerationService', () => {
  let service: ResponseGenerationService;

  beforeEach(() => {
    service = new ResponseGenerationService();
  });

  describe('generateResponse - validation', () => {
    it('should throw NotFoundError for non-existent project', async () => {
      const user = userFactory();

      // Mock project not found
      prismaMock.project.findUnique.mockResolvedValue(null);

      // Mock authenticated user
      const { createClient } = await import('@/lib/utils/supabase/server');
      (createClient as any).mockReturnValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValueOnce({
            data: { user: { id: user.id } },
            error: null,
          }),
        },
      });

      await expect(
        service.generateResponse({
          projectId: 'non-existent',
          question: 'Test question',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw LlamaCloudConnectionError if not connected', async () => {
      const user = userFactory();
      const org = organizationFactory({ llamaCloudProjectId: null }); // Not connected
      const project = projectFactory({ organizationId: org.id });

      // Mock project found but no LlamaCloud connection
      prismaMock.project.findUnique.mockResolvedValue({
        ...project,
        organization: org,
        projectIndexes: [],
      } as any);

      // Mock user is member
      prismaMock.organizationUser.findUnique.mockResolvedValue({
        id: 'ou_123',
        userId: user.id,
        organizationId: org.id,
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { createClient } = await import('@/lib/utils/supabase/server');
      (createClient as any).mockReturnValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValueOnce({
            data: { user: { id: user.id } },
            error: null,
          }),
        },
      });

      await expect(
        service.generateResponse({
          projectId: project.id,
          question: 'Test question',
        })
      ).rejects.toThrow(LlamaCloudConnectionError);
    });
  });
});
```

**Success Criteria**: Core validation logic is tested

---

#### Task 0.7: Generate Initial Coverage Report

**Deliverables**:
1. Run full test suite with coverage
2. Generate HTML coverage report
3. Document current coverage baseline
4. Identify gaps for future improvement

**Commands**:
```bash
# Run tests with coverage
pnpm test:coverage

# View HTML report
open coverage/index.html
```

**Coverage Report Document** (`TEST_COVERAGE_BASELINE.md`):
```markdown
# Test Coverage Baseline (Before Provider Refactor)

Generated: [Date]
Framework: Vitest with v8 coverage provider

## Overall Coverage

- **Lines**: XX%
- **Functions**: XX%
- **Branches**: XX%
- **Statements**: XX%

## Coverage by Area

### Validators (lib/validators/)
- Lines: XX%
- Status: ✅ Well covered

### Services (lib/services/)
- Lines: XX%
- Status: ⚠️ Partial coverage (database-heavy operations)

### Utilities (lib/env.ts, lib/test-utils/)
- Lines: XX%
- Status: ✅ Good coverage

### API Routes (app/api/)
- Lines: XX%
- Status: ⏭️ Skipped (integration tests needed)

## Not Covered (Acceptable for Phase 0)

- API route handlers (require integration tests)
- UI components (require React testing)
- Database migrations
- External API integrations (mocked in tests)

## Next Steps for Coverage Improvement

1. Add integration tests for API routes (Phase 5)
2. Add React component tests for UI (Phase 5)
3. Increase service layer coverage after refactor
4. Add E2E tests for critical flows

## Notes

This baseline captures current behavior before the provider abstraction refactor.
Tests will be updated during implementation to work with the new architecture.
Target: Maintain or improve coverage after refactor.
```

**Success Criteria**:
- Coverage report generated successfully
- Baseline documented
- At least 50% overall coverage achieved

---

### Phase 1: Foundation (Tasks 1-3)

#### Task 1: Create IDocumentIndexProvider Interface
**File**: `lib/interfaces/document-index-provider.ts`

**Deliverables**:
- Define `ProviderType` union type: `'llamacloud' | 'bedrock'`
- Define common types: `ProviderCredentials`, `IndexProject`, `IndexPipeline`, `IndexDocument`
- Define `ProviderConfig` interface
- Define `IDocumentIndexProvider` interface with methods:
  - `getProviderType(): ProviderType`
  - `verifyCredentialsAndFetchProjects(credentials): Promise<IndexProject[]>`
  - `verifyProjectAccess(credentials, projectId): Promise<IndexProject>`
  - `fetchPipelinesForProject(credentials, projectId): Promise<IndexPipeline[]>`
  - `fetchDocumentsForPipeline(credentials, pipelineId): Promise<IndexDocument[]>`
  - `createRetriever(credentials, projectId, indexIds): Promise<unknown>`

**Success Criteria**: Interface compiles, types are well-documented

#### Task 2: Create Provider Factory
**File**: `lib/providers/provider-factory.ts`

**Deliverables**:
- `ProviderFactory` class with provider caching
- `getProvider()` method that reads `LLAMA_SDK_PROVIDER` env var
- Support for `llamacloud` and `bedrock` providers
- Error handling for invalid provider types
- Export singleton instance: `providerFactory`

**Caching Strategy**:
- Cache providers by type (one instance per provider type)
- Cache persists for application lifetime (singleton pattern)
- Cache is NOT invalidated on credential changes (requires app restart)
- For testing: provide `clearCache()` method to reset between test suites

**Implementation**:
```typescript
class ProviderFactory {
  private providers: Map<string, IDocumentIndexProvider> = new Map();

  getProvider(): IDocumentIndexProvider {
    const providerType = getLlamaSdkProvider();

    if (this.providers.has(providerType)) {
      return this.providers.get(providerType)!;
    }

    const provider = this.createProvider(providerType);
    this.providers.set(providerType, provider);
    return provider;
  }

  clearCache(): void {
    this.providers.clear();
  }

  private createProvider(type: string): IDocumentIndexProvider {
    switch (type) {
      case 'llamacloud': return new LlamaCloudProvider();
      case 'bedrock': return new BedrockProvider();
      default: throw new Error(`Unsupported provider: ${type}`);
    }
  }
}
```

**Testing Strategy**:
```typescript
// In test setup
import { providerFactory } from '@/lib/providers/provider-factory';

beforeEach(() => {
  providerFactory.clearCache(); // Clear between test files
  process.env.LLAMA_SDK_PROVIDER = 'llamacloud'; // Set test provider
});
```

**Success Criteria**: Factory can be imported and called (will fail until providers exist)

#### Task 3: Update Environment Configuration
**File**: `lib/env.ts`

**Deliverables**:
- `getLlamaSdkProvider(): LlamaSdkProvider` function
- `getProviderCredentials(userEmail: string): ProviderCredentials` function
- Support for LlamaCloud credentials (existing `getLlamaCloudApiKey`)
- Support for Bedrock credentials (new AWS env vars)
- Validation and error handling

**Environment Variables to Add**:
```bash
# Provider selection
LLAMA_SDK_PROVIDER=llamacloud  # or 'bedrock'

# AWS Bedrock (new)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
BEDROCK_KNOWLEDGE_BASE_ROLE_ARN=arn:aws:iam::...  # Optional
```

**Success Criteria**: Functions return correct credentials based on provider type

---

### Phase 2: Provider Implementations (Tasks 4-5)

#### Task 4: Refactor LlamaCloud Client
**Files**:
- Rename: `lib/services/llamacloud-client.ts` → `lib/providers/llamacloud-provider.ts`
- Keep: `lib/interfaces/llamacloud-service.ts` (for backwards compat during migration)
- Update: `lib/validators/llamacloud.ts` (used by provider)

**Deliverables**:
- `LlamaCloudProvider` class implementing `IDocumentIndexProvider`
- Map existing methods to interface methods:
  - `verifyApiKeyAndFetchProjects` → `verifyCredentialsAndFetchProjects`
  - `verifyProjectAccess` → same
  - `fetchPipelinesForProject` → same
  - `fetchFilesForPipeline` → `fetchDocumentsForPipeline`
  - NEW: `createRetriever` - returns LlamaCloudIndex instance(s)
- Map types: `LlamaCloudProject` → `IndexProject`, etc.
- Preserve existing functionality exactly

**Success Criteria**: All existing LlamaCloud functionality works through new provider interface

#### Task 5: Implement Bedrock Provider
**Files**:
- `lib/providers/bedrock-provider.ts` - Main provider implementation
- `lib/providers/bedrock-retriever.ts` - Custom retriever implementation

**Dependencies** (✅ INSTALLED in Task 0.0):
```bash
pnpm add @aws-sdk/client-bedrock-agent
pnpm add @aws-sdk/client-bedrock-agent-runtime
```

**⚠️ IMPORTANT FINDING FROM TASK 0.0**:
`BedrockKnowledgeBaseRetriever` does NOT exist in llamaindex 0.10.3. We must implement a custom retriever that extends `BaseRetriever` from llamaindex.

**Deliverables**:

**Part A: Custom Bedrock Retriever** (`lib/providers/bedrock-retriever.ts`):
```typescript
import { BaseRetriever, NodeWithScore, TextNode } from 'llamaindex';
import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
  RetrievalResultContent
} from '@aws-sdk/client-bedrock-agent-runtime';

export interface BedrockRetrieverConfig {
  knowledgeBaseId: string;
  region: string;
  topK?: number;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export class BedrockKnowledgeBaseRetriever extends BaseRetriever {
  private client: BedrockAgentRuntimeClient;
  private knowledgeBaseId: string;
  private topK: number;

  constructor(config: BedrockRetrieverConfig) {
    super();
    this.knowledgeBaseId = config.knowledgeBaseId;
    this.topK = config.topK || 10;

    this.client = new BedrockAgentRuntimeClient({
      region: config.region,
      credentials: config.credentials,
    });
  }

  async retrieve(query: string): Promise<NodeWithScore[]> {
    const command = new RetrieveCommand({
      knowledgeBaseId: this.knowledgeBaseId,
      retrievalQuery: { text: query },
      retrievalConfiguration: {
        vectorSearchConfiguration: {
          numberOfResults: this.topK,
        },
      },
    });

    const response = await this.client.send(command);
    return this.transformResults(response.retrievalResults || []);
  }

  private transformResults(results: any[]): NodeWithScore[] {
    return results.map((result, index) => {
      // Extract text content from Bedrock result
      const content = result.content?.text || '';
      const score = result.score || 0;

      // Create TextNode matching LlamaIndex format
      const node = new TextNode({
        text: content,
        metadata: {
          source: result.location?.s3Location?.uri || 'unknown',
          knowledgeBaseId: this.knowledgeBaseId,
          resultId: result.metadata?.['x-amz-bedrock-kb-chunk-id'] || `result_${index}`,
        },
      });

      return {
        node,
        score,
      };
    });
  }
}
```

**Part B: Bedrock Provider** (`lib/providers/bedrock-provider.ts`):
- `BedrockProvider` class implementing `IDocumentIndexProvider`
- Use AWS SDK clients for management operations:
  - `BedrockAgentClient` for listing KBs and data sources
  - Custom retriever for queries
- Implement all interface methods:
  - `verifyCredentialsAndFetchProjects` - list Knowledge Bases using `ListKnowledgeBasesCommand`
  - `verifyProjectAccess` - verify KB access using `GetKnowledgeBaseCommand`
  - `fetchPipelinesForProject` - list data sources using `ListDataSourcesCommand`
  - `fetchDocumentsForPipeline` - return empty array (Bedrock doesn't expose individual docs)
  - `createRetriever` - return custom `BedrockKnowledgeBaseRetriever` instance
- Map AWS types to common types:
  - `KnowledgeBase` → `IndexProject`
  - `DataSource` → `IndexPipeline`
- Error handling for AWS API errors
- Region configuration support

**Implementation Notes**:
1. Credentials come from environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
2. Region comes from AWS_REGION env var or organization.indexRegion
3. Knowledge Base ID stored in organization.indexProjectId
4. Data Source IDs stored in ProjectIndex.indexId

**Success Criteria**:
- Can list Knowledge Bases from AWS account
- Can list data sources for a Knowledge Base
- Custom retriever successfully queries Bedrock and returns results
- Results integrate with LlamaIndex query engines

**Time Estimate**: 4-5 hours (includes custom retriever implementation)

---

### Phase 3: Data Layer (Task 6)

#### Task 6: Database Schema Migration
**File**: `prisma/schema.prisma` + new migration file

**Schema Changes - Organization Model**:

```prisma
model Organization {
  // OLD fields (remove):
  - llamaCloudProjectId    String?
  - llamaCloudProjectName  String?
  - llamaCloudOrgName      String?
  - llamaCloudConnectedAt  DateTime?

  // NEW fields (add):
  + indexProvider          String?    // 'llamacloud' | 'bedrock'
  + indexProjectId         String?    // Provider-specific project/KB ID
  + indexProjectName       String?    // Human-readable name
  + indexOrganizationName  String?    // Provider org name (if applicable)
  + indexConnectedAt       DateTime?  // Connection timestamp
  + indexRegion            String?    // AWS region (for bedrock), null for llamacloud
}
```

**Schema Changes - ProjectIndex Model**:
```prisma
model ProjectIndex {
  // Fields stay the same, but comments updated:
  indexId   String // Pipeline ID (LlamaCloud) or Data Source ID (Bedrock)
  indexName String // Human-readable name (provider-agnostic)
}
```

**Migration Strategy**:
1. Add new fields as nullable
2. Copy data from old fields to new fields with default provider type 'llamacloud'
3. Verify data integrity
4. Remove old fields
5. Make `indexProvider` required when `indexProjectId` is set

**Migration Script**:
```bash
pnpm prisma migrate dev --name add_provider_abstraction
```

**Data Migration SQL** (in migration file):
```sql
-- Add new fields
ALTER TABLE organizations ADD COLUMN index_provider VARCHAR(50);
ALTER TABLE organizations ADD COLUMN index_project_id VARCHAR(255);
ALTER TABLE organizations ADD COLUMN index_project_name VARCHAR(255);
ALTER TABLE organizations ADD COLUMN index_organization_name VARCHAR(255);
ALTER TABLE organizations ADD COLUMN index_connected_at TIMESTAMP;
ALTER TABLE organizations ADD COLUMN index_region VARCHAR(50);

-- Migrate existing data
UPDATE organizations
SET
  index_provider = 'llamacloud',
  index_project_id = llama_cloud_project_id,
  index_project_name = llama_cloud_project_name,
  index_organization_name = llama_cloud_org_name,
  index_connected_at = llama_cloud_connected_at
WHERE llama_cloud_project_id IS NOT NULL;

-- Drop old fields (after verification)
ALTER TABLE organizations DROP COLUMN llama_cloud_project_id;
ALTER TABLE organizations DROP COLUMN llama_cloud_project_name;
ALTER TABLE organizations DROP COLUMN llama_cloud_org_name;
ALTER TABLE organizations DROP COLUMN llama_cloud_connected_at;
```

**Success Criteria**:
- Migration runs without errors
- All existing connections preserved
- Rollback plan tested

---

### Phase 4: Service & API Layer (Tasks 7-10)

#### Task 7: Update Service Files

**Files to Update**:

1. **`lib/services/index-connection-service.ts`** (renamed from `llamacloud-connection-service.ts`)
   - Import `providerFactory` instead of `llamaCloudClient`
   - Update all methods to use `provider = providerFactory.getProvider()`
   - Update database calls to use new field names
   - Make provider-agnostic

2. **`lib/services/response-generation-service.ts`**
   - Import `providerFactory`
   - Use `provider.createRetriever()` instead of direct LlamaCloudIndex creation
   - Update organization field references

3. **`lib/services/multi-step-response-service.ts`**
   - Similar updates to response-generation-service

4. **`lib/organization-service.ts`**
   - Update field names in queries
   - Update connection status checks

5. **`lib/project-service.ts`**
   - Update index-related queries

**Pattern for Updates**:
```typescript
// OLD
import { llamaCloudClient } from '@/lib/services/llamacloud-client';
const projects = await llamaCloudClient.verifyApiKeyAndFetchProjects(apiKey);

// NEW
import { providerFactory } from '@/lib/providers/provider-factory';
import { getProviderCredentials } from '@/lib/env';

const provider = providerFactory.getProvider();
const credentials = getProviderCredentials(userEmail);
const projects = await provider.verifyCredentialsAndFetchProjects(credentials);
```

**Success Criteria**: All services compile and use provider factory

#### Task 8: Rename API Routes

**Directory Rename**:
- `app/api/llamacloud/` → `app/api/index-provider/`

**Files to Rename**:
- `app/api/llamacloud/projects/route.ts` → `app/api/index-provider/projects/route.ts`
- `app/api/llamacloud/connect/route.ts` → `app/api/index-provider/connect/route.ts`
- `app/api/llamacloud/disconnect/route.ts` → `app/api/index-provider/disconnect/route.ts`
- `app/api/llamacloud/documents/route.ts` → `app/api/index-provider/documents/route.ts`

**Success Criteria**: All API routes accessible at new paths

#### Task 9: Update API Route Handlers

**Files to Update**: All routes in `app/api/index-provider/`

**Changes**:
- Import `providerFactory` instead of `llamaCloudClient`
- Update to use provider interface
- Update response types to be provider-agnostic
- Update error messages

**Example**:
```typescript
// app/api/index-provider/projects/route.ts

import { providerFactory } from '@/lib/providers/provider-factory';
import { getProviderCredentials } from '@/lib/env';

export const GET = withApiHandler(
  async (request: NextRequest) => {
    const currentUser = await organizationService.getCurrentUser();
    if (!currentUser) {
      throw new AuthorizationError();
    }

    const provider = providerFactory.getProvider();
    const credentials = getProviderCredentials(currentUser.email);

    const projects = await provider.verifyCredentialsAndFetchProjects(credentials);

    return NextResponse.json({
      projects,
      providerType: provider.getProviderType()
    });
  }
);
```

**Success Criteria**: All API routes work with both providers

#### Task 10: Update Validators

**File**: Rename/update validators for provider-agnostic naming

**Changes**:
- Create `lib/validators/index-provider.ts` with provider-agnostic types
- Keep `lib/validators/llamacloud.ts` for LlamaCloud-specific types (used by provider)
- Update API routes to use new validators

**Success Criteria**: Request/response validation works correctly

---

### Phase 5: UI & Testing (Tasks 11-15)

#### Task 11: Update UI Components

**Files to Update**:

1. **`components/organizations/ConnectionStatus.tsx`**
   - Display provider type dynamically
   - Show "LlamaCloud Project" or "Amazon Bedrock Knowledge Base"
   - Show region for Bedrock

2. **`components/projects/ProjectIndexSelector.tsx`**
   - Update terminology to "Document Index" instead of "Pipeline"
   - Provider-agnostic labels

3. **`components/projects/ProjectDocuments.tsx`**
   - Update field references
   - Provider-agnostic display

4. **`app/organizations/[orgSlug]/settings/page.tsx`**
   - Update connection UI
   - Show provider type

5. **All components using organization.llamaCloud*** fields**
   - Find with: `grep -r "llamaCloud" components/`
   - Update to use new `index*` field names

**Terminology Updates**:
- "LlamaCloud Project" → "Document Index Project" or show actual provider name
- "Pipeline" → "Document Index"
- "Connect to LlamaCloud" → "Connect Document Index"

**Success Criteria**: UI reflects provider-agnostic terminology, displays provider type

#### Task 12: Add Provider Validation

**File**: `lib/utils/provider-validation.ts` (new)

**Deliverables**:
- Validate `LLAMA_SDK_PROVIDER` env var
- Validate required credentials for each provider
- Validate provider-specific requirements
- Helper functions for common validations

**Success Criteria**: Helpful error messages when configuration is invalid

#### Task 13: Test LlamaCloud Provider

**Test Cases**:
1. Connect to LlamaCloud project
2. Fetch available projects
3. Fetch pipelines for project
4. Generate response using LlamaCloud indexes
5. Disconnect from LlamaCloud
6. Verify all existing functionality works

**Test Environment**:
```bash
LLAMA_SDK_PROVIDER=llamacloud
LLAMACLOUD_API_KEY=llx-...
```

**Success Criteria**: All existing features work identically to before migration

#### Task 14: Test Bedrock Provider

**Prerequisites**:
- AWS account with Bedrock access
- Created Knowledge Base in Bedrock
- S3 bucket with documents
- Proper IAM permissions

**Test Cases**:
1. Connect to Bedrock Knowledge Base
2. Fetch available Knowledge Bases
3. Fetch data sources for KB
4. Generate response using Bedrock indexes
5. Disconnect from Bedrock
6. Test region-specific deployments

**Test Environment**:
```bash
LLAMA_SDK_PROVIDER=bedrock
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

**Success Criteria**: Can query Bedrock and get relevant responses

#### Task 15: Update Documentation

**Files to Update**:

1. **`README.md`**
   - Add provider selection section
   - Document both LlamaCloud and Bedrock setup
   - Update environment variables section
   - Add provider switching instructions

2. **`CLAUDE.md`**
   - Add provider architecture section
   - Document how services use providers
   - Update field names in schema documentation
   - Add troubleshooting for providers

3. **`.env.example`**
   - Add provider selection variable
   - Add AWS credentials
   - Document required vars per provider

**Success Criteria**: Clear documentation for both providers

---

#### Task 16: Update Tests for Provider Abstraction

**Purpose**: Update Phase 0 baseline tests to work with the new provider architecture

**Files to Update**:
- All test files created in Phase 0
- Mock imports to use new provider factory
- Update database field names in test expectations

**Changes Needed**:

1. **Update mocks**:
```typescript
// OLD
vi.mock('@/lib/services/llamacloud-client');

// NEW
vi.mock('@/lib/providers/provider-factory', () => ({
  providerFactory: {
    getProvider: vi.fn(),
    clearCache: vi.fn(),
  },
}));
```

2. **Update field names in tests**:
```typescript
// OLD
expect(org.llamaCloudProjectId).toBe('proj_123');

// NEW
expect(org.indexProjectId).toBe('proj_123');
expect(org.indexProvider).toBe('llamacloud');
```

3. **Update factory in test setup**:
```typescript
// lib/test-utils/test-setup.ts
import { providerFactory } from '@/lib/providers/provider-factory';
import { LlamaCloudProvider } from '@/lib/providers/llamacloud-provider';

beforeEach(() => {
  const mockProvider = new LlamaCloudProvider();
  vi.mocked(providerFactory.getProvider).mockReturnValue(mockProvider);
});
```

**Verification**:
```bash
# All tests should still pass
pnpm test:run

# Coverage should be maintained or improved
pnpm test:coverage
```

**Success Criteria**:
- All Phase 0 tests pass with provider abstraction
- Coverage at least 50% (same as baseline)
- No test flakiness

**Time Estimate**: 2-3 hours

---

#### Task 17: Test Rollback Procedure

**Purpose**: Verify the rollback plan works before deployment

**Deliverables**:

1. **Create Rollback Test Script** (`scripts/test-rollback.sh`):
```bash
#!/bin/bash
set -e

echo "Testing rollback procedure..."

# 1. Simulate production state
echo "Step 1: Creating test database with new schema..."
DATABASE_URL="postgresql://test:test@localhost:5432/rollback_test" \
  pnpm prisma migrate deploy

# 2. Seed with new data
echo "Step 2: Seeding with provider data..."
# Add test data with indexProvider, indexProjectId, etc.

# 3. Create reverse migration
echo "Step 3: Creating reverse migration..."
# Apply migration that renames fields back

# 4. Verify data integrity
echo "Step 4: Verifying data after rollback..."
# Check that llamaCloudProjectId has correct values
# Check that old code would work

# 5. Cleanup
echo "Step 5: Cleanup..."
dropdb rollback_test

echo "✅ Rollback procedure validated"
```

2. **Create Reverse Migration**:
```sql
-- migrations/XXXXXX_rollback_provider_abstraction.sql

-- Rename fields back
ALTER TABLE organizations ADD COLUMN llama_cloud_project_id VARCHAR(255);
ALTER TABLE organizations ADD COLUMN llama_cloud_project_name VARCHAR(255);
ALTER TABLE organizations ADD COLUMN llama_cloud_org_name VARCHAR(255);
ALTER TABLE organizations ADD COLUMN llama_cloud_connected_at TIMESTAMP;

-- Copy data back (only for llamacloud provider)
UPDATE organizations
SET
  llama_cloud_project_id = index_project_id,
  llama_cloud_project_name = index_project_name,
  llama_cloud_org_name = index_organization_name,
  llama_cloud_connected_at = index_connected_at
WHERE index_provider = 'llamacloud';

-- Drop new fields
ALTER TABLE organizations DROP COLUMN index_provider;
ALTER TABLE organizations DROP COLUMN index_project_id;
ALTER TABLE organizations DROP COLUMN index_project_name;
ALTER TABLE organizations DROP COLUMN index_organization_name;
ALTER TABLE organizations DROP COLUMN index_connected_at;
ALTER TABLE organizations DROP COLUMN index_region;
```

3. **Document Rollback Steps** (`ROLLBACK.md`):
```markdown
# Rollback Procedure

## When to Rollback
- Critical bug in provider abstraction
- Bedrock integration failing in production
- Data corruption detected

## Steps
1. Set `LLAMA_SDK_PROVIDER=llamacloud` in production env
2. Restart application
3. Apply reverse migration: `pnpm prisma migrate deploy`
4. Revert code: git revert <commit-hash>
5. Deploy previous version
6. Verify: Check that LlamaCloud connections work

## Data Considerations
- Bedrock connections will be lost (acceptable - can reconnect)
- LlamaCloud connections preserved
- No data loss for questions/answers
```

**Testing Checklist**:
- [ ] Reverse migration runs without errors
- [ ] Data integrity maintained after rollback
- [ ] Old code works with rolled-back schema
- [ ] Rollback completes in <5 minutes
- [ ] Process documented and repeatable

**Success Criteria**: Rollback procedure tested and documented

**Time Estimate**: 1-2 hours

---

## File Structure After Implementation

```
auto_rfp/
├── lib/
│   ├── interfaces/
│   │   ├── document-index-provider.ts       # NEW: Provider interface
│   │   └── llamacloud-service.ts           # KEEP: Backwards compat
│   ├── providers/
│   │   ├── provider-factory.ts             # NEW: Factory
│   │   ├── llamacloud-provider.ts          # MOVED/REFACTORED: from services/
│   │   ├── bedrock-provider.ts             # NEW: Bedrock implementation
│   │   └── bedrock-retriever.ts            # NEW: Custom Bedrock retriever
│   ├── services/
│   │   ├── index-connection-service.ts     # RENAMED: from llamacloud-connection-service
│   │   ├── response-generation-service.ts  # UPDATED: Use provider factory
│   │   └── multi-step-response-service.ts  # UPDATED: Use provider factory
│   ├── validators/
│   │   ├── index-provider.ts               # NEW: Provider-agnostic types
│   │   └── llamacloud.ts                   # KEEP: LlamaCloud-specific types
│   └── env.ts                              # UPDATED: Provider config
├── app/
│   └── api/
│       └── index-provider/                 # RENAMED: from llamacloud/
│           ├── projects/route.ts           # UPDATED: Use factory
│           ├── connect/route.ts            # UPDATED: Use factory
│           ├── disconnect/route.ts         # UPDATED: Use factory
│           └── documents/route.ts          # UPDATED: Use factory
├── prisma/
│   └── schema.prisma                       # UPDATED: Provider-agnostic fields
├── PROVIDER_ARCHITECTURE.md                # Design document
└── PROVIDER_PLAN.md                        # This file
```

## Testing Strategy

### Unit Tests (if applicable)
- Provider factory selection logic
- Credential handling
- Type mappings between provider-specific and common types

### Integration Tests
- Full flow with LlamaCloud
- Full flow with Bedrock
- Provider switching (change env var, restart, test)

### Manual Testing Checklist

**LlamaCloud Provider**:
- [ ] Organization can connect to LlamaCloud project
- [ ] Can view available projects
- [ ] Can view pipelines/indexes
- [ ] Can select indexes for project
- [ ] Can generate responses using indexes
- [ ] Can disconnect from LlamaCloud
- [ ] UI shows correct provider information

**Bedrock Provider**:
- [ ] Organization can connect to Bedrock KB
- [ ] Can view available Knowledge Bases
- [ ] Can view data sources
- [ ] Can select data sources for project
- [ ] Can generate responses using KB
- [ ] Can disconnect from Bedrock
- [ ] UI shows correct provider information with region

**Provider Switching**:
- [ ] Change `LLAMA_SDK_PROVIDER` from `llamacloud` to `bedrock`
- [ ] Restart application
- [ ] Connect to different provider works
- [ ] Previous provider data is preserved but inactive

**Error Handling**:
- [ ] Invalid provider type shows clear error
- [ ] Missing credentials show clear error
- [ ] API failures handled gracefully
- [ ] Provider-specific errors mapped correctly

## Rollback Plan

If issues arise after deployment:

1. **Immediate**: Set `LLAMA_SDK_PROVIDER=llamacloud` in production env
2. **Database**: Run reverse migration (restore old field names)
3. **Code**: Revert PR
4. **Verify**: Test that original functionality is restored

## Success Metrics

- ✅ Zero breaking changes to existing LlamaCloud functionality
- ✅ Can switch providers by changing one env var
- ✅ Both providers work with existing service layer code
- ✅ Database migration completes without data loss
- ✅ All tests pass for both providers
- ✅ Documentation is clear and complete

## Timeline Estimate

### Planned Tasks

| Phase | Tasks | Estimated Time | Notes |
|-------|-------|----------------|-------|
| Task 0.0: Pre-Flight | SDK Verification | ✅ 1 hour | COMPLETED - Bedrock requires custom retriever |
| Phase 0: Test Baseline | 0.1-0.7 | 4-6 hours | Setup Vitest, write baseline tests |
| Phase 1: Foundation | 1-3 | 2-3 hours | Interface, factory, env config |
| Phase 2: Providers | 4-5 | 8-10 hours | LlamaCloud refactor + Bedrock with custom retriever |
| Phase 3: Data Layer | 6 | 2-3 hours | Database migration |
| Phase 4: Services/API | 7-10 | 5-6 hours | Update all services and API routes |
| Phase 5: UI/Testing | 11-15 | 6-8 hours | UI updates, provider testing, docs |
| Task 16: Update Tests | Test refactor | 2-3 hours | Update Phase 0 tests for new architecture |
| Task 17: Rollback Test | Rollback procedure | 1-2 hours | Verify rollback works |
| **Subtotal** | **25 tasks** | **31-43 hours** | Core implementation (+2 hours for custom retriever) |

### Additional Time (Not in Tasks)

| Activity | Estimated Time | Notes |
|----------|----------------|-------|
| AWS Resource Setup | 2-3 hours | Create KB, configure S3, IAM permissions |
| Debugging & Iteration | 3-5 hours | Unexpected issues, API quirks |
| Code Review & Fixes | 1-2 hours | Address PR feedback |
| **Subtotal** | | **6-10 hours** | |

### Total Realistic Estimate

**37-53 hours** (conservative range accounting for unknowns and custom retriever)

**Recommended Planning**: Budget 42-45 hours (~1 week) for comfortable completion with testing

**Note**: Estimate increased by 2 hours due to custom Bedrock retriever implementation (no built-in support in llamaindex)

## Dependencies

### NPM Packages to Add

**Task 0.0 (Pre-Flight)** - ✅ COMPLETED:
```bash
# Already installed:
@aws-sdk/client-bedrock-agent v3.948.0
@aws-sdk/client-bedrock-agent-runtime v3.948.0

# Verified:
llamaindex v0.10.3 (no built-in Bedrock support - custom retriever required)
```

**Phase 0 (Testing)**:
```bash
pnpm add -D vitest @vitest/ui @vitest/coverage-v8
pnpm add -D @testing-library/react @testing-library/jest-dom
pnpm add -D vitest-mock-extended  # For mocking Prisma
```

**No additional packages needed for Phase 2** - AWS SDK packages already installed in Task 0.0

### AWS Prerequisites (for Bedrock testing)
- AWS account with Bedrock enabled in target region
- Knowledge Base created with data sources configured
- S3 bucket with sample documents ingested
- IAM user/role with permissions:
  - `bedrock-agent:ListKnowledgeBases` (management operations)
  - `bedrock-agent:GetKnowledgeBase` (management operations)
  - `bedrock-agent:ListDataSources` (management operations)
  - `bedrock-agent-runtime:Retrieve` (query operations - CRITICAL for custom retriever)
  - `s3:GetObject` (for document access)
  - `aoss:APIAccessAll` (OpenSearch Serverless access)

## Post-Implementation

After successful deployment:

1. Monitor provider usage and errors
2. Gather feedback on provider switching experience
3. Consider adding provider-specific features
4. Plan for additional providers (OpenSearch, Pinecone, etc.)
5. Optimize provider-specific performance

## Questions for Future Consideration

- Should we support multiple providers per organization in future?
- Should we add provider-specific feature flags?
- Should we expose provider metrics/observability?
- Should we cache provider responses?
- Should we add provider health checks?
