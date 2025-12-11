import { describe, it, expect } from 'vitest';
import {
  IndexProviderConnectRequestSchema,
  IndexProviderDisconnectRequestSchema,
  IndexProviderDocumentsRequestSchema,
  IndexProjectSchema,
  IndexPipelineSchema,
  IndexDocumentSchema,
  IndexProviderConnectResponseSchema,
  IndexProviderDisconnectResponseSchema,
  IndexProviderDocumentsResponseSchema,
} from '../index-provider';

describe('Index Provider Validators', () => {
  describe('IndexProviderConnectRequestSchema', () => {
    it('should validate a complete connect request', () => {
      const validRequest = {
        organizationId: 'org_123',
        projectId: 'proj_123',
        projectName: 'My Project',
        organizationName: 'My Org',
        region: 'us-east-1',
      };

      const result = IndexProviderConnectRequestSchema.parse(validRequest);
      expect(result).toEqual(validRequest);
    });

    it('should validate connect request without optional fields', () => {
      const validRequest = {
        organizationId: 'org_123',
        projectId: 'proj_123',
        projectName: 'My Project',
      };

      const result = IndexProviderConnectRequestSchema.parse(validRequest);
      expect(result.organizationId).toBe('org_123');
      expect(result.organizationName).toBeUndefined();
      expect(result.region).toBeUndefined();
    });

    it('should reject request with missing required fields', () => {
      const invalidRequest = {
        organizationId: 'org_123',
        projectName: 'My Project',
      };

      expect(() => IndexProviderConnectRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject request with empty strings', () => {
      const invalidRequest = {
        organizationId: '',
        projectId: 'proj_123',
        projectName: 'My Project',
      };

      expect(() => IndexProviderConnectRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('IndexProviderDisconnectRequestSchema', () => {
    it('should validate a disconnect request', () => {
      const validRequest = {
        organizationId: 'org_123',
      };

      const result = IndexProviderDisconnectRequestSchema.parse(validRequest);
      expect(result).toEqual(validRequest);
    });

    it('should reject request with missing organizationId', () => {
      expect(() => IndexProviderDisconnectRequestSchema.parse({})).toThrow();
    });
  });

  describe('IndexProviderDocumentsRequestSchema', () => {
    it('should validate a documents request', () => {
      const validRequest = {
        organizationId: 'org_123',
      };

      const result = IndexProviderDocumentsRequestSchema.parse(validRequest);
      expect(result).toEqual(validRequest);
    });

    it('should reject request with empty organizationId', () => {
      const invalidRequest = {
        organizationId: '',
      };

      expect(() => IndexProviderDocumentsRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('IndexProjectSchema', () => {
    it('should validate a complete project', () => {
      const validProject = {
        id: 'proj_123',
        name: 'My Project',
        organizationName: 'My Org',
        description: 'Project description',
        region: 'us-east-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const result = IndexProjectSchema.parse(validProject);
      expect(result).toEqual(validProject);
    });

    it('should validate project with minimal fields', () => {
      const validProject = {
        id: 'proj_123',
        name: 'My Project',
      };

      const result = IndexProjectSchema.parse(validProject);
      expect(result.id).toBe('proj_123');
      expect(result.name).toBe('My Project');
      expect(result.organizationName).toBeUndefined();
    });
  });

  describe('IndexPipelineSchema', () => {
    it('should validate a complete pipeline', () => {
      const validPipeline = {
        id: 'pipe_123',
        name: 'My Pipeline',
        description: 'Pipeline description',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        status: 'active',
      };

      const result = IndexPipelineSchema.parse(validPipeline);
      expect(result).toEqual(validPipeline);
    });

    it('should validate pipeline with minimal fields', () => {
      const validPipeline = {
        id: 'pipe_123',
        name: 'My Pipeline',
      };

      const result = IndexPipelineSchema.parse(validPipeline);
      expect(result.id).toBe('pipe_123');
      expect(result.name).toBe('My Pipeline');
    });
  });

  describe('IndexDocumentSchema', () => {
    it('should validate a complete document', () => {
      const validDocument = {
        id: 'doc_123',
        name: 'My Document',
        pipelineName: 'My Pipeline',
        pipelineId: 'pipe_123',
        file_size: 1024,
        file_type: 'pdf',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        status: 'indexed',
      };

      const result = IndexDocumentSchema.parse(validDocument);
      expect(result).toEqual(validDocument);
    });

    it('should validate document with minimal fields', () => {
      const validDocument = {
        id: 'doc_123',
        name: 'My Document',
      };

      const result = IndexDocumentSchema.parse(validDocument);
      expect(result.id).toBe('doc_123');
      expect(result.name).toBe('My Document');
    });
  });

  describe('IndexProviderConnectResponseSchema', () => {
    it('should validate a connect response', () => {
      const validResponse = {
        success: true,
        organization: {
          id: 'org_123',
          name: 'My Org',
          indexProvider: 'llamacloud',
          indexProjectId: 'proj_123',
          indexProjectName: 'My Project',
          indexOrganizationName: 'Org Name',
          indexConnectedAt: new Date('2024-01-01T00:00:00Z'),
          indexRegion: 'us-east-1',
        },
      };

      const result = IndexProviderConnectResponseSchema.parse(validResponse);
      expect(result.success).toBe(true);
      expect(result.organization.indexProvider).toBe('llamacloud');
    });

    it('should validate connect response with null values', () => {
      const validResponse = {
        success: true,
        organization: {
          id: 'org_123',
          name: 'My Org',
          indexProvider: null,
          indexProjectId: null,
          indexProjectName: null,
          indexOrganizationName: null,
          indexConnectedAt: null,
          indexRegion: null,
        },
      };

      const result = IndexProviderConnectResponseSchema.parse(validResponse);
      expect(result.organization.indexProvider).toBeNull();
    });
  });

  describe('IndexProviderDisconnectResponseSchema', () => {
    it('should validate a disconnect response', () => {
      const validResponse = {
        success: true,
        message: 'Successfully disconnected',
        organization: {
          id: 'org_123',
          name: 'My Org',
          indexProvider: null,
          indexProjectId: null,
          indexProjectName: null,
          indexConnectedAt: null,
          indexRegion: null,
        },
      };

      const result = IndexProviderDisconnectResponseSchema.parse(validResponse);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Successfully disconnected');
      expect(result.organization.indexProvider).toBeNull();
    });
  });

  describe('IndexProviderDocumentsResponseSchema', () => {
    it('should validate a documents response', () => {
      const validResponse = {
        projectName: 'My Project',
        projectId: 'proj_123',
        pipelines: [
          {
            id: 'pipe_123',
            name: 'My Pipeline',
          },
        ],
        documents: [
          {
            id: 'doc_123',
            name: 'My Document',
          },
        ],
        connectedAt: new Date('2024-01-01T00:00:00Z'),
      };

      const result = IndexProviderDocumentsResponseSchema.parse(validResponse);
      expect(result.projectName).toBe('My Project');
      expect(result.pipelines).toHaveLength(1);
      expect(result.documents).toHaveLength(1);
    });

    it('should validate documents response with null values', () => {
      const validResponse = {
        projectName: null,
        projectId: null,
        pipelines: [],
        documents: [],
        connectedAt: null,
      };

      const result = IndexProviderDocumentsResponseSchema.parse(validResponse);
      expect(result.projectName).toBeNull();
      expect(result.pipelines).toHaveLength(0);
    });
  });
});
