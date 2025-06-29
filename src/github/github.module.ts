import { Module } from '@nestjs/common';
import { GithubService } from './github.service';
import { HttpModule } from '@nestjs/axios/dist/http.module';
import { HttpService } from 'src/shared/http.service';

@Module({
  providers: [GithubService, HttpService],
  imports: [HttpModule],
  exports: [GithubService],
})
export class GithubModule { }
