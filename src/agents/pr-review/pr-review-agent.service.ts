import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseAgentService } from '../base/base-agent.service';
import {
  AgentConfig,
  AgentResult,
  CodeContext,
  ReviewComment,
} from '../base/agent-result.interface';
import { PersonaConfig, ReviewPersona } from './persona.config';
import { PRReviewPrompts } from './prompts';
import { GroqService } from '../../shared/lln.service';

@Injectable()
export class PRReviewAgentService extends BaseAgentService {
  private readonly config: AgentConfig = {
    name: 'PR Review Agent',
    description:
      'Comprehensive PR review for JS/TS code quality, security, and style',
    supportedFileTypes: ['js', 'ts', 'jsx', 'tsx', 'json', 'md'],
    enabled: true,
    priority: 9,
    maxTokens: 4000,
    temperature: 0.1,
  };

  private currentPersona: ReviewPersona;

  constructor(
    protected readonly groqService: GroqService,
    private readonly configService: ConfigService,
  ) {
    super(groqService);
    this.currentPersona = this.getPersonaFromConfig();
  }

  getConfig(): AgentConfig {
    return this.config;
  }

  /**
   * Set the review persona for this agent
   */
  setPersona(persona: ReviewPersona): void {
    this.currentPersona = persona;
  }

  /**
   * Get current persona
   */
  getPersona(): ReviewPersona {
    return this.currentPersona;
  }

  async analyze(context: CodeContext): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      const relevantFiles = context.files.filter(
        (file) =>
          this.shouldAnalyzeFile(file.filename) && file.status !== 'removed',
      );

      if (relevantFiles.length === 0) {
        return {
          agentName: this.config.name,
          analysisTime: Date.now() - startTime,
          comments: [],
          summary: 'No relevant JS/TS files found for review',
          score: 100,
        };
      }

      const comments: ReviewComment[] = [];
      const analysisResults = {
        quality: [] as ReviewComment[],
        security: [] as ReviewComment[],
        style: [] as ReviewComment[],
        performance: [] as ReviewComment[],
        testing: [] as ReviewComment[],
      };

      // Analyze each file
      for (const file of relevantFiles) {
        const fileResults = await this.analyzeFile(file, context);

        // Categorize results
        fileResults.forEach((comment) => {
          comments.push(comment);
          this.categorizeComment(comment, analysisResults);
        });
      }

      const score = this.calculateOverallScore(analysisResults);
      const summary = this.generatePersonalizedSummary(
        analysisResults,
        relevantFiles.length,
      );

      return this.validateResult({
        agentName: this.config.name,
        analysisTime: Date.now() - startTime,
        comments,
        summary,
        score,
        metadata: {
          persona: this.currentPersona.name,
          filesAnalyzed: relevantFiles.length,
          qualityIssues: analysisResults.quality.length,
          securityIssues: analysisResults.security.length,
          styleIssues: analysisResults.style.length,
          performanceIssues: analysisResults.performance.length,
          testingIssues: analysisResults.testing.length,
          criticalIssues: comments.filter((c) => c.severity === 'high').length,
        },
      });
    } catch (error) {
      this.logger.error(
        `PR Review analysis failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async analyzeFile(
    file: any,
    context: CodeContext,
  ): Promise<ReviewComment[]> {
    const fileExtension = this.getFileExtension(file.filename);
    const systemPrompt = PRReviewPrompts.getSystemPrompt(
      this.currentPersona,
      fileExtension,
    );

    const userPrompt = PRReviewPrompts.getUserPrompt(
      file,
      context,
      this.currentPersona,
    );

    const response = await this.callLLM(
      systemPrompt,
      userPrompt,
      this.currentPersona.temperature,
    );
    return this.parseResponse(response);
  }

  private categorizeComment(comment: ReviewComment, results: any): void {
    const category = comment.category.toLowerCase();

    if (category.includes('security') || category.includes('vulnerability')) {
      results.security.push(comment);
    } else if (
      category.includes('style') ||
      category.includes('format') ||
      category.includes('lint')
    ) {
      results.style.push(comment);
    } else if (
      category.includes('performance') ||
      category.includes('optimization')
    ) {
      results.performance.push(comment);
    } else if (category.includes('test') || category.includes('coverage')) {
      results.testing.push(comment);
    } else {
      results.quality.push(comment);
    }
  }

  private calculateOverallScore(results: any): number {
    const weights = {
      security: 0.3,
      quality: 0.25,
      performance: 0.2,
      style: 0.15,
      testing: 0.1,
    };

    const severityWeights = { high: 25, medium: 10, low: 3 };

    let totalDeduction = 0;

    Object.entries(results).forEach(
      ([category, comments]: [string, ReviewComment[]]) => {
        const categoryWeight = weights[category as keyof typeof weights] || 0.2;
        const categoryDeduction = comments.reduce((sum, comment) => {
          return sum + severityWeights[comment.severity] * categoryWeight;
        }, 0);
        totalDeduction += categoryDeduction;
      },
    );

    return Math.max(0, 100 - totalDeduction);
  }

  private generatePersonalizedSummary(
    results: any,
    filesAnalyzed: number,
  ): string {
    const totalIssues = Object.values(results).reduce(
      (sum: number, comments: any) => sum + comments.length,
      0,
    );

    if (totalIssues === 0) {
      return (
        this.currentPersona.positiveMessages[
          Math.floor(
            Math.random() * this.currentPersona.positiveMessages.length,
          )
        ] + ` Reviewed ${filesAnalyzed} files - excellent work! 🎉`
      );
    }

    let summary = `${this.currentPersona.greeting} `;

    // Add issue breakdown
    const issueBreakdown: string[] = [];
    if (results.security.length > 0)
      issueBreakdown.push(`🔒 ${results.security.length} security`);
    if (results.quality.length > 0)
      issueBreakdown.push(`📊 ${results.quality.length} quality`);
    if (results.performance.length > 0)
      issueBreakdown.push(`⚡ ${results.performance.length} performance`);
    if (results.style.length > 0)
      issueBreakdown.push(`🎨 ${results.style.length} style`);
    if (results.testing.length > 0)
      issueBreakdown.push(`🧪 ${results.testing.length} testing`);

    summary += `Found ${totalIssues} issue(s) across ${filesAnalyzed} files: ${issueBreakdown.join(', ')}. `;

    // Add persona-specific advice
    const highSeverityCount = Object.values(results)
      .flat()
      .filter((comment: any) => comment.severity === 'high').length;

    if (highSeverityCount > 0) {
      summary += this.currentPersona.criticalAdvice;
    } else {
      summary += this.currentPersona.generalAdvice;
    }

    return summary;
  }

  private getPersonaFromConfig(): ReviewPersona {
    const personaName = this.configService.get<string>(
      'PR_REVIEW_PERSONA',
      'senior',
    );
    return PersonaConfig.getPersona(personaName);
  }
}
