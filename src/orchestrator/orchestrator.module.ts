import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';

@Module({
    providers: [OrchestratorService],
    exports: [OrchestratorService],
})
export class OrchestratorModule { } 