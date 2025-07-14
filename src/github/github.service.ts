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

      // Validate and clean comments
      const validComments = comments.filter(
        (comment) =>
          comment.path &&
          comment.line &&
          comment.body &&
          typeof comment.line === 'number' &&
          comment.line > 0 &&
          comment.path.trim().length > 0 &&
          comment.body.trim().length > 0,
      );

      const payload: any = {
        body: body || 'AI Code Review',
        event,
      };

      // Only add commit_id and comments if we have valid data
      if (commitSha && commitSha.trim().length > 0) {
        payload.commit_id = commitSha;
      }

      if (validComments.length > 0) {
        payload.comments = validComments;
      }

      this.logger.log(
        `Attempting to create review with payload: ${JSON.stringify(payload, null, 2)}`,
      );

      await firstValueFrom(
        this.httpService.post(url, payload, { headers: this.getHeaders() }),
      );

      this.logger.log(
        `Created review for PR #${pullNumber} with ${validComments.length} comments`,
      );
    } catch (error) {
      const githubError = error as GithubError;
      this.logger.error(`Failed to create review: ${githubError.message}`);
      this.logger.error(`Error details:`, error.response?.data);
      throw error;
    }
  }

  async addLabels(
    owner: string,
    repo: string,
    issueNumber: number,
    labels: string[],
  ): Promise<void> {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/issues/${issueNumber}/labels`;

      await firstValueFrom(
        this.httpService.post(url, { labels }, { headers: this.getHeaders() }),
      );

      this.logger.log(
        `Added labels to PR #${issueNumber}: ${labels.join(', ')}`,
      );
    } catch (error) {
      const githubError = error as GithubError;
      this.logger.error(`Failed to add labels: ${githubError.message}`);
      throw error;
    }
  }

  async createLabel(
    owner: string,
    repo: string,
    name: string,
    color: string,
    description?: string,
  ): Promise<void> {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/labels`;

      const payload = {
        name: name.trim(),
        color: color.replace('#', '').toLowerCase(),
        description: (description || '').substring(0, 100), // GitHub limit
      };

      await firstValueFrom(
        this.httpService.post(url, payload, { headers: this.getHeaders() }),
      );

      this.logger.log(`Created label: ${name}`);
    } catch (error) {
      const githubError = error as any;
      // Check for specific error messages
      if (
        githubError.response?.status === 422 &&
        (githubError.response?.data?.errors?.some(
          (e: any) =>
            e.code === 'already_exists' ||
            e.message?.includes('already_exists'),
        ) ||
          githubError.message?.includes('already_exists'))
      ) {
        this.logger.log(`Label already exists: ${name}`);
        return; // Don't throw error for existing labels
      }

      this.logger.error(`Failed to create label: ${githubError.message}`);
      this.logger.error(
        `Label creation error details:`,
        githubError.response?.data,
      );
      // Don't throw error to prevent breaking the entire process
    }
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ): Promise<string> {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`;
      const params = ref ? { ref } : {};

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: this.getHeaders(),
          params,
        }),
      );

      if (response.data.type === 'file') {
        return Buffer.from(response.data.content, 'base64').toString('utf-8');
      }

      throw new Error('Path is not a file');
    } catch (error) {
      const githubError = error as GithubError;
      this.logger.error(`Failed to get file content: ${githubError.message}`);
      throw error;
    }
  }

  async updateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    sha: string,
    branch?: string,
  ): Promise<void> {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`;

      const payload = {
        message,
        content: Buffer.from(content).toString('base64'),
        sha,
        branch,
      };

      await firstValueFrom(
        this.httpService.put(url, payload, { headers: this.getHeaders() }),
      );

      this.logger.log(`Updated file: ${path}`);
    } catch (error) {
      const githubError = error as GithubError;
      this.logger.error(`Failed to update file: ${githubError.message}`);
      throw error;
    }
  }

  async triggerWorkflow(
    owner: string,
    repo: string,
    workflowId: string,
    ref: string,
    inputs?: Record<string, any>,
  ): Promise<void> {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`;

      const payload = {
        ref,
        inputs: inputs || {},
      };

      await firstValueFrom(
        this.httpService.post(url, payload, { headers: this.getHeaders() }),
      );

      this.logger.log(`Triggered workflow: ${workflowId}`);
    } catch (error) {
      const githubError = error as GithubError;
      this.logger.error(`Failed to trigger workflow: ${githubError.message}`);
      throw error;
    }
  }

  async getChecks(owner: string, repo: string, ref: string): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/commits/${ref}/check-runs`;

      const response = await firstValueFrom(
        this.httpService.get(url, { headers: this.getHeaders() }),
      );

      return response.data.check_runs || [];
    } catch (error) {
      const githubError = error as GithubError;
      this.logger.error(`Failed to get checks: ${githubError.message}`);
      throw error;
    }
  }

  async createCheckRun(
    owner: string,
    repo: string,
    name: string,
    headSha: string,
    status: 'queued' | 'in_progress' | 'completed',
    conclusion?:
      | 'success'
      | 'failure'
      | 'neutral'
      | 'cancelled'
      | 'skipped'
      | 'timed_out',
    output?: {
      title: string;
      summary: string;
      text?: string;
    },
  ): Promise<void> {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/check-runs`;

      const payload: any = {
        name,
        head_sha: headSha,
        status,
      };

      if (conclusion) {
        payload.conclusion = conclusion;
      }

      if (output) {
        payload.output = output;
      }

      await firstValueFrom(
        this.httpService.post(url, payload, { headers: this.getHeaders() }),
      );

      this.logger.log(`Created check run: ${name}`);
    } catch (error) {
      const githubError = error as GithubError;
      this.logger.error(`Failed to create check run: ${githubError.message}`);
      throw error;
    }
  }
}
