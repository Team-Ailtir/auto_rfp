import { describe, it, expect } from 'vitest';
import {
  StepTypeSchema,
  StepStatusSchema,
  StepResultSchema,
  QuestionAnalysisSchema,
  DocumentSearchResultSchema,
  InformationExtractionSchema,
  ResponseSynthesisSchema,
  MultiStepGenerateRequestSchema,
  StepUpdateSchema,
  MultiStepConfigSchema,
} from '@/lib/validators/multi-step-response';

describe('StepTypeSchema', () => {
  it('should validate all step types', () => {
    const types = [
      'analyze_question',
      'search_documents',
      'extract_information',
      'synthesize_response',
      'validate_answer',
    ];

    types.forEach(type => {
      const result = StepTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid step type', () => {
    const result = StepTypeSchema.safeParse('invalid_step');
    expect(result.success).toBe(false);
  });
});

describe('StepStatusSchema', () => {
  it('should validate all statuses', () => {
    const statuses = ['pending', 'running', 'completed', 'failed'];

    statuses.forEach(status => {
      const result = StepStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid status', () => {
    const result = StepStatusSchema.safeParse('unknown');
    expect(result.success).toBe(false);
  });
});

describe('StepResultSchema', () => {
  it('should validate minimal step result', () => {
    const step = {
      id: 'step-1',
      type: 'analyze_question',
      title: 'Analyzing Question',
      description: 'Analyzing the question complexity',
      status: 'completed',
      startTime: new Date(),
    };
    const result = StepResultSchema.safeParse(step);
    expect(result.success).toBe(true);
  });

  it('should validate complete step result', () => {
    const step = {
      id: 'step-1',
      type: 'search_documents',
      title: 'Searching Documents',
      description: 'Searching for relevant documents',
      status: 'completed',
      startTime: new Date(),
      endTime: new Date(),
      duration: 1500,
      output: { documentsFound: 5 },
      metadata: { query: 'security' },
    };
    const result = StepResultSchema.safeParse(step);
    expect(result.success).toBe(true);
  });

  it('should validate failed step with error', () => {
    const step = {
      id: 'step-1',
      type: 'extract_information',
      title: 'Extracting Information',
      description: 'Extracting key information',
      status: 'failed',
      startTime: new Date(),
      error: 'Timeout exceeded',
    };
    const result = StepResultSchema.safeParse(step);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.error).toBe('Timeout exceeded');
    }
  });
});

describe('QuestionAnalysisSchema', () => {
  it('should validate all complexity levels', () => {
    const levels = ['simple', 'moderate', 'complex', 'multi-part'];

    levels.forEach(level => {
      const analysis = {
        complexity: level,
        requiredInformation: ['spec'],
        specificEntities: [],
        searchQueries: ['query'],
        expectedSources: 2,
        reasoning: 'Analysis reasoning',
      };
      const result = QuestionAnalysisSchema.safeParse(analysis);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid complexity level', () => {
    const analysis = {
      complexity: 'unknown',
      requiredInformation: [],
      specificEntities: [],
      searchQueries: [],
      expectedSources: 1,
      reasoning: 'Test',
    };
    const result = QuestionAnalysisSchema.safeParse(analysis);
    expect(result.success).toBe(false);
  });

  it('should validate with arrays of varying lengths', () => {
    const analysis = {
      complexity: 'complex',
      requiredInformation: ['spec1', 'spec2', 'spec3'],
      specificEntities: ['entity1'],
      searchQueries: ['query1', 'query2'],
      expectedSources: 5,
      reasoning: 'Detailed reasoning',
    };
    const result = QuestionAnalysisSchema.safeParse(analysis);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiredInformation).toHaveLength(3);
    }
  });
});

describe('DocumentSearchResultSchema', () => {
  it('should validate all coverage levels', () => {
    const levels = ['complete', 'partial', 'insufficient'];

    levels.forEach(level => {
      const searchResult = {
        query: 'test query',
        documentsFound: 5,
        relevantSources: [],
        coverage: level,
      };
      const result = DocumentSearchResultSchema.safeParse(searchResult);
      expect(result.success).toBe(true);
    });
  });

  it('should validate with relevant sources', () => {
    const searchResult = {
      query: 'security measures',
      documentsFound: 3,
      relevantSources: [
        {
          id: 'src-1',
          title: 'Security Document',
          relevanceScore: 0.95,
          snippet: 'Relevant content snippet',
        },
      ],
      coverage: 'complete',
    };
    const result = DocumentSearchResultSchema.safeParse(searchResult);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.relevantSources).toHaveLength(1);
    }
  });
});

describe('InformationExtractionSchema', () => {
  it('should validate complete extraction', () => {
    const extraction = {
      extractedFacts: [
        { fact: 'Fact 1', source: 'doc-1', confidence: 0.9 },
      ],
      missingInformation: ['Missing item'],
      conflictingInformation: [
        { topic: 'Topic', conflictingSources: ['src-1', 'src-2'] },
      ],
    };
    const result = InformationExtractionSchema.safeParse(extraction);
    expect(result.success).toBe(true);
  });

  it('should validate empty extraction', () => {
    const extraction = {
      extractedFacts: [],
      missingInformation: [],
      conflictingInformation: [],
    };
    const result = InformationExtractionSchema.safeParse(extraction);
    expect(result.success).toBe(true);
  });

  it('should validate fact confidence bounds', () => {
    const extraction = {
      extractedFacts: [
        { fact: 'Fact', source: 'src', confidence: 0 },
        { fact: 'Fact 2', source: 'src', confidence: 1 },
      ],
      missingInformation: [],
      conflictingInformation: [],
    };
    const result = InformationExtractionSchema.safeParse(extraction);
    expect(result.success).toBe(true);
  });
});

