import { Module } from '@nestjs/common';
import { QualityAgent } from './quality.agent';

@Module({})
export class QualityModule {
  providers: [QualityAgent];
}
