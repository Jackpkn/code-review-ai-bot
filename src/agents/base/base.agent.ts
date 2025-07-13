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
        score: result.score || 0,
        issues: result.issues || [],
        suggestions: result.suggestions || [],
        blockMerge: result.blockMerge || false,
        metadata: {
          ...metadata,
          ...result.metadata,
        },
        executionTime,
      };
    } catch (error) {
      this.logger.error(`Error analyzing code: ${error.message}`, error.stack);
      return {
        agentName: this.getAgentName(),
        score: 0,
        issues: [
          {
            severity: 'WARNING',
            type: 'analysis_error',
            description: `Failed to analyze code: ${error.message}`,
            category: 'quality',
          },
        ],
        suggestions: [],
        blockMerge: false,
        metadata,
        executionTime: 0,
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
