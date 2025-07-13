import { Module } from '@nestjs/common';
import { SecurityAgent } from './security-agent.service';

@Module({})
export class SecurityModule {
  providers: [SecurityAgent];
}
