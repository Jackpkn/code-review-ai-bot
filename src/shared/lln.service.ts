import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { REVIEW_PROMPT_TEMPLATE } from 'src/review/prompt.template';
import { ChatCompletion } from 'groq-sdk/resources/chat/completions';

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
}