describe('ResponseSynthesisSchema', () => {
  it('should validate complete synthesis', () => {
    const synthesis = {
      mainResponse: 'This is the main response',
      confidence: 0.85,
      sources: [
        { id: 'src-1', relevance: 0.9, usedInResponse: true },
      ],
      limitations: ['Limited data available'],
      recommendations: ['Consider additional research'],
    };
    const result = ResponseSynthesisSchema.safeParse(synthesis);
    expect(result.success).toBe(true);
  });

  it('should validate with empty arrays', () => {
    const synthesis = {
      mainResponse: 'Response',
      confidence: 0.5,
      sources: [],
      limitations: [],
      recommendations: [],
    };
    const result = ResponseSynthesisSchema.safeParse(synthesis);
    expect(result.success).toBe(true);
  });
});

describe('MultiStepGenerateRequestSchema', () => {
  it('should validate minimal request', () => {
    const request = {
      question: 'What is your approach?',
      questionId: 'q-123',
      projectId: 'proj-456',
      indexIds: ['idx-1'],
    };
    const result = MultiStepGenerateRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it('should validate complete request with preferences', () => {
    const request = {
      question: 'Describe implementation',
      questionId: 'q-123',
      projectId: 'proj-456',
      indexIds: ['idx-1', 'idx-2'],
      context: 'Enterprise deployment',
      userPreferences: {
        detailLevel: 'comprehensive',
        includeRecommendations: true,
        showReasoning: false,
      },
    };
    const result = MultiStepGenerateRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it('should reject empty question', () => {
    const request = {
      question: '',
      questionId: 'q-123',
      projectId: 'proj-456',
      indexIds: ['idx-1'],
    };
    const result = MultiStepGenerateRequestSchema.safeParse(request);
    expect(result.success).toBe(false);
  });

  it('should reject empty indexIds array', () => {
    const request = {
      question: 'Valid question',
      questionId: 'q-123',
      projectId: 'proj-456',
      indexIds: [],
    };
    const result = MultiStepGenerateRequestSchema.safeParse(request);
    expect(result.success).toBe(false);
  });

  it('should validate all detail levels', () => {
    const levels = ['brief', 'standard', 'comprehensive'];

    levels.forEach(level => {
      const request = {
        question: 'Question',
        questionId: 'q-123',
        projectId: 'proj-456',
        indexIds: ['idx-1'],
        userPreferences: {
          detailLevel: level,
        },
      };
      const result = MultiStepGenerateRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });
});

describe('StepUpdateSchema', () => {
  it('should validate minimal update', () => {
    const update = {
      stepId: 'step-1',
      status: 'running',
    };
    const result = StepUpdateSchema.safeParse(update);
    expect(result.success).toBe(true);
  });

  it('should validate complete update', () => {
    const update = {
      stepId: 'step-1',
      status: 'running',
      progress: 0.5,
      partialOutput: { processed: 50 },
      estimatedTimeRemaining: 5000,
    };
    const result = StepUpdateSchema.safeParse(update);
    expect(result.success).toBe(true);
  });
});

describe('MultiStepConfigSchema', () => {
  it('should validate with defaults', () => {
    const config = {};
    const result = MultiStepConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maxSteps).toBe(5);
      expect(result.data.timeoutPerStep).toBe(30000);
      expect(result.data.enableDetailedLogging).toBe(true);
      expect(result.data.fallbackToSingleStep).toBe(true);
      expect(result.data.minConfidenceThreshold).toBe(0.7);
    }
  });

  it('should reject maxSteps below 1', () => {
    const config = { maxSteps: 0 };
    const result = MultiStepConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should reject maxSteps above 10', () => {
    const config = { maxSteps: 11 };
    const result = MultiStepConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should validate maxSteps at boundaries', () => {
    expect(MultiStepConfigSchema.safeParse({ maxSteps: 1 }).success).toBe(true);
    expect(MultiStepConfigSchema.safeParse({ maxSteps: 10 }).success).toBe(true);
  });

  it('should reject confidence threshold out of bounds', () => {
    expect(MultiStepConfigSchema.safeParse({ minConfidenceThreshold: -0.1 }).success).toBe(false);
    expect(MultiStepConfigSchema.safeParse({ minConfidenceThreshold: 1.1 }).success).toBe(false);
  });

  it('should validate confidence threshold at boundaries', () => {
    expect(MultiStepConfigSchema.safeParse({ minConfidenceThreshold: 0 }).success).toBe(true);
    expect(MultiStepConfigSchema.safeParse({ minConfidenceThreshold: 1 }).success).toBe(true);
  });

  it('should reject timeout below minimum', () => {
    const config = { timeoutPerStep: 500 };
    const result = MultiStepConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});
