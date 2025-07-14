import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EnhancedPRAgentService } from './enhanced-pr-agent.service';
import { GithubService } from '../../github/github.service';
import { PRReviewAgentService } from './pr-review-agent.service';
import { AutoFixService } from './auto-fix.service';
import { PRSummaryService } from './pr-summary.service';
import { PRLabelingService } from './pr-labeling.service';
import { ChangelogService } from './changelog.service';

describe('EnhancedPRAgentService', () => {
  let service: EnhancedPRAgentService;
  let githubService: jest.Mocked<GithubService>;
  let prReviewService: jest.Mocked<PRReviewAgentService>;

  const mockPRData = {
    number: 123,
    title: 'Add new feature',
    body: 'This PR adds a new authentication feature',
    head: { sha: 'abc123', ref: 'feature/auth' },
    base: { sha: 'def456', ref: 'main' },
  };

  const mockFiles = [
    {
      filename: 'src/auth.ts',
      status: 'added',
      additions: 50,
      deletions: 0,
      changes: 50,
      patch: '+function authenticate() {\n+  console.log("auth");\n+}',
    },
  ];

  beforeEach(async () => {
    const mockGithubService = {
      getPullRequest: jest.fn(),
      getPullRequestFiles: jest.fn(),
      getFileContent: jest.fn(),
      addLabels: jest.fn(),
      createLabel: jest.fn(),
      createReview: jest.fn(),
      postGeneralComment: jest.fn(),
    };

    const mockPRReviewService = {
      setPersona: jest.fn(),
      analyze: jest.fn(),
    };

    const mockAutoFixService = {
      generateAutoFixes: jest.fn(),
    };

    const mockSummaryService = {
      generateNaturalLanguageSummary: jest.fn(),
    };

    const mockLabelingService = {
      generateLabels: jest.fn(),
    };

    const mockChangelogService = {
      generateChangelogEntry: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnhancedPRAgentService,
        { provide: GithubService, useValue: mockGithubService },
        { provide: PRReviewAgentService, useValue: mockPRReviewService },
        { provide: AutoFixService, useValue: mockAutoFixService },
        { provide: PRSummaryService, useValue: mockSummaryService },
        { provide: PRLabelingService, useValue: mockLabelingService },
        { provide: ChangelogService, useValue: mockChangelogService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EnhancedPRAgentService>(EnhancedPRAgentService);
    githubService = module.get(GithubService);
    prReviewService = module.get(PRReviewAgentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should process full PR analysis', async () => {
    // Mock GitHub API responses
    githubService.getPullRequest.mockResolvedValue(mockPRData as any);
    githubService.getPullRequestFiles.mockResolvedValue(mockFiles as any);
    githubService.getFileContent.mockResolvedValue(
      'function authenticate() {\n  console.log("auth");\n}',
    );

    // Mock service responses
    prReviewService.analyze.mockResolvedValue({
      agentName: 'PR Review Agent',
      analysisTime: 1000,
      comments: [
        {
          file: 'src/auth.ts',
          line: 2,
          message: 'Console statement detected',
          severity: 'low',
          category: 'style',
          suggestion: 'Use proper logging',
          ruleId: 'STYLE-001',
        },
      ],
      summary: 'Found 1 style issue',
      score: 85,
    });

    const result = await service.processFullPRAnalysis(
      'testowner',
      'testrepo',
      123,
      {
        persona: 'senior',
        enableAutoFix: true,
        enableAutoLabeling: true,
      },
    );

    expect(result).toBeDefined();
    expect(result.prNumber).toBe(123);
    expect(result.reviewResult.comments).toHaveLength(1);
    expect(githubService.getPullRequest).toHaveBeenCalledWith(
      'testowner',
      'testrepo',
      123,
    );
    expect(githubService.getPullRequestFiles).toHaveBeenCalledWith(
      'testowner',
      'testrepo',
      123,
    );
  });

  it('should handle errors gracefully', async () => {
    githubService.getPullRequest.mockRejectedValue(
      new Error('GitHub API error'),
    );

    await expect(
      service.processFullPRAnalysis('testowner', 'testrepo', 123),
    ).rejects.toThrow('GitHub API error');
  });
});
