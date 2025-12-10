# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development with Turbopack
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Linting
pnpm lint

# Database operations
pnpm prisma generate          # Generate Prisma client
pnpm prisma migrate deploy    # Run migrations
pnpm prisma db seed          # Seed database
pnpm prisma db pull          # Pull schema from database
pnpm prisma migrate reset    # Reset database (WARNING: destroys data)
pnpm prisma studio           # Open Prisma Studio GUI
```

## Architecture Overview

### Multi-Tenant Structure

The application uses a hierarchical multi-tenant architecture:

```
User → OrganizationUser → Organization → Projects → Questions/Answers
                                       ↓
                                  KnowledgeBases → KB Questions/Answers
```

**Key relationships:**
- Organizations have multiple users with roles (`owner`, `admin`, `member`)
- Organizations can connect to a single LlamaCloud project (stored as `llamaCloudProjectId`)
- Projects belong to organizations and contain RFP questions/answers
- Projects can have multiple document indexes (`ProjectIndex`) from LlamaCloud
- Knowledge bases store reusable Q&A at the organization level

### Layer Architecture

```
Next.js App Router (app/)
    ↓
API Routes (app/api/**/route.ts)
    ↓
Middleware (lib/middleware/api-handler.ts) - validation & error handling
    ↓
Services (lib/services/*.ts) - business logic
    ↓
Database (Prisma) & External APIs (OpenAI, LlamaCloud)
```

### API Route Pattern

All API routes follow this pattern:

```typescript
// Always use withApiHandler for validation and error handling
import { withApiHandler } from '@/lib/middleware/api-handler';
import { myValidationSchema, MyRequestType } from '@/lib/validators/my-validator';

async function handleMyRequest(
  request: NextRequest,
  validatedData: MyRequestType
): Promise<NextResponse> {
  // Business logic here
  return NextResponse.json(result);
}

export const POST = withApiHandler(handleMyRequest, {
  validationSchema: myValidationSchema,
});
```

The `withApiHandler` middleware:
- Validates request body against Zod schema
- Handles errors uniformly (ValidationError, AuthorizationError, etc.)
- Returns proper HTTP status codes and JSON responses

### Authentication & Authorization

**Authentication:** Supabase magic link authentication
- User session managed via Supabase client (lib/utils/supabase/server.ts)
- Get current user: `organizationService.getCurrentUser()`

**Authorization pattern:**
- Use `organizationAuth` singleton from `lib/services/organization-auth.ts`
- Check membership: `await organizationAuth.getAuthenticatedMember(orgId)`
- Require admin: `await organizationAuth.getAuthenticatedAdminUser(orgId)`
- Roles: `owner` > `admin` > `member`

### AI Integration Architecture

**LlamaCloud (Document Indexing):**
- Organizations connect to one LlamaCloud project
- Multiple indexes per project stored in `ProjectIndex` table
- Client: `lib/services/llamacloud-client.ts`
- Two API keys supported: regular + internal (for @runllama.ai emails)
- Use `getLlamaCloudApiKey(userEmail)` from `lib/env.ts` to get correct key

**LlamaParse (Document Processing):**
- Parse uploaded documents (Word, PDF, Excel, PowerPoint)
- Extract structured text for question extraction
- Client: `lib/services/llamaparse-client.ts`

**OpenAI (Question Extraction & Response Generation):**
- Extract questions from RFP documents: `lib/services/openai-question-extractor.ts`
- Generate responses: `lib/services/response-generation-service.ts`
- Multi-step reasoning: `lib/services/multi-step-response-service.ts`

### Error Handling

Use custom error classes from `lib/errors/api-errors.ts`:
- `ValidationError` - Bad request data (400)
- `AuthorizationError` - Not authenticated (401)
- `ForbiddenError` - Insufficient permissions (403)
- `NotFoundError` - Resource not found (404)

All errors automatically handled by `withApiHandler` middleware.

## Next.js 15 Conventions

### Component Architecture
- **Favor React Server Components** - Use RSC by default, only add `'use client'` when necessary
- **Use Suspense** for async operations
- **Shadcn UI** for all UI components when available
- Implement error boundaries for client components

### Async Request APIs (CRITICAL)
Next.js 15 requires async access to runtime APIs:

```typescript
// CORRECT - Always await these APIs
const cookieStore = await cookies()
const headersList = await headers()
const params = await props.params
const searchParams = await props.searchParams
```

### State Management
- Use `useActionState` (NOT deprecated `useFormState`)
- Leverage `useFormStatus` for form state
- Minimize client-side state

## Code Conventions

### TypeScript
- Use interfaces over types
- Avoid enums; use const maps instead
- Prefer `satisfies` operator for type validation
- Use functional and declarative patterns

### Naming
- Descriptive names with auxiliary verbs: `isLoading`, `hasError`
- Event handlers prefixed with `handle`: `handleClick`, `handleSubmit`

### Component Structure
Order: exports → subcomponents → helpers → types

### File Organization
Files should not exceed 400 lines (800 for test files)

## Environment Configuration

Required variables in `.env`:
- `DATABASE_URL` - PostgreSQL connection
- `DIRECT_URL` - Direct PostgreSQL connection
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `OPENAI_API_KEY` - OpenAI API key
- `LLAMACLOUD_API_KEY` - LlamaCloud API key

Optional:
- `LLAMACLOUD_API_KEY_INTERNAL` - Internal org key
- `INTERNAL_EMAIL_DOMAIN` - Internal email domain (default: @runllama.ai)

Access via `lib/env.ts` module.

## Database Schema Key Points

### User Identification
- User IDs come from Supabase Auth
- User table stores basic profile info only

### Organization Features
- Slug for URL-friendly names (unique)
- LlamaCloud connection stored at org level (single project per org)
- Support for internal organizations (separate LlamaCloud project)

### Project Structure
- Projects contain RFP questions with `referenceId` (AI-generated like "question_1.10.1")
- Answers have multiple sources with relevance scores
- Summary and eligibility requirements stored at project level

### Knowledge Bases
- Organization-level reusable Q&A
- Separate from project-specific questions
- Support tags and topics for organization

## Key Service Files

- `lib/services/organization-auth.ts` - Authorization checks
- `lib/services/llamacloud-client.ts` - LlamaCloud API wrapper
- `lib/services/response-generation-service.ts` - AI response generation
- `lib/services/multi-step-response-service.ts` - Advanced reasoning
- `lib/services/question-extraction-service.ts` - Extract questions from docs
- `lib/organization-service.ts` - Core organization operations
- `lib/project-service.ts` - Project CRUD operations

## Testing

The application uses a sample RFP document for testing:
- Sample file URL in README.md
- Test with document upload → question extraction → response generation flow
