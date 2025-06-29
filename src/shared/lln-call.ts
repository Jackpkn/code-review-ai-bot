import Groq from 'groq-sdk';
import { InternalServerErrorException } from '@nestjs/common';
import { REVIEW_PROMPT_TEMPLATE } from 'src/review/prompt.template';
import { ChatCompletion } from 'groq-sdk/resources/chat/completions';
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
export async function getGroqChatCompletion(
  context: any,
): Promise<ChatCompletion> {
  try {
    return await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: REVIEW_PROMPT_TEMPLATE,
        },
        {
          role: 'user',
          content: context,
        },
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
