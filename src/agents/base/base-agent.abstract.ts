import { AgentConfig } from 'src/config/agent.config';
import { PRContext } from 'src/github/github.types';
import { LoggerService } from 'src/logger/logger.service';
import { GroqService } from 'src/shared/lln.service';
import { AgentResult } from './agent-result.interface';

export abstract class BaseAgent {
  protected readonly logger: LoggerService;
  protected readonly llmService: GroqService;
  protected readonly config: AgentConfig;

  abstract analyze(context: PRContext): Promise<AgentResult>;

  protected async callLLM(prompt: string, context: any): Promise<string> {
    const fullPrompt = this.buildPrompt(prompt, context);
    return await this.llmService.complete(fullPrompt, {
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      timeout: this.config.timeout,
    });
  }

  protected abstract buildPrompt(prompt: string, context: any): string;

  protected parseResult(rawResponse: string): AgentResult {
    // Common result parsing logic
    // Structured output validation
    // Error handling

  }
  

}
