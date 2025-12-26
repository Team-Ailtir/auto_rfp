import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { apiHandler, withApiHandler } from '@/lib/middleware/api-handler';
import {
  ValidationError,
  AuthorizationError,
  ForbiddenError,
  NotFoundError,
  ApiError,
} from '@/lib/errors/api-errors';

// Mock NextRequest
const createMockRequest = (body: any = {}) => ({
  json: vi.fn().mockResolvedValue(body),
  method: 'POST',
  headers: new Headers(),
  url: 'http://localhost:3000/api/test',
});

// Helper to create NextResponse for withApiHandler tests
const createJsonResponse = (data: any, status = 200) =>
  NextResponse.json(data, { status });

describe('apiHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return success response for successful handler', async () => {
    const handler = async () => ({ data: 'test', success: true });
    const response = await apiHandler(handler);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toBe('test');
    expect(body.success).toBe(true);
  });

  it('should return JSON response with data', async () => {
    const testData = { items: [1, 2, 3], count: 3 };
    const handler = async () => testData;
    const response = await apiHandler(handler);

    const body = await response.json();
    expect(body).toEqual(testData);
  });

  it('should return 400 for ValidationError', async () => {
    const handler = async () => {
      throw new ValidationError('Invalid input');
    };

    const response = await apiHandler(handler);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid input');
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('should include details for ValidationError', async () => {
    const details = [{ path: ['email'], message: 'Invalid email format' }];
    const handler = async () => {
      throw new ValidationError('Validation failed', details);
    };

    const response = await apiHandler(handler);
    const body = await response.json();
    expect(body.details).toEqual(details);
  });

  it('should return 401 for AuthorizationError', async () => {
    const handler = async () => {
      throw new AuthorizationError('Token expired');
    };

    const response = await apiHandler(handler);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('Token expired');
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('should return 403 for ForbiddenError', async () => {
    const handler = async () => {
      throw new ForbiddenError('Admin access required');
    };

    const response = await apiHandler(handler);
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toBe('Admin access required');
    expect(body.code).toBe('FORBIDDEN');
  });

  it('should return 404 for NotFoundError', async () => {
    const handler = async () => {
      throw new NotFoundError('Project not found');
    };

    const response = await apiHandler(handler);
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toBe('Project not found');
    expect(body.code).toBe('NOT_FOUND');
  });

  it('should return custom status code for ApiError', async () => {
    const handler = async () => {
      throw new ApiError('Custom error', 418, 'TEAPOT');
    };

    const response = await apiHandler(handler);
    expect(response.status).toBe(418);

    const body = await response.json();
    expect(body.error).toBe('Custom error');
    expect(body.code).toBe('TEAPOT');
  });

  it('should return 500 for unexpected errors', async () => {
    const handler = async () => {
      throw new Error('Unexpected error');
    };

    const response = await apiHandler(handler);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBe('Internal server error');
  });

  it('should not leak error details for unexpected errors', async () => {
    const handler = async () => {
      throw new Error('Database password exposed');
    };

    const response = await apiHandler(handler);
    const body = await response.json();
    expect(body.error).not.toContain('password');
    expect(body.error).toBe('Internal server error');
  });
});

describe('withApiHandler', () => {
  const TestSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    value: z.number().positive('Value must be positive'),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate request body with schema', async () => {
    const handler = vi.fn().mockImplementation(() =>
      createJsonResponse({ success: true })
    );
    const wrappedHandler = withApiHandler(handler, {
      validationSchema: TestSchema,
    });

    const mockRequest = createMockRequest({ name: 'test', value: 42 });
    const response = await wrappedHandler(mockRequest as any);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(mockRequest, { name: 'test', value: 42 });
  });

  it('should reject invalid request body', async () => {
    const handler = vi.fn();
    const wrappedHandler = withApiHandler(handler, {
      validationSchema: TestSchema,
    });

    const mockRequest = createMockRequest({ name: '', value: -5 });
    const response = await wrappedHandler(mockRequest as any);

    expect(response.status).toBe(400);
    expect(handler).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('should include validation error details', async () => {
    const handler = vi.fn();
    const wrappedHandler = withApiHandler(handler, {
      validationSchema: TestSchema,
    });

    const mockRequest = createMockRequest({ name: '', value: 'not a number' });
    const response = await wrappedHandler(mockRequest as any);

    const body = await response.json();
    expect(body.details).toBeDefined();
    expect(Array.isArray(body.details)).toBe(true);
  });

  it('should skip validation when skipValidation is true', async () => {
    const handler = vi.fn().mockImplementation(() =>
      createJsonResponse({ skipped: true })
    );
    const wrappedHandler = withApiHandler(handler, {
      skipValidation: true,
    });

    const mockRequest = createMockRequest({ any: 'data' });
    const response = await wrappedHandler(mockRequest as any);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(mockRequest, {});
  });

  it('should parse JSON body without schema', async () => {
    const handler = vi.fn().mockImplementation(() =>
      createJsonResponse({ received: true })
    );
    const wrappedHandler = withApiHandler(handler, {});

    const testBody = { custom: 'data', nested: { value: 123 } };
    const mockRequest = createMockRequest(testBody);
    const response = await wrappedHandler(mockRequest as any);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(mockRequest, testBody);
  });

  it('should handle JSON parse errors', async () => {
    const handler = vi.fn();
    const wrappedHandler = withApiHandler(handler, {});

    const mockRequest = {
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
    };

    const response = await wrappedHandler(mockRequest as any);
    expect(response.status).toBe(500);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should propagate handler errors correctly', async () => {
    const handler = vi.fn().mockRejectedValue(new NotFoundError('Not found'));
    const wrappedHandler = withApiHandler(handler, {
      validationSchema: TestSchema,
    });

    const mockRequest = createMockRequest({ name: 'test', value: 1 });
    const response = await wrappedHandler(mockRequest as any);

    expect(response.status).toBe(404);
  });

  it('should handle missing required fields', async () => {
    const handler = vi.fn();
    const wrappedHandler = withApiHandler(handler, {
      validationSchema: TestSchema,
    });

    const mockRequest = createMockRequest({ name: 'test' }); // missing value
    const response = await wrappedHandler(mockRequest as any);

    expect(response.status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should validate complex nested schemas', async () => {
    const NestedSchema = z.object({
      user: z.object({
        name: z.string(),
        email: z.string().email(),
      }),
      items: z.array(z.string()),
    });

    const handler = vi.fn().mockImplementation(() =>
      createJsonResponse({ ok: true })
    );
    const wrappedHandler = withApiHandler(handler, {
      validationSchema: NestedSchema,
    });

    const validData = {
      user: { name: 'Test', email: 'test@example.com' },
      items: ['a', 'b'],
    };

    const mockRequest = createMockRequest(validData);
    const response = await wrappedHandler(mockRequest as any);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(mockRequest, validData);
  });
});
