import { Controller, Post, Body, Get, Param, Put } from '@nestjs/common';
import { PRReviewAgentService } from './pr-review-agent.service';
import {
  EnhancedPRAgentService,
  PRProcessingConfig,
} from './enhanced-pr-agent.service';
import { AutoFixService } from './auto-fix.service';
import { PRSummaryService } from './pr-summary.service';
import { PRLabelingService } from './pr-labeling.service';
import { ChangelogService } from './changelog.service';
import { PersonaConfig, ReviewPersona } from './persona.config';
import { CodeContext } from '../base/agent-result.interface';

@Controller('pr-review')
export class PRReviewController {
  constructor(
    private readonly prReviewService: PRReviewAgentService,
    private readonly enhancedPRService: EnhancedPRAgentService,
    private readonly autoFixService: AutoFixService,
    private readonly summaryService: PRSummaryService,
    private readonly labelingService: PRLabelingService,
    private readonly changelogService: ChangelogService,
  ) {}

  // Enhanced PR Analysis Endpoints
  @Post('analyze/enhanced')
  async analyzeEnhancedPR(
    @Body()
    body: {
      owner: string;
      repo: string;
      prNumber: number;
      config?: Partial<PRProcessingConfig>;
    },
  ) {
    return await this.enhancedPRService.processFullPRAnalysis(
      body.owner,
      body.repo,
      body.prNumber,
      body.config,
    );
  }

  @Post('analyze/enhanced/with-review')
  async analyzeAndReview(
    @Body()
    body: {
      owner: string;
      repo: string;
      prNumber: number;
      commitSha: string;
      config?: Partial<PRProcessingConfig>;
    },
  ) {
    const analysis = await this.enhancedPRService.processFullPRAnalysis(
      body.owner,
      body.repo,
      body.prNumber,
      body.config,
    );

    await this.enhancedPRService.postEnhancedReview(
      body.owner,
      body.repo,
      analysis,
      body.commitSha,
    );

    return analysis;
  }

  // Summary Endpoints
  @Post('summary')
  async generateSummary(
    @Body() body: { context: CodeContext; persona?: string },
  ) {
    const persona = PersonaConfig.getPersona(body.persona || 'senior');
    return await this.summaryService.generateNaturalLanguageSummary(
      body.context,
      persona,
    );
  }

  // Auto-Fix Endpoints
  @Post('auto-fix/analyze')
  async analyzeAutoFixes(
    @Body() body: { comments: any[]; fileContents: Record<string, string> },
  ) {
    const fileContentsMap = new Map(Object.entries(body.fileContents));
    return await this.autoFixService.generateAutoFixes(
      body.comments,
      fileContentsMap,
    );
  }

  // Labeling Endpoints
  @Post('labels/generate')
  async generateLabels(
    @Body() body: { context: CodeContext; summary: any; comments?: any[] },
  ) {
    return await this.labelingService.generateLabels(
      body.context,
      body.summary,
      body.comments,
    );
  }

  @Get('labels/recommended/:owner/:repo/:prNumber')
  async getRecommendedLabels(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('prNumber') prNumber: number,
  ) {
    // This would integrate with the enhanced service to get recommendations
    return { message: 'Feature requires full PR analysis' };
  }

  // Changelog Endpoints
  @Post('changelog/generate')
  async generateChangelogEntry(
    @Body() body: { context: CodeContext; summary: any; config?: any },
  ) {
    return await this.changelogService.generateChangelogEntry(
      body.context,
      body.summary,
      body.config,
    );
  }

  @Post('changelog/update')
  async updateChangelog(@Body() body: { entry: any; config?: any }) {
    await this.changelogService.updateChangelog(body.entry, body.config);
    return { message: 'Changelog updated successfully' };
  }

  // Original Endpoints (maintained for backward compatibility)
  @Post('analyze')
  async analyzePR(@Body() context: CodeContext) {
    return await this.prReviewService.analyze(context);
  }

  @Get('personas')
  getAvailablePersonas(): ReviewPersona[] {
    return PersonaConfig.getAllPersonas();
  }

  @Get('personas/names')
  getPersonaNames(): string[] {
    return PersonaConfig.getPersonaNames();
  }

  @Get('personas/:name')
  getPersona(@Param('name') name: string): ReviewPersona {
    return PersonaConfig.getPersona(name);
  }

  @Put('persona')
  setPersona(@Body('persona') personaName: string) {
    const persona = PersonaConfig.getPersona(personaName);
    this.prReviewService.setPersona(persona);
    return {
      message: `Persona set to: ${persona.name}`,
      persona: persona.name,
      description: persona.description,
    };
  }

  @Get('current-persona')
  getCurrentPersona(): ReviewPersona {
    return this.prReviewService.getPersona();
  }

  @Post('personas/custom')
  addCustomPersona(
    @Body() customPersona: { name: string; persona: ReviewPersona },
  ) {
    PersonaConfig.addCustomPersona(customPersona.name, customPersona.persona);
    return {
      message: `Custom persona '${customPersona.name}' added successfully`,
    };
  }

  @Post('analyze-with-persona')
  async analyzeWithPersona(
    @Body() body: { context: CodeContext; persona?: string },
  ) {
    if (body.persona) {
      const persona = PersonaConfig.getPersona(body.persona);
      this.prReviewService.setPersona(persona);
    }

    return await this.prReviewService.analyze(body.context);
  }

  @Get('config')
  getAgentConfig() {
    return {
      config: this.prReviewService.getConfig(),
      currentPersona: this.prReviewService.getPersona(),
      availablePersonas: PersonaConfig.getPersonaNames(),
    };
  }

  // Configuration and Status Endpoints
  @Get('features')
  getAvailableFeatures() {
    return {
      features: [
        'natural-language-summary',
        'auto-fix-suggestions',
        'persona-based-review',
        'auto-labeling',
        'changelog-generation',
        'ci-integration',
        'inline-comments',
        'security-analysis',
        'performance-analysis',
      ],
      personas: PersonaConfig.getPersonaNames(),
      supportedFileTypes: ['js', 'ts', 'jsx', 'tsx', 'json', 'md'],
    };
  }

  @Get('health')
  getHealthStatus() {
    return {
      status: 'healthy',
      services: {
        prReview: 'active',
        autoFix: 'active',
        summary: 'active',
        labeling: 'active',
        changelog: 'active',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
