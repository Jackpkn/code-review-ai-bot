import { Injectable } from '@nestjs/common';
import { BaseAgentService } from '../base/base-agent.service';
import {
  AgentConfig,
  AgentResult,
  CodeContext,
  ReviewComment,
} from '../base/agent-result.interface';

@Injectable()
export class SummaryAgentService extends BaseAgentService {
  private readonly config: AgentConfig = {
    name: 'Summary Agent',
    description: 'Aggregates and summarizes all agent analysis results',
    supportedFileTypes: [], // Works with all file types
    enabled: true,
    priority: 10, // Highest priority - runs last
    maxTokens: 3000,
    temperature: 0.3,
  };

  getConfig(): AgentConfig {
    return this.config;
  }

  async analyze(context: CodeContext): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      // This method should be called by orchestrator with agent results
      throw new Error(
        'Summary agent should be called via summarizeResults method',
      );
    } catch (error) {
      this.logger.error(
        `Summary analysis failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Main method to aggregate and summarize all agent results
   */
  async summarizeResults(
    context: CodeContext,
    agentResults: AgentResult[],
  ): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      if (agentResults.length === 0) {
        return {
          agentName: this.config.name,
          analysisTime: Date.now() - startTime,
          comments: [],
          summary: 'No agent results to summarize',
          score: 100,
        };
      }

      const aggregatedComments = this.aggregateComments(agentResults);
      const overallScore = this.calculateOverallScore(agentResults);
      const summary = await this.generateComprehensiveSummary(
        context,
        agentResults,
        aggregatedComments,
      );
      const prioritizedComments = this.prioritizeComments(aggregatedComments);

      return this.validateResult({
        agentName: this.config.name,
        analysisTime: Date.now() - startTime,
        comments: prioritizedComments,
        summary,
        score: overallScore,
        metadata: {
          agentCount: agentResults.length,
          totalIssues: aggregatedComments.length,
          criticalIssues: aggregatedComments.filter(
            (c) => c.severity === 'high',
          ).length,
          averageAgentScore: this.calculateAverageScore(agentResults),
          topConcerns: this.getTopConcerns(aggregatedComments),
          processingTime: agentResults.reduce(
            (sum, r) => sum + r.analysisTime,
            0,
          ),
        },
      });
    } catch (error) {
      this.logger.error(
        `Summary generation failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private aggregateComments(agentResults: AgentResult[]): ReviewComment[] {
    const allComments: ReviewComment[] = [];

    agentResults.forEach((result) => {
      result.comments.forEach((comment) => {
        // Add agent source to comment
        const enhancedComment = {
          ...comment,
          source: result.agentName,
        };
        allComments.push(enhancedComment);
      });
    });

    return this.deduplicateComments(allComments);
  }

  private deduplicateComments(comments: ReviewComment[]): ReviewComment[] {
    const seen = new Map<string, ReviewComment>();

    comments.forEach((comment) => {
      const key = `${comment.file}:${comment.line}:${comment.message.substring(0, 50)}`;

      if (!seen.has(key)) {
        seen.set(key, comment);
      } else {
        // If duplicate, keep the one with higher severity
        const existing = seen.get(key);
        const severityOrder = { high: 3, medium: 2, low: 1 };

        if (
          existing &&
          severityOrder[comment.severity] > severityOrder[existing.severity]
        ) {
          seen.set(key, comment);
        }
      }
    });

    return Array.from(seen.values());
  }

  private prioritizeComments(comments: ReviewComment[]): ReviewComment[] {
    return comments.sort((a, b) => {
      // Primary sort: severity (high -> medium -> low)
      const severityOrder = { high: 3, medium: 2, low: 1 };
      const severityDiff =
        severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;

      // Secondary sort: category importance
      const categoryOrder = {
        security: 10,
        authentication: 9,
        injection: 9,
        exposure: 8,
        algorithm: 7,
        memory: 6,
        database: 6,
        structure: 5,
        complexity: 5,
        network: 4,
        naming: 3,
        documentation: 2,
        performance: 4,
      };

      const categoryDiff =
        (categoryOrder[b.category] || 1) - (categoryOrder[a.category] || 1);
      if (categoryDiff !== 0) return categoryDiff;

      // Tertiary sort: file name
      return a.file.localeCompare(b.file);
    });
  }

  private calculateOverallScore(agentResults: AgentResult[]): number {
    if (agentResults.length === 0) return 100;

    const agentWeights = {
      'Security Agent': 0.3,
      'Code Quality Agent': 0.25,
      'Performance Agent': 0.2,
      'Testing Agent': 0.15,
      'Summary Agent': 0.1,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    agentResults.forEach((result) => {
      const weight = agentWeights[result.agentName] || 0.1;
      weightedSum += (result.score || 0) * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  private calculateAverageScore(agentResults: AgentResult[]): number {
    if (agentResults.length === 0) return 0;

    const totalScore = agentResults.reduce(
      (sum, result) => sum + (result.score || 0),
      0,
    );
    return Math.round(totalScore / agentResults.length);
  }

  private getTopConcerns(comments: ReviewComment[]): string[] {
    const categoryCount = comments.reduce(
      (acc: Record<string, number>, comment) => {
        acc[comment.category] = (acc[comment.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);
  }

  private async generateComprehensiveSummary(
    context: CodeContext,
    agentResults: AgentResult[],
    comments: ReviewComment[],
  ): Promise<string> {
    const systemPrompt = `You are a senior technical lead creating a comprehensive PR review summary. 

Your task is to synthesize multiple agent analysis results into a clear, actionable summary for developers.

Focus on:
1. **Overall Assessment**: High-level verdict on code quality and readiness
2. **Critical Issues**: Must-fix items before merge
3. **Key Recommendations**: Most impactful improvements
4. **Positive Aspects**: What's working well
5. **Next Steps**: Clear action items

Be concise but comprehensive. Use emojis for visual clarity. Structure as executive summary format.`;

    const userPrompt = `Analyze this PR review summary:

**PR Details**:
- Title: ${context.title}
- Author: ${context.author}
- Files Changed: ${context.files.length}
- Branch: ${context.branch}

**Agent Results**:
${agentResults
  .map(
    (result) => `
**${result.agentName}** (Score: ${result.score}/100)
- Analysis Time: ${result.analysisTime}ms
- Issues Found: ${result.comments.length}
- Summary: ${result.summary}
`,
  )
  .join('\n')}

**All Issues Summary**:
- Total Issues: ${comments.length}
- Critical (High): ${comments.filter((c) => c.severity === 'high').length}
- Medium: ${comments.filter((c) => c.severity === 'medium').length}
- Low: ${comments.filter((c) => c.severity === 'low').length}

**Top Issue Categories**:
${this.getTopConcerns(comments)
  .map((concern) => `- ${concern}`)
  .join('\n')}

Create a comprehensive summary that helps the team understand the PR's status and next steps.`;

    const response = await this.callLLM(systemPrompt, userPrompt, 0.3);
    return this.enhanceSummaryWithMetrics(response, agentResults, comments);
  }

  private enhanceSummaryWithMetrics(
    aiSummary: string,
    agentResults: AgentResult[],
    comments: ReviewComment[],
  ): string {
    const overallScore = this.calculateOverallScore(agentResults);
    const criticalIssues = comments.filter((c) => c.severity === 'high').length;
    const totalIssues = comments.length;

    // Add metrics header
    let enhancedSummary = `## 📊 PR Review Summary (Score: ${overallScore}/100)\n\n`;

    // Add status indicator
    if (overallScore >= 90) {
      enhancedSummary += `🟢 **Status: APPROVED** - Excellent code quality, ready to merge\n\n`;
    } else if (overallScore >= 75) {
      enhancedSummary += `🟡 **Status: APPROVED WITH SUGGESTIONS** - Good quality with minor improvements needed\n\n`;
    } else if (overallScore >= 60) {
      enhancedSummary += `🟠 **Status: CHANGES REQUESTED** - Moderate issues need addressing\n\n`;
    } else {
      enhancedSummary += `🔴 **Status: NEEDS MAJOR REVISION** - Significant issues must be fixed\n\n`;
    }

    // Add quick metrics
    enhancedSummary += `**Quick Metrics:**\n`;
    enhancedSummary += `- 🔍 Agents Run: ${agentResults.length}\n`;
    enhancedSummary += `- 📝 Total Issues: ${totalIssues}\n`;
    enhancedSummary += `- 🚨 Critical Issues: ${criticalIssues}\n`;
    enhancedSummary += `- ⚡ Analysis Time: ${agentResults.reduce((sum, r) => sum + r.analysisTime, 0)}ms\n\n`;

    // Add AI-generated summary
    enhancedSummary += aiSummary;

    // Add agent breakdown
    enhancedSummary += `\n\n## 🤖 Agent Breakdown\n`;
    agentResults.forEach((result) => {
      const icon = this.getAgentIcon(result.agentName);
      enhancedSummary += `${icon} **${result.agentName}**: ${result.score}/100 (${result.comments.length} issues)\n`;
    });

    return enhancedSummary;
  }

  private getAgentIcon(agentName: string): string {
    const icons = {
      'Security Agent': '🔒',
      'Code Quality Agent': '📊',
      'Performance Agent': '⚡',
      'Testing Agent': '🧪',
      'Summary Agent': '📋',
    };
    return icons[agentName] || '🤖';
  }

  /**
   * Generate a quick summary for webhook responses
   */
  generateQuickSummary(agentResults: AgentResult[]): string {
    const overallScore = this.calculateOverallScore(agentResults);
    const totalIssues = agentResults.reduce(
      (sum, result) => sum + result.comments.length,
      0,
    );
    const criticalIssues = agentResults.reduce(
      (sum, result) =>
        sum + result.comments.filter((c) => c.severity === 'high').length,
      0,
    );

    if (overallScore >= 90) {
      return `✅ PR looks great! Score: ${overallScore}/100 (${totalIssues} minor suggestions)`;
    } else if (overallScore >= 75) {
      return `👍 PR approved with suggestions. Score: ${overallScore}/100 (${totalIssues} issues, ${criticalIssues} critical)`;
    } else if (overallScore >= 60) {
      return `⚠️ Changes requested. Score: ${overallScore}/100 (${totalIssues} issues, ${criticalIssues} critical)`;
    } else {
      return `❌ Major revision needed. Score: ${overallScore}/100 (${totalIssues} issues, ${criticalIssues} critical)`;
    }
  }
}
