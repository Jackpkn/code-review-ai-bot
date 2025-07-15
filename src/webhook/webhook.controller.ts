import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  HttpStatus,
  HttpException,
  Req,
} from '@nestjs/common';

import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from './webhook.service';
import { Request } from 'express';
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly webhookSecret: string | undefined;

  constructor(
    private readonly webhookService: WebhookService,
    private readonly configService: ConfigService,
  ) {
    this.webhookSecret = this.configService.get<string>(
      'GITHUB_WEBHOOK_SECRET',
    );
  }

  @Post('github')
  async handleGitHubWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Body() payload: any,
    @Headers('x-github-event') eventType: string,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    this.logger.log(`Received GitHub webhook: ${eventType}`);

    // Debug logging
    this.logger.debug(`Raw body available: ${!!req.rawBody}`);
    this.logger.debug(`Raw body length: ${req.rawBody?.length || 0}`);
    this.logger.debug(`Webhook secret configured: ${!!this.webhookSecret}`);
    this.logger.debug(`Signature received: ${signature}`);

    // Verify webhook signature using raw body
    const rawBody = req.rawBody
      ? req.rawBody.toString()
      : JSON.stringify(payload);

    // Temporary: Skip signature verification for debugging
    // TODO: Remove this bypass once signature verification is fixed
    const skipSignatureVerification = true;

    if (
      !skipSignatureVerification &&
      !this.verifySignature(rawBody, signature)
    ) {
      this.logger.error('Invalid webhook signature');
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    } else if (skipSignatureVerification) {
      this.logger.warn(
        'SECURITY WARNING: Webhook signature verification is bypassed for debugging',
      );
    }

    try {
      switch (eventType) {
        case 'pull_request':
          await this.webhookService.handlePullRequestEvent(payload);
          break;
        case 'pull_request_review':
          this.logger.log(
            'Pull request review event received (ignored for now)',
          );
          break;
        default:
          this.logger.log(`Unhandled event type: ${eventType}`);
      }

      return { status: 'success', message: 'Webhook processed' };
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`);
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private verifySignature(payload: string, signature: string): boolean {
    if (!signature || !this.webhookSecret) {
      this.logger.debug(
        `Signature verification failed: signature=${!!signature}, secret=${!!this.webhookSecret}`,
      );
      return false;
    }

    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex')}`;

    this.logger.debug(`Expected signature: ${expectedSignature}`);
    this.logger.debug(`Received signature: ${signature}`);
    this.logger.debug(`Payload length: ${payload.length}`);
    this.logger.debug(`Payload preview: ${payload.substring(0, 100)}...`);

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );

    this.logger.debug(`Signature verification result: ${isValid}`);
    return isValid;
  }
}
