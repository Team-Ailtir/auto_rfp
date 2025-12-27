import { describe, it, expect } from 'vitest';
import {
  ApiError,
  ValidationError,
  AuthorizationError,
  ForbiddenError,
  NotFoundError,
  ExternalServiceError,
  LlamaCloudConnectionError,
  AIServiceError,
  DatabaseError,
  ConfigurationError,
  isApiError,
} from '@/lib/errors/api-errors';

describe('ApiError', () => {
  it('should create error with all properties', () => {
    const error = new ApiError('Test error', 500, 'TEST_ERROR');
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('TEST_ERROR');
    expect(error.name).toBe('ApiError');
  });

  it('should extend Error', () => {
    const error = new ApiError('Test', 400);
    expect(error).toBeInstanceOf(Error);
  });

  it('should work without code', () => {
    const error = new ApiError('Test', 400);
    expect(error.code).toBeUndefined();
  });
});

describe('ValidationError', () => {
  it('should have correct status code and code', () => {
    const error = new ValidationError('Invalid input');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.name).toBe('ValidationError');
  });

  it('should store validation details', () => {
    const details = [{ field: 'email', message: 'Invalid email' }];
    const error = new ValidationError('Validation failed', details);
    expect(error.details).toEqual(details);
  });

  it('should extend ApiError', () => {
    const error = new ValidationError('Test');
    expect(error).toBeInstanceOf(ApiError);
  });
});

describe('AuthorizationError', () => {
  it('should have correct status code and code', () => {
    const error = new AuthorizationError();
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.name).toBe('AuthorizationError');
  });

  it('should use default message', () => {
    const error = new AuthorizationError();
    expect(error.message).toBe('Unauthorized');
  });

  it('should allow custom message', () => {
    const error = new AuthorizationError('Token expired');
    expect(error.message).toBe('Token expired');
  });
});

describe('ForbiddenError', () => {
  it('should have correct status code and code', () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
    expect(error.name).toBe('ForbiddenError');
  });

  it('should use default message', () => {
    const error = new ForbiddenError();
    expect(error.message).toBe('Access denied');
  });

  it('should allow custom message', () => {
    const error = new ForbiddenError('Admin access required');
    expect(error.message).toBe('Admin access required');
  });
});

describe('NotFoundError', () => {
  it('should have correct status code and code', () => {
    const error = new NotFoundError();
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.name).toBe('NotFoundError');
  });

  it('should use default message', () => {
    const error = new NotFoundError();
    expect(error.message).toBe('Resource not found');
  });

  it('should allow custom message', () => {
    const error = new NotFoundError('Project not found');
    expect(error.message).toBe('Project not found');
  });
});

describe('ExternalServiceError', () => {
  it('should have correct status code and code', () => {
    const error = new ExternalServiceError('Service unavailable', 'OpenAI');
    expect(error.statusCode).toBe(502);
    expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
    expect(error.name).toBe('ExternalServiceError');
  });

  it('should store service name', () => {
    const error = new ExternalServiceError('Error', 'LlamaCloud');
    expect(error.service).toBe('LlamaCloud');
  });
});

describe('LlamaCloudConnectionError', () => {
  it('should have correct status code and code', () => {
    const error = new LlamaCloudConnectionError();
    expect(error.statusCode).toBe(502);
    expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
    expect(error.name).toBe('LlamaCloudConnectionError');
  });

  it('should use default message', () => {
    const error = new LlamaCloudConnectionError();
    expect(error.message).toBe('LlamaCloud connection failed');
  });

  it('should allow custom message', () => {
    const error = new LlamaCloudConnectionError('API key invalid');
    expect(error.message).toBe('API key invalid');
  });

  it('should have LlamaCloud as service', () => {
    const error = new LlamaCloudConnectionError();
    expect(error.service).toBe('LlamaCloud');
  });

  it('should extend ExternalServiceError', () => {
    const error = new LlamaCloudConnectionError();
    expect(error).toBeInstanceOf(ExternalServiceError);
  });
});

describe('AIServiceError', () => {
  it('should have correct default status code and code', () => {
    const error = new AIServiceError('AI operation failed');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('AI_SERVICE_ERROR');
  });

  it('should allow custom status code', () => {
    const error = new AIServiceError('Rate limited', 429);
    expect(error.statusCode).toBe(429);
  });
});

describe('DatabaseError', () => {
  it('should have correct default status code and code', () => {
    const error = new DatabaseError('Query failed');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('DATABASE_ERROR');
  });

  it('should allow custom status code', () => {
    const error = new DatabaseError('Connection timeout', 503);
    expect(error.statusCode).toBe(503);
  });
});

describe('ConfigurationError', () => {
  it('should have correct status code and code', () => {
    const error = new ConfigurationError('Missing API key');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('CONFIGURATION_ERROR');
    expect(error.name).toBe('ConfigurationError');
  });
});

describe('isApiError', () => {
  it('should return true for ApiError instances', () => {
    expect(isApiError(new ApiError('test', 500))).toBe(true);
    expect(isApiError(new ValidationError('test'))).toBe(true);
    expect(isApiError(new AuthorizationError())).toBe(true);
    expect(isApiError(new ForbiddenError())).toBe(true);
    expect(isApiError(new NotFoundError())).toBe(true);
    expect(isApiError(new ExternalServiceError('test', 'service'))).toBe(true);
    expect(isApiError(new LlamaCloudConnectionError())).toBe(true);
    expect(isApiError(new AIServiceError('test'))).toBe(true);
    expect(isApiError(new DatabaseError('test'))).toBe(true);
    expect(isApiError(new ConfigurationError('test'))).toBe(true);
  });

  it('should return false for regular Error', () => {
    expect(isApiError(new Error('test'))).toBe(false);
  });

  it('should return false for non-error values', () => {
    expect(isApiError(null)).toBe(false);
    expect(isApiError(undefined)).toBe(false);
    expect(isApiError('error string')).toBe(false);
    expect(isApiError({ message: 'error object' })).toBe(false);
    expect(isApiError(123)).toBe(false);
  });
});
