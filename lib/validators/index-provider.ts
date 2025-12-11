import { z } from 'zod';

/**
 * Provider-agnostic validators for document index providers
 * Supports LlamaCloud, AWS Bedrock Knowledge Bases, and future providers
 */

// Connect request validation schema
export const IndexProviderConnectRequestSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  projectId: z.string().min(1, 'Project ID is required'),
  projectName: z.string().min(1, 'Project name is required'),
  organizationName: z.string().optional(), // Provider org name (if applicable)
  region: z.string().optional(), // AWS region (for Bedrock), null for LlamaCloud
});

// Disconnect request validation schema
export const IndexProviderDisconnectRequestSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
});

// Documents request validation schema (for query parameters)
export const IndexProviderDocumentsRequestSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
});

// Provider-agnostic project schema
export const IndexProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  organizationName: z.string().optional(),
  description: z.string().nullish(),
  region: z.string().optional(), // AWS region for Bedrock
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
});

// Provider-agnostic pipeline/index schema
export const IndexPipelineSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  status: z.string().nullish(),
});

// Provider-agnostic document schema
export const IndexDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  pipelineName: z.string().optional(),
  pipelineId: z.string().optional(),
  // Common metadata fields (provider-specific fields can be added)
  file_size: z.number().nullish(),
  file_type: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  status: z.string().nullish(),
});

// Connect response validation schema
export const IndexProviderConnectResponseSchema = z.object({
  success: z.boolean(),
  organization: z.object({
    id: z.string(),
    name: z.string(),
    indexProvider: z.string().nullable(),
    indexProjectId: z.string().nullable(),
    indexProjectName: z.string().nullable(),
    indexOrganizationName: z.string().nullable(),
    indexConnectedAt: z.date().nullable(),
    indexRegion: z.string().nullable(),
  }),
});

// Disconnect response validation schema
export const IndexProviderDisconnectResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  organization: z.object({
    id: z.string(),
    name: z.string(),
    indexProvider: z.null(),
    indexProjectId: z.null(),
    indexProjectName: z.null(),
    indexConnectedAt: z.null(),
    indexRegion: z.null(),
  }),
});

// Documents response validation schema
export const IndexProviderDocumentsResponseSchema = z.object({
  projectName: z.string().nullable(),
  projectId: z.string().nullable(),
  pipelines: z.array(IndexPipelineSchema),
  documents: z.array(IndexDocumentSchema),
  connectedAt: z.date().nullable(),
});

// Type exports
export type IndexProviderConnectRequest = z.infer<typeof IndexProviderConnectRequestSchema>;
export type IndexProviderDisconnectRequest = z.infer<typeof IndexProviderDisconnectRequestSchema>;
export type IndexProviderDocumentsRequest = z.infer<typeof IndexProviderDocumentsRequestSchema>;
export type IndexProject = z.infer<typeof IndexProjectSchema>;
export type IndexPipeline = z.infer<typeof IndexPipelineSchema>;
export type IndexDocument = z.infer<typeof IndexDocumentSchema>;
export type IndexProviderConnectResponse = z.infer<typeof IndexProviderConnectResponseSchema>;
export type IndexProviderDisconnectResponse = z.infer<typeof IndexProviderDisconnectResponseSchema>;
export type IndexProviderDocumentsResponse = z.infer<typeof IndexProviderDocumentsResponseSchema>;
