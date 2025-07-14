import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { REVIEW_PROMPT_TEMPLATE } from 'src/review/prompt.template';
import { ChatCompletion } from 'groq-sdk/resources/chat/completions';
import OpenAI from 'openai';
@Injectable()
export class GroqService {
  private groq: Groq;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey)
      throw new Error('Missing GROQ_API_KEY in environment variables');
    this.groq = new Groq({ apiKey });
  }

  async getGroqChatCompletion(context: string): Promise<ChatCompletion> {
    try {
      return await this.groq.chat.completions.create({
        messages: [
          { role: 'system', content: REVIEW_PROMPT_TEMPLATE },
          { role: 'user', content: context },
        ],
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to get Groq chat completion',
        error instanceof Error ? error.message : undefined,
      );
    }
  }
  async complete(
    prompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      timeout?: number;
    } = {},
  ): Promise<string> {
    try {
      const response = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1000,
        // timeout: options.timeout ?? 30000,
      });
      return response.choices[0].message.content!;
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to complete Groq request',
        error instanceof Error ? error.message : undefined,
      );
    }
  }
}
