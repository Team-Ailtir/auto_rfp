import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LlamaCloudClient } from '../llamacloud-client';
import { LlamaCloudConnectionError, ExternalServiceError } from '@/lib/errors/api-errors';

describe('LlamaCloudClient', () => {
  let client: LlamaCloudClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new LlamaCloudClient();
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('verifyApiKeyAndFetchProjects', () => {
    it('should fetch projects with valid API key', async () => {
      const mockProjects = [
        { id: 'proj_1', name: 'Project 1', description: 'Test project 1' },
        { id: 'proj_2', name: 'Project 2', description: null },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
      });

      const result = await client.verifyApiKeyAndFetchProjects('valid-key');

      expect(result).toEqual(mockProjects);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/projects'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-key',
          }),
        })
      );
    });

    it('should throw error for invalid API key', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(
        client.verifyApiKeyAndFetchProjects('invalid-key')
      ).rejects.toThrow(LlamaCloudConnectionError);
    });

    it('should handle empty projects array', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await client.verifyApiKeyAndFetchProjects('valid-key');

      expect(result).toEqual([]);
    });

    it('should validate project schema', async () => {
      const invalidProjects = [
        { id: 'proj_1' }, // Missing name
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidProjects,
      });

      await expect(
        client.verifyApiKeyAndFetchProjects('valid-key')
      ).rejects.toThrow();
    });

    it('should retry on network errors', async () => {
      vi.useFakeTimers();

      fetchMock
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const promise = client.verifyApiKeyAndFetchProjects('valid-key');

      // Fast-forward through the retry delays
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toEqual([]);
      expect(fetchMock).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });

    it('should throw after max retry attempts', async () => {
      vi.useFakeTimers();

      fetchMock.mockRejectedValue(new Error('Network error'));

      const promise = client.verifyApiKeyAndFetchProjects('valid-key');

      // Fast-forward through all retry delays
      await vi.runAllTimersAsync();

      try {
        await promise;
        throw new Error('Expected promise to reject');
      } catch (error) {
        expect(error).toBeInstanceOf(LlamaCloudConnectionError);
      }

      expect(fetchMock).toHaveBeenCalledTimes(3); // Default retry attempts

      vi.useRealTimers();
    });
  });

  describe('verifyProjectAccess', () => {
    it('should return project if accessible', async () => {
      const mockProjects = [
        { id: 'proj_1', name: 'Project 1' },
        { id: 'proj_2', name: 'Project 2' },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
      });

      const result = await client.verifyProjectAccess('valid-key', 'proj_1');

      expect(result).toEqual(mockProjects[0]);
    });

    it('should throw error if project not found', async () => {
      const mockProjects = [
        { id: 'proj_1', name: 'Project 1' },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
      });

      await expect(
        client.verifyProjectAccess('valid-key', 'proj_999')
      ).rejects.toThrow(LlamaCloudConnectionError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should throw error on API failure', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(
        client.verifyProjectAccess('invalid-key', 'proj_1')
      ).rejects.toThrow(LlamaCloudConnectionError);
    });
  });

  describe('fetchPipelinesForProject', () => {
    it('should fetch and filter pipelines by project ID', async () => {
      const mockPipelines = [
        { id: 'pipe_1', name: 'Pipeline 1', project_id: 'proj_1' },
        { id: 'pipe_2', name: 'Pipeline 2', project_id: 'proj_2' },
        { id: 'pipe_3', name: 'Pipeline 3', project_id: 'proj_1' },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPipelines,
      });

      const result = await client.fetchPipelinesForProject('valid-key', 'proj_1');

      expect(result).toHaveLength(2);
      expect(result).toEqual([mockPipelines[0], mockPipelines[2]]);
      expect(result.every(p => p.project_id === 'proj_1')).toBe(true);
    });

    it('should return empty array if no pipelines match project', async () => {
      const mockPipelines = [
        { id: 'pipe_1', name: 'Pipeline 1', project_id: 'proj_2' },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPipelines,
      });

      const result = await client.fetchPipelinesForProject('valid-key', 'proj_1');

      expect(result).toEqual([]);
    });

    it('should throw error on API failure', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(
        client.fetchPipelinesForProject('valid-key', 'proj_1')
      ).rejects.toThrow(LlamaCloudConnectionError);
    });

    it('should validate pipeline schema', async () => {
      const invalidPipelines = [
        { id: 'pipe_1', name: 'Pipeline 1' }, // Missing project_id
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidPipelines,
      });

      await expect(
        client.fetchPipelinesForProject('valid-key', 'proj_1')
      ).rejects.toThrow();
    });
  });

  describe('fetchFilesForPipeline', () => {
    it('should fetch files for a pipeline', async () => {
      const mockFiles = [
        {
          name: 'document1.pdf',
          file_size: 1024,
          pipeline_id: 'pipe_1',
        },
        {
          name: 'document2.pdf',
          file_size: 2048,
          pipeline_id: 'pipe_1',
        },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFiles,
      });

      const result = await client.fetchFilesForPipeline('valid-key', 'pipe_1');

      expect(result).toEqual(mockFiles);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/pipelines/pipe_1/files'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-key',
          }),
        })
      );
    });

    it('should return empty array on API failure', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await client.fetchFilesForPipeline('valid-key', 'pipe_1');

      expect(result).toEqual([]);
    });

    it('should return empty array on network error', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.fetchFilesForPipeline('valid-key', 'pipe_1');

      expect(result).toEqual([]);
    });

    it('should handle empty files array', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await client.fetchFilesForPipeline('valid-key', 'pipe_1');

      expect(result).toEqual([]);
    });

    it('should validate file schema', async () => {
      const invalidFiles = [
        { id: 'file_1' }, // Missing name
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidFiles,
      });

      const result = await client.fetchFilesForPipeline('valid-key', 'pipe_1');

      // Should return empty array on validation error (error is logged)
      expect(result).toEqual([]);
    });
  });

  describe('request retry logic', () => {
    it('should implement exponential backoff', async () => {
      vi.useFakeTimers();

      fetchMock
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const promise = client.verifyApiKeyAndFetchProjects('valid-key');

      // Fast-forward through retry delays
      await vi.runAllTimersAsync();

      await promise;

      expect(fetchMock).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });

    it('should respect custom retry attempts configuration', async () => {
      vi.useFakeTimers();

      const customClient = new LlamaCloudClient({ retryAttempts: 5 });
      global.fetch = fetchMock;

      fetchMock.mockRejectedValue(new Error('Network error'));

      const promise = customClient.verifyApiKeyAndFetchProjects('valid-key');

      // Fast-forward through all retry delays
      await vi.runAllTimersAsync();

      try {
        await promise;
        throw new Error('Expected promise to reject');
      } catch (error) {
        expect(error).toBeInstanceOf(LlamaCloudConnectionError);
      }

      expect(fetchMock).toHaveBeenCalledTimes(5);

      vi.useRealTimers();
    });

    it('should handle timeout configuration', async () => {
      const customClient = new LlamaCloudClient({
        timeout: 1000,
        retryAttempts: 1,
      });
      global.fetch = fetchMock;

      // Test that custom configuration is accepted
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await customClient.verifyApiKeyAndFetchProjects('valid-key');

      expect(result).toEqual([]);
    });
  });

  describe('configuration', () => {
    it('should use default configuration', () => {
      const defaultClient = new LlamaCloudClient();

      // Test that client is created successfully with defaults
      expect(defaultClient).toBeInstanceOf(LlamaCloudClient);
    });

    it('should accept custom base URL', async () => {
      const customClient = new LlamaCloudClient({
        baseUrl: 'https://custom.api.com/v1',
      });
      global.fetch = fetchMock;

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await customClient.verifyApiKeyAndFetchProjects('valid-key');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('https://custom.api.com/v1'),
        expect.any(Object)
      );
    });
  });
});
