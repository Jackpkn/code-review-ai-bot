import {
    Controller,
    Post,
    Body,
    Headers,
    Logger,
    HttpStatus,
    HttpException,
} from '@nestjs/common';

import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from './webhook.service';
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
        @Body() payload: any,
        @Headers('x-github-event') eventType: string,
        @Headers('x-hub-signature-256') signature: string,
    ) {
        this.logger.log(`Received GitHub webhook: ${eventType}`);

        // Verify webhook signature
        if (!this.verifySignature(JSON.stringify(payload), signature)) {
            this.logger.error('Invalid webhook signature');
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
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
            return false;
        }

        const expectedSignature = `sha256=${crypto
            .createHmac('sha256', this.webhookSecret)
            .update(payload)
            .digest('hex')}`;

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature),
        );
    }
}
