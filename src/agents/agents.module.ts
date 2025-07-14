import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { BaseAgentService } from './base/base-agent.service';
import { SecurityAgentService } from './security/security-agent.service';
import { QualityAgentService } from './quality/quality-agent.service';
import { PerformanceAgentService } from './performance/performance-agent.service';
import { SummaryModule } from './summary/summary.module';
import { PRReviewModule } from './pr-review/pr-review.module';

@Module({
  imports: [SharedModule, SummaryModule, PRReviewModule],
  providers: [
    SecurityAgentService,
    QualityAgentService,
    PerformanceAgentService,
  ],
  exports: [
    SecurityAgentService,
    QualityAgentService,
    PerformanceAgentService,
    PRReviewModule,
  ],
})
export class AgentsModule {}
