import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { GithubModule } from '../../github/github.module';
import { PRReviewAgentService } from './pr-review-agent.service';
import { PRReviewController } from './pr-review.controller';
import { EnhancedPRAgentService } from './enhanced-pr-agent.service';
import { AutoFixService } from './auto-fix.service';
import { PRSummaryService } from './pr-summary.service';
import { PRLabelingService } from './pr-labeling.service';
import { ChangelogService } from './changelog.service';

@Module({
  imports: [SharedModule, GithubModule],
  providers: [
    PRReviewAgentService,
    EnhancedPRAgentService,
    AutoFixService,
    PRSummaryService,
    PRLabelingService,
    ChangelogService,
  ],
  controllers: [PRReviewController],
  exports: [
    PRReviewAgentService,
    EnhancedPRAgentService,
    AutoFixService,
    PRSummaryService,
    PRLabelingService,
    ChangelogService,
  ],
})
export class PRReviewModule {}
