import { Injectable, Logger } from '@nestjs/common';
import { ReviewComment } from '../base/agent-result.interface';
import { GroqService } from '../../shared/lln.service';

export interface AutoFixSuggestion {
  file: string;
  originalCode: string;
  fixedCode: string;
  description: string;
  confidence: number; // 0-100
  ruleId: string;
  line: number;
}

export interface AutoFixResult {
  fixes: AutoFixSuggestion[];
  summary: string;
  totalIssuesFixed: number;
  confidenceScore: number;
}

@Injectable()
export class AutoFixService {
  private readonly logger = new Logger(AutoFixService.name);

  constructor(private readonly groqService: GroqService) {}

  async generateAutoFixes(
    comments: ReviewComment[],
    fileContents: Map<string, string>,
  ): Promise<AutoFixResult> {
    const fixes: AutoFixSuggestion[] = [];

    // Filter comments that can be auto-fixed
    const fixableComments = comments.filter(
      (comment) =>
        this.isAutoFixable(comment) && fileContents.has(comment.file),
    );

    for (const comment of fixableComments) {
      try {
        const fileContent = fileContents.get(comment.file)!;
        const fix = await this.generateFix(comment, fileContent);
        if (fix) {
          fixes.push(fix);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to generate fix for ${comment.file}:${comment.line}: ${error.message}`,
        );
      }
    }

    const confidenceScore =
      fixes.length > 0
        ? fixes.reduce((sum, fix) => sum + fix.confidence, 0) / fixes.length
        : 0;

    return {
      fixes,
      summary: this.generateFixSummary(fixes),
      totalIssuesFixed: fixes.length,
      confidenceScore,
    };
  }

  private isAutoFixable(comment: ReviewComment): boolean {
    const autoFixableCategories = ['style', 'quality'];
    const autoFixableRules = [
      'STYLE-001', // Console statements
      'STYLE-002', // TODO comments
      'QUAL-002', // Magic numbers
      'QUAL-003', // Empty catch blocks
    ];

    return (
      autoFixableCategories.includes(comment.category) ||
      Boolean(comment.ruleId && autoFixableRules.includes(comment.ruleId))
    );
  }

  private async generateFix(
    comment: ReviewComment,
    fileContent: string,
  ): Promise<AutoFixSuggestion | null> {
    const lines = fileContent.split('\n');
    const targetLine = comment.line ? comment.line - 1 : 0;

    if (targetLine >= lines.length) {
      return null;
    }

    const originalCode = lines[targetLine];
    const contextLines = this.getContextLines(lines, targetLine, 3);

    const prompt = `Fix the following code issue:

**Issue**: ${comment.message}
**Category**: ${comment.category}
**Severity**: ${comment.severity}
**Suggestion**: ${comment.suggestion || 'Apply best practices'}

**Original Code Context**:
\`\`\`typescript
${contextLines.join('\n')}
\`\`\`

**Target Line**: ${originalCode}

Provide ONLY the fixed version of the target line. Do not include explanations or markdown formatting.
If the fix requires multiple lines, provide them separated by newlines.
If the line should be removed, respond with "REMOVE_LINE".`;

    try {
      const response = await this.groqService.complete(prompt, {
        temperature: 0.1,
        maxTokens: 200,
      });

      const fixedCode = response.trim();

      if (!fixedCode || fixedCode === originalCode) {
        return null;
      }

      const confidence = this.calculateConfidence(
        comment,
        originalCode,
        fixedCode,
      );

      return {
        file: comment.file,
        originalCode,
        fixedCode: fixedCode === 'REMOVE_LINE' ? '' : fixedCode,
        description: `Auto-fix for: ${comment.message}`,
        confidence,
        ruleId: comment.ruleId || 'AUTO-FIX',
        line: comment.line || targetLine + 1,
      };
    } catch (error) {
      this.logger.error(`Failed to generate fix: ${error.message}`);
      return null;
    }
  }

  private getContextLines(
    lines: string[],
    targetLine: number,
    contextSize: number,
  ): string[] {
    const start = Math.max(0, targetLine - contextSize);
    const end = Math.min(lines.length, targetLine + contextSize + 1);

    return lines.slice(start, end).map((line, index) => {
      const lineNumber = start + index + 1;
      const marker = start + index === targetLine ? '>>> ' : '    ';
      return `${marker}${lineNumber}: ${line}`;
    });
  }

  private calculateConfidence(
    comment: ReviewComment,
    originalCode: string,
    fixedCode: string,
  ): number {
    let confidence = 50; // Base confidence

    // Higher confidence for style issues
    if (comment.category === 'style') {
      confidence += 30;
    }

    // Higher confidence for simple fixes
    if (comment.ruleId === 'STYLE-001' && originalCode.includes('console.')) {
      confidence += 20;
    }

    // Lower confidence for complex logic changes
    if (comment.category === 'quality' && comment.severity === 'high') {
      confidence -= 20;
    }

    // Confidence based on code similarity
    const similarity = this.calculateSimilarity(originalCode, fixedCode);
    if (similarity > 0.7) {
      confidence += 10;
    }

    return Math.min(100, Math.max(0, confidence));
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator,
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private generateFixSummary(fixes: AutoFixSuggestion[]): string {
    if (fixes.length === 0) {
      return 'No auto-fixable issues found.';
    }

    const categories = fixes.reduce(
      (acc, fix) => {
        const category = fix.ruleId.split('-')[0].toLowerCase();
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const categoryList = Object.entries(categories)
      .map(([cat, count]) => `${count} ${cat}`)
      .join(', ');

    const avgConfidence = Math.round(
      fixes.reduce((sum, fix) => sum + fix.confidence, 0) / fixes.length,
    );

    return `🔧 Generated ${fixes.length} auto-fixes: ${categoryList}. Average confidence: ${avgConfidence}%`;
  }
}
