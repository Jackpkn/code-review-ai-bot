import { Module } from '@nestjs/common';

import { GithubModule } from './github/github.module';
import { WebhookModule } from './webhook/webhook.module';
import { ReviewModule } from './review/review.module';
import { LoggerModule } from './logger/logger.module';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [
    GithubModule,
    WebhookModule,
    ReviewModule,
    LoggerModule,
    ConfigModule,
  ],
})
export class AppModule {}
