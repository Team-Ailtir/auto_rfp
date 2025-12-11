# Test Coverage Baseline (Before Provider Refactor)

**Generated**: 2025-12-11
**Framework**: Vitest with v8 coverage provider
**Purpose**: Document current behavior before implementing provider abstraction

## Overall Coverage

- **Lines**: 4.57%
- **Functions**: 5.01%
- **Branches**: 3.15%
- **Statements**: 4.71%

## Coverage by Area

### ✅ Validators (lib/validators/)

- **Overall**: 26.47% lines
- **llamacloud.ts**: 100% lines, 100% branches, 100% statements
- **Status**: Well covered for refactor-critical code

**Tested schemas**:
- `LlamaCloudProjectSchema`
- `LlamaCloudPipelineSchema`
- `LlamaCloudConnectRequestSchema`
- `LlamaCloudFileSchema`

### ✅ LlamaCloud Client (lib/services/llamacloud-client.ts)

- **Lines**: 98.48%
- **Branches**: 100%
- **Functions**: 70.96%
- **Statements**: 98.38%
- **Status**: Excellent coverage

**Tested functionality**:
- API key verification and project fetching
- Project access verification
- Pipeline fetching with filtering
- File fetching for pipelines
- Retry logic with exponential backoff
- Error handling
- Custom configuration (timeout, retries, base URL)

### ✅ Environment Configuration (lib/env.ts)

- **Lines**: 66.66%
- **Functions**: 75%
- **Branches**: 75%
- **Status**: Good coverage

**Tested functionality**:
- `getLlamaCloudApiKey()` - internal vs external email handling
- `validateEnv()` - environment validation
- `env` object structure

### ⏭️ Not Covered (Acceptable for Phase 0)

The following areas have 0% coverage, which is expected:

- **API routes** (app/api/\*\*/route.ts) - Require integration tests
- **UI components** (components/\*) - Require React testing
- **Service layer** (most of lib/services/) - Complex, will test after refactor
- **Database migrations** - Not applicable
- **External API integrations** - Mocked in tests

## Test Files Created

1. `lib/env.test.ts` (12 tests)
2. `lib/validators/__tests__/llamacloud.test.ts` (14 tests)
3. `lib/services/__tests__/llamacloud-client.test.ts` (23 tests)

**Total**: 49 tests passing

## Key Testing Strategies

### Mocked Dependencies

- **Prisma Client**: Mocked using `vitest-mock-extended` in `vitest.setup.ts`
- **Fetch API**: Mocked using `vi.fn()` in client tests
- **Timers**: Fake timers (`vi.useFakeTimers()`) for retry logic tests

### Test Focus

Tests focus on:
1. **Business logic validation** - Not database interactions
2. **API contracts** - Request/response validation with Zod schemas
3. **Error handling** - Proper error types and messages
4. **Retry behavior** - Exponential backoff and max attempts
5. **Configuration** - Custom settings and defaults

## Notes for Provider Refactor

### Critical Behaviors to Preserve

1. **LlamaCloud Client**:
   - 3 retry attempts by default with exponential backoff
   - 30-second default timeout
   - Proper error wrapping (LlamaCloudConnectionError, ExternalServiceError)
   - Project filtering by project_id
   - Graceful handling of missing files (returns empty array)

2. **Validators**:
   - All Zod schemas must continue to validate existing API responses
   - Optional fields must remain optional
   - Required fields must remain required

3. **Environment**:
   - Internal email domain support (@runllama.ai default)
   - Internal API key selection based on email domain
   - Fallback to regular key when internal key not configured

### Migration Strategy

After provider abstraction:
1. Update tests to use `providerFactory.getProvider()`
2. Keep validation schemas (move to provider-specific modules if needed)
3. Maintain same retry/timeout behavior in new providers
4. Add Bedrock-specific tests following same patterns
5. Target: **Maintain or improve 50%+ coverage** after refactor

## Next Steps for Coverage Improvement

1. **Phase 1-2**: Add provider factory and implementation tests
2. **Phase 3**: Test database migration scripts
3. **Phase 4**: Add integration tests for API routes
4. **Phase 5**: Add React component tests for UI
5. **Future**: Add E2E tests for critical flows

## Coverage Goals

- **Current**: 4.57% lines (baseline established)
- **After Provider Refactor (Phase 2)**: Target 50%+ lines
- **After Full Implementation (Phase 5)**: Target 60%+ lines

This baseline captures the current behavior of LlamaCloud integration before introducing the provider abstraction layer. Tests will be updated during implementation to work with the new architecture while maintaining these documented behaviors.
