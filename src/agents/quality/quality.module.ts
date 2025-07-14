import { Module } from '@nestjs/common';
import { QualityAgentService } from './quality-agent.service';

@Module({
  providers: [QualityAgentService],
  exports: [QualityAgentService],
})
export class QualityModule {}
