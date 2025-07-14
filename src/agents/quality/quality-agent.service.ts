import { Injectable } from '@nestjs/common';
import { BaseAgentService } from '../base/base-agent.service';
import {
  AgentConfig,
  AgentResult,
  CodeContext,
  ReviewComment,
} from '../base/agent-result.interface';

@Injectable()
export class QualityAgentService extends BaseAgentService {
  private readonly config: AgentConfig = {
    name: 'Code Quality Agent',
    description:
      'Analyzes code for quality, maintainability, and best practices',
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
      'cpp',
      'c',
    ],
    enabled: true,
    priority: 7, // High priority for code quality
    maxTokens: 2000,
    temperature: 0.2,
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
          summary: 'No relevant files found for quality analysis',
          score: 100,
        };
      }

      const comments: ReviewComment[] = [];

      for (const file of relevantFiles) {
        const fileComments = await this.analyzeFile(
          file.filename,
          file.patch,
          context,
        );
        comments.push(...fileComments);
      }

      const score = this.calculateQualityScore(comments);
      const summary = this.generateSummary(comments, relevantFiles.length);

      return this.validateResult({
        agentName: this.config.name,
        analysisTime: Date.now() - startTime,
        comments,
        summary,
        score,
        metadata: {
          filesAnalyzed: relevantFiles.length,
          criticalIssues: comments.filter((c) => c.severity === 'high').length,
          codeSmells: comments.filter((c) => c.category === 'code-smell')
            .length,
          maintainabilityScore: this.calculateMaintainabilityScore(comments),
        },
      });
    } catch (error) {
      this.logger.error(
        `Quality analysis failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async analyzeFile(
    filename: string,
    patch: string,
    context: CodeContext,
  ): Promise<ReviewComment[]> {
    const fileExtension = this.getFileExtension(filename);
    const systemPrompt = this.getSystemPrompt(fileExtension);

    const userPrompt = `Review this code change for quality issues:

**File**: ${filename}
**PR Context**: ${context.title}
**Changes**:
\`\`\`diff
${patch}
\`\`\`

**Focus Areas**:
- Code structure and organization
- Variable/function naming
- Code complexity and readability
- Error handling patterns
- Design patterns usage
- Code duplication
- Function/class size and responsibility

Analyze only the added/modified lines (+ prefix). Provide specific line numbers and actionable improvements.`;

    const response = await this.callLLM(systemPrompt, userPrompt, 0.2);
    return this.parseResponse(response);
  }

  private getSystemPrompt(fileExtension: string): string {
    const basePrompt = `You are a senior software engineer reviewing code changes for quality and maintainability. Focus on:

1. **Code Structure**: Proper organization, modularity, separation of concerns
2. **Naming Conventions**: Clear, descriptive names for variables, functions, classes
3. **Function Design**: Single responsibility, appropriate length, clear parameters
4. **Error Handling**: Proper exception handling, meaningful error messages
5. **Code Complexity**: Cyclomatic complexity, nested conditions, code clarity
6. **Design Patterns**: Appropriate use of patterns, avoiding anti-patterns
7. **Documentation**: Missing or unclear comments, self-documenting code
8. **Code Duplication**: DRY principle violations, repeated logic
9. **Performance Considerations**: Obvious inefficiencies, resource usage`;

    const languageSpecific = this.getLanguageSpecificRules(fileExtension);

    return `${basePrompt}

${languageSpecific}

Respond with a JSON array of findings:
[
  {
    "file": "filename",
    "line": 42,
    "message": "Detailed quality issue description",
    "severity": "high|medium|low",
    "category": "structure|naming|complexity|error-handling|design-pattern|duplication|documentation|performance",
    "suggestion": "Specific improvement recommendation",
    "ruleId": "QUAL-001"
  }
]

Prioritize issues that significantly impact maintainability and readability.`;
  }

  private getLanguageSpecificRules(fileExtension: string): string {
    const rules = {
      ts: `
**TypeScript/JavaScript Specific**:
- Type safety and proper type definitions
- Async/await vs Promise patterns
- Proper use of const/let/var
- ES6+ features usage
- Module imports/exports organization`,

      py: `
**Python Specific**:
- PEP 8 compliance
- Proper use of list comprehensions
- Context managers (with statements)
- Exception handling best practices
- Docstring conventions`,

      java: `
**Java Specific**:
- Proper use of access modifiers
- Stream API usage
- Exception handling patterns
- Null safety considerations
- Interface vs abstract class usage`,

      go: `
**Go Specific**:
- Error handling patterns
- Goroutine and channel usage
- Interface design
- Package organization
- Proper resource cleanup`,

      rs: `
**Rust Specific**:
- Ownership and borrowing patterns
- Error handling with Result/Option
- Trait usage and implementations
- Memory safety considerations
- Idiomatic Rust patterns`,
    };

    return rules[fileExtension] || rules['ts']; // Default to TypeScript rules
  }

  private calculateQualityScore(comments: ReviewComment[]): number {
    if (comments.length === 0) return 100;

    const severityWeights = { high: 20, medium: 8, low: 2 };
    const categoryWeights = {
      structure: 1.5,
      complexity: 1.4,
      'error-handling': 1.3,
      'design-pattern': 1.2,
      naming: 1.1,
      duplication: 1.1,
      documentation: 0.8,
      performance: 1.0,
    };

    const totalDeduction = comments.reduce((sum, comment) => {
      const severityScore = severityWeights[comment.severity];
      const categoryMultiplier = categoryWeights[comment.category] || 1.0;
      return sum + severityScore * categoryMultiplier;
    }, 0);

    return Math.max(0, 100 - totalDeduction);
  }

  private calculateMaintainabilityScore(comments: ReviewComment[]): number {
    const maintainabilityCategories = [
      'structure',
      'complexity',
      'naming',
      'duplication',
    ];
    const maintainabilityIssues = comments.filter((c) =>
      maintainabilityCategories.includes(c.category),
    );

    if (maintainabilityIssues.length === 0) return 100;

    const severityWeights = { high: 25, medium: 10, low: 3 };
    const totalDeduction = maintainabilityIssues.reduce((sum, comment) => {
      return sum + severityWeights[comment.severity];
    }, 0);

    return Math.max(0, 100 - totalDeduction);
  }

  private generateSummary(
    comments: ReviewComment[],
    filesAnalyzed: number,
  ): string {
    if (comments.length === 0) {
      return `✅ Code quality analysis complete. Reviewed ${filesAnalyzed} files - excellent code quality maintained.`;
    }

    const high = comments.filter((c) => c.severity === 'high').length;
    const medium = comments.filter((c) => c.severity === 'medium').length;
    const low = comments.filter((c) => c.severity === 'low').length;

    // Get top categories
    const categoryCount = comments.reduce(
      (acc: Record<string, number>, comment) => {
        acc[comment.category] = (acc[comment.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, count]) => `${category} (${count})`)
      .join(', ');

    let summary = `📊 Code quality analysis found ${comments.length} issue(s) across ${filesAnalyzed} files. `;

    if (high > 0) {
      summary += `${high} critical quality issues requiring immediate attention. `;
    }
    if (medium > 0) {
      summary += `${medium} moderate issues. `;
    }
    if (low > 0) {
      summary += `${low} minor improvements. `;
    }

    summary += `Main areas for improvement: ${topCategories}.`;

    // Add specific recommendations
    const hasComplexity = comments.some((c) => c.category === 'complexity');
    const hasNaming = comments.some((c) => c.category === 'naming');
    const hasDuplication = comments.some((c) => c.category === 'duplication');

    if (hasComplexity || hasNaming || hasDuplication) {
      summary += ' Focus on ';
      const focuses = [];
      if (hasComplexity) focuses.push('reducing complexity');
      if (hasNaming) focuses.push('improving naming');
      if (hasDuplication) focuses.push('eliminating duplication');
      summary += focuses.join(', ') + '.';
    }

    return summary;
  }
}
