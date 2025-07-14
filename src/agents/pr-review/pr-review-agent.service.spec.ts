import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PRReviewAgentService } from './pr-review-agent.service';
import { GroqService } from '../../shared/lln.service';
import { PersonaConfig } from './persona.config';
import { CodeContext } from '../base/agent-result.interface';

describe('PRReviewAgentService', () => {
  let service: PRReviewAgentService;
  let groqService: jest.Mocked<GroqService>;
  let configService: jest.Mocked<ConfigService>;

  const mockCodeContext: CodeContext = {
    prNumber: 123,
    repoOwner: 'testowner',
    repoName: 'testrepo',
    files: [
      {
        filename: 'src/example.ts',
        status: 'modified',
        additions: 10,
        deletions: 5,
        changes: 15,
        patch: `@@ -1,5 +1,10 @@
-function oldFunction() {
-  console.log('old');
+function newFunction() {
+  const apiKey = 'hardcoded-secret';
+  console.log('new function');
+  return apiKey;
 }`,
      },
    ],
    baseSha: 'abc123',
    headSha: 'def456',
    title: 'Add new feature',
    description: 'This PR adds a new feature',
    author: 'testuser',
    branch: 'feature/new-feature',
  };

  beforeEach(async () => {
    const mockGroqService = {
      chat: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('senior'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PRReviewAgentService,
        { provide: GroqService, useValue: mockGroqService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PRReviewAgentService>(PRReviewAgentService);
    groqService = module.get(GroqService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return correct config', () => {
    const config = service.getConfig();
    expect(config.name).toBe('PR Review Agent');
    expect(config.supportedFileTypes).toContain('ts');
    expect(config.supportedFileTypes).toContain('js');
  });

  it('should set and get persona correctly', () => {
    const securityPersona = PersonaConfig.getPersona('security');
    service.setPersona(securityPersona);

    const currentPersona = service.getPersona();
    expect(currentPersona.name).toBe('Security Expert');
  });

  it('should analyze code context successfully', async () => {
    const mockLLMResponse = JSON.stringify([
      {
        file: 'src/example.ts',
        line: 2,
        message: 'Hardcoded API key detected',
        severity: 'high',
        category: 'security',
        suggestion: 'Use environment variables for API keys',
        ruleId: 'SEC-001',
      },
      {
        file: 'src/example.ts',
        line: 3,
        message: 'Console statement in production code',
        severity: 'low',
        category: 'style',
        suggestion: 'Use proper logging library',
        ruleId: 'STYLE-001',
      },
    ]);

    groqService.chat.mockResolvedValue({
      choices: [{ message: { content: mockLLMResponse } }],
    });

    const result = await service.analyze(mockCodeContext);

    expect(result).toBeDefined();
    expect(result.agentName).toBe('PR Review Agent');
    expect(result.comments).toHaveLength(2);
    expect(result.comments[0].severity).toBe('high');
    expect(result.comments[0].category).toBe('security');
    expect(result.score).toBeLessThan(100);
    expect(result.metadata?.securityIssues).toBe(1);
    expect(result.metadata?.styleIssues).toBe(1);
  });

  it('should handle empty file list', async () => {
    const emptyContext: CodeContext = {
      ...mockCodeContext,
      files: [],
    };

    const result = await service.analyze(emptyContext);

    expect(result.comments).toHaveLength(0);
    expect(result.score).toBe(100);
    expect(result.summary).toContain('No relevant JS/TS files found');
  });

  it('should filter non-supported files', async () => {
    const contextWithUnsupportedFiles: CodeContext = {
      ...mockCodeContext,
      files: [
        {
          filename: 'README.txt',
          status: 'modified',
          additions: 1,
          deletions: 0,
          changes: 1,
          patch: '+This is a text file',
        },
      ],
    };

    const result = await service.analyze(contextWithUnsupportedFiles);

    expect(result.comments).toHaveLength(0);
    expect(result.score).toBe(100);
  });

  it('should generate persona-specific summary', async () => {
    const securityPersona = PersonaConfig.getPersona('security');
    service.setPersona(securityPersona);

    groqService.chat.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify([
              {
                file: 'src/example.ts',
                line: 2,
                message: 'Security vulnerability detected',
                severity: 'high',
                category: 'security',
                suggestion: 'Fix immediately',
                ruleId: 'SEC-001',
              },
            ]),
          },
        },
      ],
    });

    const result = await service.analyze(mockCodeContext);

    expect(result.summary).toContain('🔒 Security review complete');
    expect(result.summary).toContain('security');
  });

  it('should handle different personas correctly', () => {
    const personas = [
      'senior',
      'mentor',
      'security',
      'performance',
      'strict',
      'friendly',
      'architect',
    ];

    personas.forEach((personaName) => {
      const persona = PersonaConfig.getPersona(personaName);
      service.setPersona(persona);

      const currentPersona = service.getPersona();
      expect(currentPersona.name).toBeDefined();
      expect(currentPersona.focusAreas).toBeDefined();
      expect(currentPersona.reviewStyle).toMatch(/strict|balanced|encouraging/);
    });
  });

  it('should calculate scores based on persona weights', async () => {
    const performancePersona = PersonaConfig.getPersona('performance');
    service.setPersona(performancePersona);

    const mockResponse = JSON.stringify([
      {
        file: 'src/example.ts',
        line: 1,
        message: 'Performance issue',
        severity: 'high',
        category: 'performance',
        suggestion: 'Optimize this code',
        ruleId: 'PERF-001',
      },
    ]);

    groqService.chat.mockResolvedValue({
      choices: [{ message: { content: mockResponse } }],
    });

    const result = await service.analyze(mockCodeContext);

    expect(result.score).toBeLessThan(100);
    expect(result.metadata?.performanceIssues).toBe(1);
  });
});
