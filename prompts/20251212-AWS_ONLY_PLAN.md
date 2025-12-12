# Analysis: AWS Bedrock Knowledge Base Full Integration

## ⚠️ CONCLUSION: Pure AWS-Only Approach Not Feasible

**Status:** ❌ **NOT RECOMMENDED**

After comprehensive analysis and prompt-refiner review, **a pure AWS-only architecture for RFP document parsing is not practical** for this use case.

### Critical Finding

**The core assumption of this plan is technically flawed:** It assumes Bedrock Knowledge Base can extract full document text, but Bedrock KB is designed for **semantic search/RAG, not full-text extraction**.

- Bedrock `retrieve()` API requires a query and returns relevant chunks
- No documented way to get "all chunks" or "full document text" in sequential order
- This approach will likely not work for question extraction

### Additional Issues

1. **AWS Textract limitations:**
   - Doesn't support Office formats (DOCX, XLSX, DOC) without conversion
   - Multi-page PDFs require async API (3-15 minute latency)
   - Synchronous API only works with single-page PDFs or images

2. **High complexity:**
   - Realistic implementation: 6-8 weeks (vs original 3-4 week estimate)
   - Requires S3 infrastructure, IAM policies, async job management
   - Need Phase 0 validation POC before any development

3. **High costs:**
   - Vector database minimum: $1,400/month (OpenSearch) or $170/month (Pinecone)
   - Adds $100+/month for Bedrock embeddings
   - S3 storage and API costs

4. **High latency:**
   - 5-15 minutes for document ingestion (not 1-3 minutes as hoped)
   - Poor user experience for RFP upload workflow

### Recommended Alternative: Node.js Libraries

**Use Node.js parsing libraries for RFP text extraction while keeping Bedrock for KB retrieval.**

**Benefits:**
- ✅ Fast synchronous parsing (< 30 seconds)
- ✅ Supports all required formats (PDF, DOCX, XLSX, CSV)
- ✅ Low complexity (1-2 week implementation)
- ✅ No external API costs for parsing
- ✅ Still uses Bedrock for KB document retrieval
- ✅ Achieves goal of removing LlamaCloud dependency

**Trade-off:**
- Not pure "AWS-only" for parsing, but pragmatic and effective

---

## Original Plan Analysis (For Reference)

## Current Architecture

AutoRFP uses **two separate document flows**:

### 1. RFP Document Processing (Question Extraction)
```
User uploads RFP → Parse with LlamaParse/Textract → Extract text → OpenAI extracts questions → Save to DB
```
**Files involved:**
- `app/api/llamaparse/route.ts` - Document parsing endpoint
- `lib/parsers/bedrock-parser.ts` - Bedrock/Textract parser
- `lib/parsers/llamacloud-parser.ts` - LlamaCloud parser
- `app/api/extract-questions/route.ts` - Question extraction endpoint
- `lib/services/question-extraction-service.ts` - Question extraction logic

### 2. Knowledge Base Documents (Response Generation)
```
Organization connects to LlamaCloud/Bedrock → Documents already indexed → RAG retrieval for responses
```
**Files involved:**
- `lib/providers/bedrock-provider.ts` - Bedrock KB integration
- `lib/providers/bedrock-retriever.ts` - Custom Bedrock retriever
- `lib/services/response-generation-service.ts` - Response generation
- `lib/services/multi-step-response-service.ts` - Advanced response generation

**Key insight:** These are separate concerns - RFP parsing happens once per RFP upload, while KB documents are pre-indexed for retrieval.

---

## Option Analysis: Full Bedrock Knowledge Base Approach

### What Changes?

**Replace RFP parsing flow with Bedrock KB ingestion:**
```
User uploads RFP → Upload to S3 → Bedrock KB ingests automatically → Query for text extraction → OpenAI extracts questions
```

### Advantages

#### ✅ 1. No Custom Parsing Logic
- Bedrock KB handles parsing for PDF, DOCX, XLSX, CSV, DOC natively
- No need to maintain `bedrock-parser.ts` or `llamacloud-parser.ts`
- Eliminates the Textract limitation issues we encountered
- Bedrock supports all required formats out-of-the-box

#### ✅ 2. Unified Document Storage
- All documents (RFPs + KB docs) in one system
- Consistent S3 storage architecture
- Single provider management (no LlamaParse dependency)

#### ✅ 3. AWS-Native Architecture
- Fully serverless (S3 + Bedrock)
- Better for AWS-centric deployments
- Simplified credential management (only AWS keys needed)
- No external API dependencies (LlamaCloud)

#### ✅ 4. Cost Predictability
- AWS pricing model (no per-document parsing charges)
- S3 storage costs are transparent and cheap
- No LlamaParse API costs

