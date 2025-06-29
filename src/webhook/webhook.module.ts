import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { GithubModule } from '../github/github.module';
import { ReviewModule } from '../review/review.module';

@Module({
  imports: [GithubModule, ReviewModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule { }
