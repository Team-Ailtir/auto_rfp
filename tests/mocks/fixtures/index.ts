// Test fixtures for AutoRFP tests

export const mockQuestion = {
  id: 'q-1',
  question: 'What security measures do you implement?',
};

export const mockSection = {
  id: 'sec-1',
  title: 'Security Requirements',
  description: 'Security-related questions',
  questions: [mockQuestion],
};

export const mockExtractQuestionsRequest = {
  documentId: 'doc-123',
  documentName: 'test-rfp.pdf',
  content: 'This is the RFP document content with questions.',
  projectId: 'proj-456',
};

export const mockGenerateResponseRequest = {
  question: 'What is your security approach?',
  projectId: 'proj-123',
  documentIds: [],
  selectedIndexIds: [],
  useAllIndexes: false,
};

export const mockMultiStepRequest = {
  question: 'Describe your implementation approach',
  questionId: 'q-123',
  projectId: 'proj-456',
  indexIds: ['idx-1', 'idx-2'],
  context: 'Enterprise deployment',
};

export const mockFile = (options: {
  name?: string;
  size?: number;
  type?: string;
} = {}) => {
  const {
    name = 'test.pdf',
    size = 1024,
    type = 'application/pdf'
  } = options;

  return new File(['test content'], name, { type });
};

export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
};

export const mockOrganization = {
  id: 'org-123',
  name: 'Test Organization',
  slug: 'test-org',
};

export const mockProject = {
  id: 'proj-123',
  name: 'Test Project',
  organizationId: 'org-123',
};
