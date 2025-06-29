import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { HttpService } from 'src/shared/http.service';

export interface PullRequestFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  contents_url: string;
}

export interface PullRequestData {
  number: number;
  title: string;
  body: string;
  head: {
    sha: string;
    ref: string;
  };
  base: {
    sha: string;
    ref: string;
  };
}

interface GithubError {
  message: string;
}

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private readonly githubToken: string | undefined;
  private readonly baseUrl = 'https://api.github.com';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.githubToken = this.configService.get<string>('GITHUB_TOKEN');
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.githubToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  async getPullRequestFiles(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<PullRequestFile[]> {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}/files`;
      const response = await firstValueFrom(
        this.httpService.get<PullRequestFile[]>(url, {
          headers: this.getHeaders(),
        }),
      );

      this.logger.log(
        `Fetched ${response.data.length} files for PR #${pullNumber}`,
      );
      return response.data;
    } catch (error) {
      const githubError = error as GithubError;
      this.logger.error(`Failed to fetch PR files: ${githubError.message}`);
      throw error;
    }
  }

  async getPullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<PullRequestData> {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}`;
      const response = await firstValueFrom(
        this.httpService.get<PullRequestData>(url, {
          headers: this.getHeaders(),
        }),
      );
      return response.data;
    } catch (error) {
      const githubError = error as GithubError;
      this.logger.error(`Failed to fetch PR data: ${githubError.message}`);
      throw error;
    }
  }

  async postReviewComment(
    owner: string,
    repo: string,
    pullNumber: number,
    commitSha: string,
    filename: string,
    line: number,
    body: string,
  ): Promise<void> {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}/comments`;

      const payload = {
        body,
        commit_id: commitSha,
        path: filename,
        line,
        side: 'RIGHT',
      };

      await firstValueFrom(
        this.httpService.post(url, payload, { headers: this.getHeaders() }),
      );

      this.logger.log(`Posted review comment on ${filename}:${line}`);
    } catch (error) {
      const githubError = error as GithubError;
      this.logger.error(
        `Failed to post review comment: ${githubError.message}`,
      );
      throw error;
    }
  }

  async postGeneralComment(
    owner: string,
    repo: string,
    pullNumber: number,
    body: string,
  ): Promise<void> {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/issues/${pullNumber}/comments`;

      await firstValueFrom(
        this.httpService.post(url, { body }, { headers: this.getHeaders() }),
      );

      this.logger.log(`Posted general comment on PR #${pullNumber}`);
    } catch (error) {
      const githubError = error as GithubError;
      this.logger.error(
        `Failed to post general comment: ${githubError.message}`,
      );
      throw error;
    }
  }

  async createReview(
    owner: string,
    repo: string,
    pullNumber: number,
    commitSha: string,
    body: string,
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT' = 'COMMENT',
    comments: Array<{
      path: string;
      line: number;
      body: string;
    }> = [],
  ): Promise<void> {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`;

      const payload = {
        commit_id: commitSha,
        body,
        event,
        comments,
      };

      await firstValueFrom(
        this.httpService.post(url, payload, { headers: this.getHeaders() }),
      );

      this.logger.log(
        `Created review for PR #${pullNumber} with ${comments.length} comments`,
      );
    } catch (error) {
      const githubError = error as GithubError;
      this.logger.error(`Failed to create review: ${githubError.message}`);
      throw error;
    }
  }
}
