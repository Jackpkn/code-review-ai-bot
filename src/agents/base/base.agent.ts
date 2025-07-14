import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentResult } from './agent-result.interface';
import OpenAI from 'openai';
@Injectable()
export abstract class BaseAgent {
  protected readonly logger: Logger;
  protected readonly openai: OpenAI;
  constructor(protected readonly config: ConfigService) {
    this.logger = new Logger(BaseAgent.name);
    this.openai = new OpenAI({
      apiKey: this.config.get('OPENAI_API_KEY'),
    });
  }
  abstract getSystemPrompt(): string;
  abstract parseResponse(response: any): Partial<AgentResult>;
  abstract getAgentName(): string;
  async analyze(
    codeDiff: string,
    metadata: Record<string, any>,
  ): Promise<AgentResult> {
    try {
      const startTime = Date.now();
      const reponse = await this.openai.chat.completions.create({
        model: this.config.get('OPENAI_MODEL', 'gpt-4'),
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: codeDiff },
        ],
        max_tokens: 3000,
        temperature: 0.7,
      });
      const result = this.parseResponse(reponse);
      const executionTime = Date.now() - startTime;
      return {
        agentName: this.getAgentName(),
        analysisTime: executionTime,
        comments: result.comments || [],
        summary: result.summary || 'Analysis completed',
        score: result.score || 0,
        metadata: {
          ...metadata,
          ...result.metadata,
        },
      };
    } catch (error: unknown) {
      function getErrorMessage(err: unknown): {
        message: string;
        stack?: string;
      } {
        if (typeof err === 'object' && err !== null) {
          const maybeMsg = (err as Record<string, unknown>).message;
          const maybeStack = (err as Record<string, unknown>).stack;
          return {
            message: typeof maybeMsg === 'string' ? maybeMsg : 'Unknown error',
            stack: typeof maybeStack === 'string' ? maybeStack : undefined,
          };
        }
        return { message: 'Unknown error' };
      }
      const { message, stack } = getErrorMessage(error);
      this.logger.error(`Error analyzing code: ${message}`, stack);
      return {
        agentName: this.getAgentName(),
        analysisTime: 0,
        comments: [
          {
            file: 'unknown',
            message: `Failed to analyze code: ${message}`,
            severity: 'high',
            category: 'quality',
          },
        ],
        summary: 'Analysis failed due to error',
        score: 0,
        metadata,
      };
    }
  }
  protected formatUserInput(
    codeDiff: string,
    metadata?: Record<string, any>,
  ): string {
    let prompt = `Code diff to analyze:\n\`\`\`diff\n${codeDiff}\n\`\`\`\n\n`;
    if (metadata) {
      prompt += `Additional context:\n`;
      prompt += `- Files changed: ${metadata.filesChanged}\n`;
      prompt += `- Author: ${metadata.author}\n`;
      if (metadata.title) prompt += `- PR Title: ${metadata.title}\n`;
    }

    return prompt;
  }
  protected extractScore(response: string): number {
    const scoreMatch = response.match(/SCORE:\s*(\d+)/i);
    return scoreMatch ? parseInt(scoreMatch[1], 10) : 7;
  }
  protected extractBlockMerge(response: string): boolean {
    return /BLOCK_MERGE:\s*YES/i.test(response);
  }
}