#### ✅ 5. Better Scalability
- Bedrock KB designed for large-scale document processing
- Automatic chunking and embedding
- Built-in synchronization and updates

### Disadvantages

#### ❌ 1. Increased Latency for Question Extraction
- **Current:** Direct file upload → immediate parsing → instant text extraction
- **Bedrock:** Upload to S3 → KB ingestion (async) → wait for indexing → query for text → extract questions
- **Impact:** Could add 30 seconds to several minutes depending on document size
- **Mitigation:** Show progress indicator, process asynchronously

#### ❌ 2. S3 Bucket Management Required
- Must create and manage S3 buckets for each organization or project
- Additional IAM permissions needed for S3 access
- Bucket naming, lifecycle policies, cleanup logic required

#### ❌ 3. Bedrock Knowledge Base Setup Complexity
- Organizations must pre-create Bedrock Knowledge Bases
- Cannot dynamically create KB per project (AWS API limitations)
- Requires AWS Console setup or CloudFormation templates
- More complex onboarding than simple API key

#### ❌ 4. No LlamaCloud Provider Option
- Removes flexibility to use LlamaCloud as provider
- Forces AWS dependency for all deployments
- Current multi-provider architecture allows choice

#### ❌ 5. Text Extraction Quality Unknown
- Bedrock KB optimized for RAG retrieval, not full-text extraction
- May chunk or summarize content differently than LlamaParse
- Unknown if full document text is easily retrievable
- Could impact OpenAI question extraction quality

#### ❌ 6. Debugging and Observability
- Less control over parsing process
- Harder to troubleshoot parsing failures
- AWS CloudWatch logs vs direct API responses

#### ❌ 7. Document Retrieval Complexity
- Need to query Bedrock KB to get parsed text
- May require multiple API calls or custom logic
- Current approach gets full text immediately after parsing

---

## Recommended Approach

### **Hybrid Solution: Node.js Libraries for RFP Parsing**

Keep the architectural separation but fix the parsing issue:

```
RFP Upload → Parse with Node.js libraries → Extract questions
KB Documents → Stay in Bedrock/LlamaCloud → RAG retrieval
```

**Implementation:**
1. Use pure Node.js libraries for RFP parsing:
   - **PDF:** `pdf-parse` or `pdfjs-dist`
   - **DOCX:** `mammoth` (excellent quality)
   - **XLSX/CSV:** `xlsx` (SheetJS)
   - **DOC:** Skip support or convert to DOCX requirement

2. Keep Bedrock provider for KB document indexing and retrieval

**Benefits:**
- ✅ Maintains separation of concerns (parsing vs indexing)
- ✅ No external API dependencies for parsing
- ✅ Fast, synchronous text extraction
- ✅ Keeps multi-provider flexibility (LlamaCloud + Bedrock)
- ✅ Simple deployment (just npm packages)
- ✅ No S3 management overhead for RFP uploads
- ✅ No latency from async ingestion

**Trade-offs:**
- Slightly lower parsing quality than LlamaParse for complex documents
- Need to maintain Node.js library dependencies
- Legacy DOC format difficult (but could be deprecated)

---

## Decision Matrix

| Criteria | Current (broken) | Full Bedrock KB | Hybrid Node.js |
|----------|-----------------|-----------------|----------------|
| **Parsing Quality** | High (LlamaParse) | Unknown | Medium-High |
| **Setup Complexity** | Medium | High | Low |
| **Latency** | Low | High | Low |
| **AWS Dependencies** | Mixed | Full | Bedrock only for KB |
| **Provider Flexibility** | Yes | No | Yes |
| **Maintenance** | Low | Medium | Medium |
| **Cost** | Medium | Low | Low |
| **Architecture Clarity** | High | Medium | High |

---

## User Decisions

✅ **Provider Strategy:** AWS-only (remove LlamaCloud support)
✅ **Latency Tolerance:** 1-3 minutes acceptable with progress UI
✅ **Infrastructure Complexity:** Comfortable with S3/Bedrock management
✅ **Parsing Quality:** Good enough is fine (basic text extraction)

---

## Implementation Plan: Full AWS Bedrock Architecture

### Phase 1: S3 and Bedrock KB Setup

**Goal:** Create infrastructure for RFP document storage and parsing

**Tasks:**
1. Create S3 service for RFP uploads (`lib/services/s3-service.ts`)
   - Upload RFP documents to S3 bucket
   - Generate unique keys per organization/project
   - Handle file metadata and lifecycle

2. Create Bedrock KB management service (`lib/services/bedrock-kb-service.ts`)
   - Create/manage S3 data sources for Bedrock KB
   - Trigger synchronization after upload
   - Monitor ingestion status
   - Retrieve parsed document text

