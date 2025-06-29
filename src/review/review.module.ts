import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule { }
