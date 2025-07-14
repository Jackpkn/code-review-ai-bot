import { Module } from '@nestjs/common';
import { SecurityModule } from './security/security.module';
import { QualityModule } from './quality/quality.module';
import { SummaryModule } from './summary/summary.module';

@Module({
  imports: [SecurityModule, QualityModule, SummaryModule]
})
export class AgentsModule {}
