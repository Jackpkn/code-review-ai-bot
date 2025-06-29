import { Module } from '@nestjs/common';
import { GroqService } from './lln.service';

@Module({
    providers: [GroqService],
    exports: [GroqService],
})
export class SharedModule { } 