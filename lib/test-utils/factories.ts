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
