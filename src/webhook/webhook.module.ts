import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { GithubModule } from '../github/github.module';
import { ReviewModule } from '../review/review.module';
import { PRReviewModule } from '../agents/pr-review/pr-review.module';

@Module({
  imports: [GithubModule, ReviewModule, PRReviewModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
