import { Injectable, Logger } from '@nestjs/common';
import { GroqService } from 'src/shared/lln.service';
import {
  AgentConfig,
  AgentResult,
  CodeContext,
  ReviewComment,
} from './agent-result.interface';

@Injectable()
export abstract class BaseAgentService {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected readonly groqService: GroqService) {}

  /**
   * Abstract method that each agent must implement
   */
  abstract analyze(context: CodeContext): Promise<AgentResult>;

  /**
   * Get agent-specific configuration
   */
  abstract getConfig(): AgentConfig;

  /**
   * Common method to call LLM with agent-specific prompts
   */
  protected async callLLM(
    systemPrompt: string,
    userPrompt: string,
    temperature: number = 0.1,
  ): Promise<string> {
    try {
      const response = await this.groqService.getGroqChatCompletion(userPrompt);

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error(`LLM call failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Parse LLM response into structured comments
   */
  protected parseResponse(response: string): ReviewComment[] {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      if (parsed.comments && Array.isArray(parsed.comments)) {
        return parsed.comments;
      }
    } catch {
      // If JSON parsing fails, parse as structured text
      return this.parseStructuredText(response);
    }

    return [];
  }

  /**
   * Parse structured text response into comments
   */
  private parseStructuredText(response: string): ReviewComment[] {
    const comments: ReviewComment[] = [];
    const lines = response.split('\n');
    let currentComment: Partial<ReviewComment> = {};

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('FILE:')) {
        if (currentComment.message) {
          comments.push(currentComment as ReviewComment);
        }
        currentComment = { file: trimmed.substring(5).trim() };
      } else if (trimmed.startsWith('LINE:')) {
        currentComment.line = parseInt(trimmed.substring(5).trim(), 10);
      } else if (trimmed.startsWith('SEVERITY:')) {
        currentComment.severity = trimmed.substring(9).trim() as
          | 'low'
          | 'medium'
          | 'high';
      } else if (trimmed.startsWith('CATEGORY:')) {
        currentComment.category = trimmed.substring(9).trim();
      } else if (trimmed.startsWith('MESSAGE:')) {
        currentComment.message = trimmed.substring(8).trim();
      } else if (trimmed.startsWith('SUGGESTION:')) {
        currentComment.suggestion = trimmed.substring(11).trim();
      }
    }

    if (currentComment.message) {
      comments.push(currentComment as ReviewComment);
    }

    return comments;
  }

  /**
   * Validate agent result before returning
   */
  protected validateResult(result: AgentResult): AgentResult {
    if (!result.agentName) {
      throw new Error('Agent name is required');
    }

    if (!Array.isArray(result.comments)) {
      result.comments = [];
    }

    // Validate each comment
    result.comments = result.comments.filter((comment) => {
      if (!comment.message || !comment.file) {
        this.logger.warn(
          `Invalid comment filtered out: ${JSON.stringify(comment)}`,
        );
        return false;
      }
      return true;
    });

    // Ensure severity is set
    result.comments.forEach((comment) => {
      if (!comment.severity) {
        comment.severity = 'medium';
      }
    });

    return result;
  }

  /**
   * Get file extension from filename
   */
  protected getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * Check if file should be analyzed by this agent
   */
  protected shouldAnalyzeFile(filename: string): boolean {
    const config = this.getConfig();
    const extension = this.getFileExtension(filename);

    if (config.supportedFileTypes.length === 0) {
      return true; // Analyze all files if no specific types defined
    }

    return config.supportedFileTypes.includes(extension);
  }

  /**
   * Get relevant lines from diff for analysis
   */
  protected getRelevantLines(diff: string, maxLines: number = 100): string[] {
    const lines = diff.split('\n');
    const relevantLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('+') || line.startsWith('-')) {
        relevantLines.push(line);
        if (relevantLines.length >= maxLines) break;
      }
    }

    return relevantLines;
  }
}
