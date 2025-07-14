import { Module } from '@nestjs/common';
import { SecurityAgentService } from './security-agent.service';
@Module({})
export class SecurityModule {
  providers: [SecurityAgentService];
}
