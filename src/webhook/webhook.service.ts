import { Injectable, Logger } from '@nestjs/common';
import { GithubService } from 'src/github/github.service';
import { ReviewService } from 'src/review/review.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly githubService: GithubService,
    private readonly reviewService: ReviewService,
  ) { }

  async handlePullRequestEvent(payload: any): Promise<void> {
    const { action, pull_request, repository } = payload;

    // Only process opened and synchronize (updated) PRs
    if (!['opened', 'synchronize'].includes(action)) {
      this.logger.log(`Ignoring PR action: ${action}`);
      return;
    }

    const owner = repository.owner.login;
    const repo = repository.name;
    const pullNumber = pull_request.number;
    const commitSha = pull_request.head.sha;

    this.logger.log(
      `Processing PR #${pullNumber} in ${owner}/${repo} (action: ${action})`,
    );

    try {
      // Get PR files and data
      const [files, prData] = await Promise.all([
        this.githubService.getPullRequestFiles(owner, repo, pullNumber),
        this.githubService.getPullRequest(owner, repo, pullNumber),
      ]);

      // Skip if no files changed
      if (files.length === 0) {
        this.logger.log('No files to review');
        return;
      }

      // Perform AI review
      const reviewResult = await this.reviewService.reviewPullRequest(
        {
          title: prData.title,
          body: prData.body,
          number: pullNumber,
        },
        files,
      );

      // Post review results
      await this.postReviewResults(
        owner,
        repo,
        pullNumber,
        commitSha,
        reviewResult,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process PR #${pullNumber}: ${error.message}`,
      );

      // Post error message
      await this.githubService.postGeneralComment(
        owner,
        repo,
        pullNumber,
        `🤖 **AI Review Bot Error**\n\nSorry, I encountered an error while reviewing this PR:\n\`${error.message}\`\n\nPlease try again later.`,
      );
    }
  }

  private async postReviewResults(
    owner: string,
    repo: string,
    pullNumber: number,
    commitSha: string,
    reviewResult: any,
  ): Promise<void> {
    const { summary, suggestions, overallScore } = reviewResult;

    // Create main review body
    let reviewBody = `🤖 **AI Code Review Summary**\n\n${summary}\n\n**Overall Score: ${overallScore}/10**`;

    if (suggestions.length === 0) {
      reviewBody += '\n\n✅ **Great job!** No major issues found in this PR.';
    } else {
      reviewBody += `\n\n**Found ${suggestions.length} suggestions for improvement:**`;
    }

    // Prepare inline comments with validation
    const inlineComments = suggestions
      .filter((s) => s.filename && s.line && typeof s.line === 'number' && s.line > 0)
      .map((s) => ({
        path: s.filename,
        line: s.line,
        body: this.formatSuggestion(s),
      }));

    this.logger.log(`Prepared ${inlineComments.length} valid inline comments out of ${suggestions.length} suggestions`);

    // Debug: log suggestion details
    suggestions.forEach((s, index) => {
      this.logger.debug(`Suggestion ${index + 1}: filename=${s.filename}, line=${s.line}, type=${typeof s.line}`);
    });

    // Post the review
    const event =
      overallScore >= 8
        ? 'APPROVE'
        : overallScore >= 6
          ? 'COMMENT'
          : 'REQUEST_CHANGES';

    try {
      await this.githubService.createReview(
        owner,
        repo,
        pullNumber,
        commitSha,
        reviewBody,
        event,
        inlineComments,
      );
    } catch (error) {
      this.logger.error(`Failed to create review: ${error.message}`);
      // Fallback: post as general comment instead
      await this.githubService.postGeneralComment(
        owner,
        repo,
        pullNumber,
        `${reviewBody}\n\n⚠️ **Note:** Some inline comments could not be posted due to API limitations.`,
      );
      return;
    }

    // Post general suggestions as a separate comment if there are any
    const generalSuggestions = suggestions.filter(
      (s) => !s.filename || !s.line,
    );
    if (generalSuggestions.length > 0) {
      let generalComment = '\n\n📋 **General Suggestions:**\n';
      generalSuggestions.forEach((suggestion, index) => {
        generalComment += `\n${index + 1}. **${suggestion.title}** (${suggestion.severity})\n   ${suggestion.description}`;
        if (suggestion.suggestedFix) {
          generalComment += `\n   💡 *Suggested fix:* ${suggestion.suggestedFix}`;
        }
        generalComment += '\n';
      });

      await this.githubService.postGeneralComment(
        owner,
        repo,
        pullNumber,
        generalComment,
      );
    }

    this.logger.log(
      `Posted review for PR #${pullNumber} with ${inlineComments.length} inline comments`,
    );
  }

  private formatSuggestion(suggestion: any): string {
    const severityEmoji = {
      low: '🟡',
      medium: '🟠',
      high: '🔴',
      critical: '🚨',
    };

    const typeEmoji = {
      bug: '🐛',
      improvement: '✨',
      security: '🔒',
      naming: '📝',
      edge_case: '🤔',
      documentation: '📚',
      testing: '🧪',
    };

    let comment = `${severityEmoji[suggestion.severity]} ${typeEmoji[suggestion.type]} **${suggestion.title}**\n\n`;
    comment += `${suggestion.description}`;

    if (suggestion.suggestedFix) {
      comment += `\n\n💡 **Suggested fix:**\n\`\`\`\n${suggestion.suggestedFix}\n\`\`\``;
    }

    return comment;
  }
}
