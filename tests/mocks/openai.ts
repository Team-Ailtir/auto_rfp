import { vi } from 'vitest';

export const mockOpenAIResponse = {
  choices: [{
    message: {
      content: JSON.stringify({
        complexity: 'moderate',
        requiredInformation: ['technical specs'],
        specificEntities: [],
        searchQueries: ['test query'],
        expectedSources: 2,
        reasoning: 'Test analysis',
      }),
    },
  }],
};

export const mockOpenAIQuestionExtractionResponse = {
  choices: [{
    message: {
      content: JSON.stringify({
        sections: [{
          id: 'sec-1',
          title: 'Requirements',
          questions: [{ id: 'q-1', question: 'What is your approach?' }],
        }],
      }),
    },
  }],
};

export const createOpenAIMock = () => ({
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue(mockOpenAIResponse),
    },
  },
});

export const mockOpenAIClient = createOpenAIMock();
