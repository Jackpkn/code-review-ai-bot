import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PullRequestFile } from 'src/github/github.service';
import { GroqService } from 'src/shared/lln.service';
export interface ReviewSuggestion {
  filename: string;
  line?: number;
  type:
  | 'bug'
  | 'improvement'
  | 'security'
  | 'naming'
  | 'edge_case'
  | 'documentation'
  | 'testing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  suggestedFix?: string;
}

export interface ReviewResult {
  summary: string;
  suggestions: ReviewSuggestion[];
  overallScore: number; //1-10
}
@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);
  private readonly model: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly groqService: GroqService,
  ) {
    this.model = this.configService.get<string>('GROQ_MODEL', 'meta-llama/llama-4-scout-17b-16e-instruct');
  }

  async reviewPullRequest(
    prData: { title: string; body: string; number: number },
    files: PullRequestFile[],
  ): Promise<ReviewResult> {
    try {
      this.logger.log(`Starting AI review for PR #${prData.number}`);

      // Filter out binary files and focus on code files
      const codeFiles = files.filter(
        (file) =>
          file.patch && this.isCodeFile(file.filename) && file.changes < 1000, // Skip very large files
      );

      if (codeFiles.length === 0) {
        return {
          summary: 'No code files found to review.',
          suggestions: [],
          overallScore: 8,
        };
      }

      // Prepare the context for AI
      const context = this.prepareReviewContext(prData, codeFiles);
      const response = await this.groqService.getGroqChatCompletion(context);
      const aiMessage = response.choices[0]?.message?.content;
      if (!aiMessage) {
        throw new Error('No content in Groq response');
      }
      // parese the AI response
      const reviewResult = this.parseAIResponse(aiMessage);

      this.logger.log(
        `AI review completed with ${reviewResult.suggestions.length} suggestions`,
      );
      return reviewResult;
    } catch (error) {
      this.logger.error(`AI review failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private isCodeFile(filename: string): boolean {
    const codeExtensions = [
      '.js',
      '.ts',
      '.jsx',
      '.tsx',
      '.py',
      '.java',
      '.cpp',
      '.c',
      '.cs',
      '.php',
      '.rb',
      '.go',
      '.rs',
      '.swift',
      '.kt',
      '.scala',
      '.r',
      '.sql',
      '.html',
      '.css',
      '.scss',
      '.sass',
      '.vue',
      '.svelte',
    ];

    return codeExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
  }
  private prepareReviewContext(
    prData: { title: string; body: string; number: number },
    files: PullRequestFile[],
  ): string {
    let context = `## Pull Request Information
        **Title:** ${prData.title}
        **Description:** ${prData.body || 'No description provided'}
        **PR Number:** #${prData.number}

        ## Files Changed (${files.length} files):
        `;

    files.slice(0, 10).forEach((file) => {
      const { filename, status, additions, deletions, patch } = file;

      const patchPreview = patch
        ? `${patch.substring(0, 2000)}${patch.length > 2000 ? '\n... (truncated)' : ''}`
        : 'No patch available';

      context += `
            ### File: ${filename}
            **Status:** ${status}
            **Changes:** +${additions} -${deletions}

            **Diff:**
            \`\`\`diff
            ${patchPreview}
            \`\`\`
                `;
    });

    return context;
  }

  private parseAIResponse(response: string): ReviewResult {
    try {
      this.logger.debug('Parsing AI response...');

      // Try to parse as JSON first (multiple patterns)
      const jsonPatterns = [
        /```json\n([\s\S]*?)\n```/, // Standard markdown JSON block
        /```\n([\s\S]*?)\n```/, // Generic code block
        /\{[\s\S]*\}/, // Any JSON-like content
      ];

      for (const pattern of jsonPatterns) {
        const match = response.match(pattern);
        if (match) {
          const jsonStr = match[1] || match[0];
          try {
            const parsed = JSON.parse(jsonStr);
            this.logger.debug('Successfully parsed JSON response');

            // Validate the parsed structure
            const validation = this.validateReviewResult(parsed);
            if (validation.isValid) {
              return parsed as ReviewResult;
            } else {
              this.logger.warn(`JSON parsed but validation failed: ${validation.errors.join(', ')}`);
              // Continue to fallback parsing
            }
          } catch (parseError) {
            this.logger.debug(`Failed to parse JSON with pattern ${pattern}: ${parseError.message}`);
            continue;
          }
        }
      }

      // Fallback: parse structured text
      this.logger.debug('Using fallback text parsing');
      const lines = response.split('\n');
      let summary = '';
      const suggestions: ReviewSuggestion[] = [];
      let overallScore = 7;

      let currentSection = '';
      let currentSuggestion: Partial<ReviewSuggestion> = {};

      for (const line of lines) {
        const trimmed = line.trim();

        if (
          trimmed.startsWith('## Summary') ||
          trimmed.startsWith('**Summary:**')
        ) {
          currentSection = 'summary';
          continue;
        } else if (
          trimmed.startsWith('## Suggestions') ||
          trimmed.startsWith('**Suggestions:**')
        ) {
          currentSection = 'suggestions';
          continue;
        } else if (
          trimmed.startsWith('## Overall Score') ||
          trimmed.startsWith('**Overall Score:**')
        ) {
          const scoreMatch = trimmed.match(/(\d+)/);
          if (scoreMatch) {
            overallScore = parseInt(scoreMatch[1]);
          }
          continue;
        }

        if (currentSection === 'summary' && trimmed) {
          summary += trimmed + ' ';
        } else if (
          currentSection === 'suggestions' &&
          trimmed.startsWith('-')
        ) {
          // Simple parsing for bullet points
          const suggestion: ReviewSuggestion = {
            filename: 'general',
            type: 'improvement',
            severity: 'medium',
            title: trimmed.substring(1).trim(),
            description: trimmed.substring(1).trim(),
          };
          suggestions.push(suggestion);
        }
      }

      return {
        summary: summary.trim() || 'Code review completed.',
        suggestions,
        overallScore,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to parse AI response, using fallback: ${error.message}`,
      );

      return {
        summary: response.substring(0, 500),
        suggestions: [],
        overallScore: 7,
      };
    }
  }

  private validateReviewResult(result: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!result.summary || typeof result.summary !== 'string') {
      errors.push('Missing or invalid "summary" field');
    }

    if (typeof result.overallScore !== 'number' || result.overallScore < 1 || result.overallScore > 10) {
      errors.push('"overallScore" must be a number between 1-10');
    }

    if (!Array.isArray(result.suggestions)) {
      errors.push('"suggestions" must be an array');
    } else {
      // Validate each suggestion
      result.suggestions.forEach((suggestion: any, index: number) => {
        const suggestionErrors = this.validateSuggestion(suggestion, index);
        errors.push(...suggestionErrors);
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  private validateSuggestion(suggestion: any, index: number): string[] {
    const errors: string[] = [];

    // Required fields
    if (!suggestion.filename || typeof suggestion.filename !== 'string') {
      errors.push(`Suggestion ${index + 1}: Missing or invalid "filename"`);
    }

    if (!suggestion.type || !['bug', 'improvement', 'security', 'naming', 'edge_case', 'documentation', 'testing'].includes(suggestion.type)) {
      errors.push(`Suggestion ${index + 1}: Invalid "type" - must be one of: bug, improvement, security, naming, edge_case, documentation, testing`);
    }

    if (!suggestion.severity || !['low', 'medium', 'high', 'critical'].includes(suggestion.severity)) {
      errors.push(`Suggestion ${index + 1}: Invalid "severity" - must be one of: low, medium, high, critical`);
    }

    if (!suggestion.title || typeof suggestion.title !== 'string') {
      errors.push(`Suggestion ${index + 1}: Missing or invalid "title"`);
    }

    if (!suggestion.description || typeof suggestion.description !== 'string') {
      errors.push(`Suggestion ${index + 1}: Missing or invalid "description"`);
    }

    // Optional fields validation
    if (suggestion.line !== undefined && (typeof suggestion.line !== 'number' || suggestion.line < 1)) {
      errors.push(`Suggestion ${index + 1}: "line" must be a positive number if provided`);
    }

    if (suggestion.suggestedFix !== undefined && typeof suggestion.suggestedFix !== 'string') {
      errors.push(`Suggestion ${index + 1}: "suggestedFix" must be a string if provided`);
    }

    return errors;
  }
}