3. Update environment configuration (`lib/env.ts`)
   - Remove `LLAMACLOUD_API_KEY` requirement
   - Add `AWS_S3_BUCKET_NAME` for RFP storage
   - Ensure AWS credentials are validated

**Files to modify:**
- Create: `lib/services/s3-service.ts`
- Create: `lib/services/bedrock-kb-service.ts`
- Modify: `lib/env.ts`

### Phase 2: Replace Document Parsing Flow

**Goal:** Replace LlamaParse/Textract with Bedrock KB ingestion

**Tasks:**
1. Update parser interface to support async ingestion
   - Add ingestion status polling
   - Return job ID instead of immediate text

2. Modify `BedrockParser` to use Bedrock KB ingestion
   - Upload file to S3
   - Trigger Bedrock KB sync
   - Poll for completion
   - Retrieve parsed text via Bedrock retrieval

3. Update API endpoint for async processing
   - `/api/llamaparse` returns job ID immediately
   - New endpoint `/api/llamaparse/status` for polling
   - New endpoint `/api/llamaparse/result` for getting text

**Files to modify:**
- Modify: `lib/parsers/bedrock-parser.ts`
- Modify: `app/api/llamaparse/route.ts`
- Create: `app/api/llamaparse/status/route.ts`
- Create: `app/api/llamaparse/result/route.ts`

### Phase 3: Update Frontend for Async Processing

**Goal:** Add progress UI for Bedrock ingestion delay

**Tasks:**
1. Update `UploadComponent` to poll for status
   - Show progress states: uploading → ingesting → parsing → extracting
   - Poll `/api/llamaparse/status` endpoint
   - Handle errors and timeouts

2. Update `ProcessingModal` with new states
   - Add "Ingesting document in Bedrock" state
   - Show estimated time remaining
   - Add cancellation support

**Files to modify:**
- Modify: `components/upload/UploadComponent.tsx`
- Modify: `components/ProcessingModal.tsx`

### Phase 4: Remove LlamaCloud Support

**Goal:** Clean up LlamaCloud-specific code

**Tasks:**
1. Remove LlamaCloud parser and provider
   - Delete `lib/parsers/llamacloud-parser.ts`
   - Delete `lib/providers/llamacloud-provider.ts`
   - Delete `lib/services/llamacloud-*` files

2. Update provider factory to only return Bedrock
   - Remove `LLAMA_SDK_PROVIDER` env variable (always Bedrock)
   - Simplify `provider-factory.ts`
   - Update all provider references

3. Update database schema
   - Remove LlamaCloud-specific fields if any
   - Update connection logic

**Files to modify/delete:**
- Delete: `lib/parsers/llamacloud-parser.ts`
- Delete: `lib/providers/llamacloud-provider.ts`
- Delete: `lib/services/llamacloud-*.ts`
- Modify: `lib/parsers/parser-factory.ts`
- Modify: `lib/providers/provider-factory.ts`
- Modify: `lib/env.ts`

### Phase 5: Update Documentation

**Goal:** Update docs to reflect AWS-only architecture

**Tasks:**
1. Update README.md
   - Remove LlamaCloud setup instructions
   - Add S3 bucket setup steps
   - Add Bedrock KB creation guide
   - Update environment variables section

2. Update CLAUDE.md
   - Document new async parsing flow
   - Update architecture diagrams
   - Add S3 service documentation

**Files to modify:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

---

## Critical Implementation Details

### 1. S3 Bucket Organization
```
s3://auto-rfp-documents/
  ├── {organizationId}/
  │   └── rfps/
  │       └── {projectId}/
  │           └── {documentId}.pdf
```

### 2. Bedrock KB Data Source Configuration
- Use S3 as data source
- Configure automatic sync on file upload
- Use document metadata for filtering

### 3. Text Extraction from Bedrock
- Query Bedrock KB retrieval with full document request
- Aggregate chunks to reconstruct full text
- Handle pagination for large documents

### 4. Error Handling
- S3 upload failures → retry with exponential backoff
- Bedrock ingestion failures → notify user with helpful message
- Timeout after 5 minutes → allow manual retry

### 5. Progress States
1. **Uploading** (0-10%) - File upload to S3
2. **Ingesting** (10-60%) - Bedrock KB processing document
3. **Parsing** (60-80%) - Retrieving parsed text
4. **Extracting** (80-100%) - OpenAI extracting questions

---

## Testing Strategy

1. Test with sample RFP PDF
2. Test with DOCX, XLSX, CSV formats
3. Test error scenarios (upload failure, ingestion timeout)
4. Test concurrent uploads
5. Verify full text extraction quality
