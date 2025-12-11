import { describe, it, expect } from 'vitest';
import {
  LlamaCloudProjectSchema,
  LlamaCloudPipelineSchema,
  LlamaCloudConnectRequestSchema,
  LlamaCloudFileSchema,
} from '../llamacloud';

describe('LlamaCloud Validators', () => {
  describe('LlamaCloudProjectSchema', () => {
    it('should validate correct project data', () => {
      const validProject = {
        id: 'proj_123',
        name: 'Test Project',
        description: 'A test project',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const result = LlamaCloudProjectSchema.safeParse(validProject);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validProject);
      }
    });

    it('should validate project with minimal fields', () => {
      const minimalProject = {
        id: 'proj_123',
        name: 'Test Project',
      };

      const result = LlamaCloudProjectSchema.safeParse(minimalProject);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalidProject = { name: 'Test Project' };

      const result = LlamaCloudProjectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
    });

    it('should reject project without name', () => {
      const invalidProject = { id: 'proj_123' };

      const result = LlamaCloudProjectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
    });
  });

  describe('LlamaCloudPipelineSchema', () => {
    it('should validate pipeline with all fields', () => {
      const validPipeline = {
        id: 'pipe_123',
        name: 'Test Pipeline',
        project_id: 'proj_123',
        description: 'A test pipeline',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        status: 'active',
      };

      const result = LlamaCloudPipelineSchema.safeParse(validPipeline);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validPipeline);
      }
    });

    it('should validate pipeline with minimal fields', () => {
      const minimalPipeline = {
        id: 'pipe_123',
        name: 'Test Pipeline',
        project_id: 'proj_123',
      };

      const result = LlamaCloudPipelineSchema.safeParse(minimalPipeline);
      expect(result.success).toBe(true);
    });

    it('should reject pipeline without project_id', () => {
      const invalidPipeline = {
        id: 'pipe_123',
        name: 'Test Pipeline',
      };

      const result = LlamaCloudPipelineSchema.safeParse(invalidPipeline);
      expect(result.success).toBe(false);
    });
  });

  describe('LlamaCloudConnectRequestSchema', () => {
    it('should validate correct connect request', () => {
      const validRequest = {
        organizationId: 'org_123',
        projectId: 'proj_123',
        projectName: 'Test Project',
        llamaCloudOrgName: 'Test Org',
      };

      const result = LlamaCloudConnectRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate request without optional fields', () => {
      const minimalRequest = {
        organizationId: 'org_123',
        projectId: 'proj_123',
        projectName: 'Test Project',
      };

      const result = LlamaCloudConnectRequestSchema.safeParse(minimalRequest);
      expect(result.success).toBe(true);
    });

    it('should reject request with empty organizationId', () => {
      const invalidRequest = {
        organizationId: '',
        projectId: 'proj_123',
        projectName: 'Test Project',
      };

      const result = LlamaCloudConnectRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject request with missing required fields', () => {
      const invalidRequest = {
        organizationId: 'org_123',
      };

      const result = LlamaCloudConnectRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('LlamaCloudFileSchema', () => {
    it('should validate file with all fields', () => {
      const validFile = {
        id: 'file_123',
        name: 'document.pdf',
        external_file_id: 'ext_123',
        file_size: 1024,
        file_type: 'application/pdf',
        project_id: 'proj_123',
        last_modified_at: '2024-01-01T00:00:00Z',
        resource_info: {
          file_size: 1024,
          last_modified_at: '2024-01-01T00:00:00Z',
        },
        data_source_id: 'ds_123',
        file_id: 'file_123',
        pipeline_id: 'pipe_123',
        status: 'indexed',
        status_updated_at: '2024-01-02T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const result = LlamaCloudFileSchema.safeParse(validFile);
      expect(result.success).toBe(true);
    });

    it('should validate file with minimal fields', () => {
      const minimalFile = {
        name: 'document.pdf',
      };

      const result = LlamaCloudFileSchema.safeParse(minimalFile);
      expect(result.success).toBe(true);
    });

    it('should reject file without name', () => {
      const invalidFile = {
        id: 'file_123',
        file_size: 1024,
      };

      const result = LlamaCloudFileSchema.safeParse(invalidFile);
      expect(result.success).toBe(false);
    });
  });
});
