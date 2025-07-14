import { Injectable } from '@nestjs/common';
import { BaseAgentService } from '../base/base-agent.service';
import {
  AgentConfig,
  AgentResult,
  CodeContext,
  ReviewComment,
} from '../base/agent-result.interface';

@Injectable()
export class SecurityAgentService extends BaseAgentService {
  private readonly config: AgentConfig = {
    name: 'Security Agent',
    description:
      'Analyzes code for security vulnerabilities and best practices',
    supportedFileTypes: [
      'js',
      'ts',
      'jsx',
      'tsx',
      'py',
      'java',
      'cs',
      'php',
      'go',
      'rb',
      'rs',
    ],
    enabled: true,
    priority: 9, // High priority for security
    maxTokens: 2000,
    temperature: 0.1,
  };

  getConfig(): AgentConfig {
    return this.config;
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
          summary: 'No relevant files found for security analysis',
          score: 100,
        };
      }

      const comments: ReviewComment[] = [];

      for (const file of relevantFiles) {
        const fileComments = await this.analyzeFile(file.filename, file.patch);
        comments.push(...fileComments);
      }

      const score = this.calculateSecurityScore(comments);
      const summary = this.generateSummary(comments, relevantFiles.length);

      return this.validateResult({
        agentName: this.config.name,
        analysisTime: Date.now() - startTime,
        comments,
        summary,
        score,
        metadata: {
          filesAnalyzed: relevantFiles.length,
          vulnerabilitiesFound: comments.filter((c) => c.severity === 'high')
            .length,
        },
      });
    } catch (error) {
      this.logger.error(
        `Security analysis failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async analyzeFile(
    filename: string,
    patch: string,
  ): Promise<ReviewComment[]> {
    const systemPrompt = `You are a security expert reviewing code changes. Focus on:

1. **Authentication & Authorization**: Improper access controls, weak authentication
2. **Input Validation**: SQL injection, XSS, command injection vulnerabilities
3. **Data Protection**: Sensitive data exposure, weak encryption
4. **API Security**: Rate limiting, CORS issues, API key exposure
5. **Dependency Security**: Known vulnerable packages
6. **Configuration**: Insecure defaults, hardcoded secrets
7. **Error Handling**: Information leakage through errors

Respond with a JSON array of findings:
[
  {
    "file": "filename",
    "line": 42,
    "message": "Detailed security issue description",
    "severity": "high|medium|low",
    "category": "authentication|injection|exposure|configuration|dependency",
    "suggestion": "How to fix this issue",
    "ruleId": "SEC-001"
  }
]

Only report actual security issues, not general code quality.`;

    const userPrompt = `Review this code change for security vulnerabilities:

**File**: ${filename}
**Changes**:
\`\`\`diff
${patch}
\`\`\`

Focus on the added/modified lines (+ prefix). Provide specific line numbers and actionable fixes.`;

    const response = await this.callLLM(systemPrompt, userPrompt, 0.1);
    return this.parseResponse(response);
  }

  private calculateSecurityScore(comments: ReviewComment[]): number {
    if (comments.length === 0) return 100;

    const severityWeights = { high: 30, medium: 10, low: 3 };
    const totalDeduction = comments.reduce((sum, comment) => {
      return sum + severityWeights[comment.severity];
    }, 0);

    return Math.max(0, 100 - totalDeduction);
  }

  private generateSummary(
    comments: ReviewComment[],
    filesAnalyzed: number,
  ): string {
    if (comments.length === 0) {
      return `✅ Security analysis complete. Reviewed ${filesAnalyzed} files - no security issues found.`;
    }

    const high = comments.filter((c) => c.severity === 'high').length;
    const medium = comments.filter((c) => c.severity === 'medium').length;
    const low = comments.filter((c) => c.severity === 'low').length;

    const categories = [...new Set(comments.map((c) => c.category))];
    const categorySummary = categories.slice(0, 3).join(', ');

    let summary = `🔒 Security analysis found ${comments.length} issue(s) across ${filesAnalyzed} files. `;

    if (high > 0) {
      summary += `${high} high severity (immediate attention required). `;
    }
    if (medium > 0) {
      summary += `${medium} medium severity. `;
    }
    if (low > 0) {
      summary += `${low} low severity. `;
    }

    summary += `Main categories: ${categorySummary}.`;

    return summary;
  }
}
