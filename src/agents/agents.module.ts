import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { BaseAgentService } from './base/base-agent.service';
import { SecurityAgentService } from './security/security-agent.service';
import { QualityAgentService } from './quality/quality-agent.service';
import { PerformanceAgentService } from './performance/performance-agent.service';
import { SummaryModule } from './summary/summary.module';

@Module({
  imports: [SharedModule, SummaryModule],
  providers: [
    SecurityAgentService,
    QualityAgentService,
    PerformanceAgentService,
  ],
  exports: [
    BaseAgentService,
    SecurityAgentService,
    QualityAgentService,
    PerformanceAgentService,
  ],
})
export class AgentsModule {}
