import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GithubService } from '../../github/github.service';
import { PRReviewAgentService } from './pr-review-agent.service';
import { AutoFixService, AutoFixResult } from './auto-fix.service';
import { PRSummaryService, PRSummary } from './pr-summary.service';
import { PRLabelingService, LabelingResult } from './pr-labeling.service';
import { ChangelogService, ChangelogEntry } from './changelog.service';
import { PersonaConfig, ReviewPersona } from './persona.config';
import { CodeContext, AgentResult } from '../base/agent-result.interface';

export interface EnhancedPRAnalysis {
  prNumber: number;
  summary: PRSummary;
  reviewResult: AgentResult;
  autoFixes: AutoFixResult;
  labeling: LabelingResult;
  changelogEntry: ChangelogEntry;
  recommendations: string[];
  ciChecks: {
    triggered: boolean;
    checkNames: string[];
  };
}

export interface PRProcessingConfig {
  persona: string;
  enableAutoFix: boolean;
  enableAutoLabeling: boolean;
  enableChangelogGeneration: boolean;
  enableCITrigger: boolean;
  autoApplyFixes: boolean;
  confidenceThreshold: number;
  workflowsToTrigger: string[];
}

@Injectable()
export class EnhancedPRAgentService {
  private readonly logger = new Logger(EnhancedPRAgentService.name);

  constructor(
    private readonly githubService: GithubService,
    private readonly prReviewService: PRReviewAgentService,
    private readonly autoFixService: AutoFixService,
    private readonly summaryService: PRSummaryService,
    private readonly labelingService: PRLabelingService,
    private readonly changelogService: ChangelogService,
    private readonly configService: ConfigService,
  ) {}

  async processFullPRAnalysis(
    owner: string,
    repo: string,
    prNumber: number,
    config: Partial<PRProcessingConfig> = {},
  ): Promise<EnhancedPRAnalysis> {
    const startTime = Date.now();
    this.logger.log(
      `Starting enhanced PR analysis for ${owner}/${repo}#${prNumber}`,
    );

    try {
      // Get PR data and files
      const [prData, files] = await Promise.all([
        this.githubService.getPullRequest(owner, repo, prNumber),
        this.githubService.getPullRequestFiles(owner, repo, prNumber),
      ]);

      // Build code context
      const context: CodeContext = {
        prNumber,
        repoOwner: owner,
        repoName: repo,
        files: files.map((file) => ({
          filename: file.filename,
          status: file.status as any,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
          patch: file.patch || '',
        })),
        baseSha: prData.base.sha,
        headSha: prData.head.sha,
        title: prData.title,
        description: prData.body || '',
        author: 'github-user', // Would be extracted from PR data
        branch: prData.head.ref,
      };

      // Set persona
      const persona = PersonaConfig.getPersona(config.persona || 'senior');
      this.prReviewService.setPersona(persona);

      // Step 1: Generate natural language summary
      this.logger.log('Generating PR summary...');
      const summary = await this.summaryService.generateNaturalLanguageSummary(
        context,
        persona,
      );

      // Step 2: Perform code review analysis
      this.logger.log('Performing code review analysis...');
      const reviewResult = await this.prReviewService.analyze(context);

      // Step 3: Generate auto-fixes (if enabled)
      let autoFixes: AutoFixResult = {
        fixes: [],
        summary: 'Auto-fix disabled',
        totalIssuesFixed: 0,
        confidenceScore: 0,
      };

      if (config.enableAutoFix !== false) {
        this.logger.log('Generating auto-fixes...');
        const fileContents = await this.getFileContents(
          owner,
          repo,
          context.files,
          prData.head.sha,
        );
        autoFixes = await this.autoFixService.generateAutoFixes(
          reviewResult.comments,
          fileContents,
        );
      }

      // Step 4: Generate labels
      let labeling: LabelingResult = {
        labels: [],
        reasoning: [],
        autoApplyLabels: [],
      };

      if (config.enableAutoLabeling !== false) {
        this.logger.log('Generating labels...');
        labeling = await this.labelingService.generateLabels(
          context,
          summary,
          reviewResult.comments,
        );
      }

      // Step 5: Generate changelog entry
      let changelogEntry: ChangelogEntry = {
        date: new Date().toISOString().split('T')[0],
        prNumber,
        title: summary.title,
        description: summary.description,
        author: context.author,
        type: 'improvement',
        changes: summary.keyChanges,
      };

      if (config.enableChangelogGeneration !== false) {
        this.logger.log('Generating changelog entry...');
        changelogEntry = await this.changelogService.generateChangelogEntry(
          context,
          summary,
        );
      }

      // Step 6: Apply fixes and labels (if configured)
      if (config.autoApplyFixes && autoFixes.fixes.length > 0) {
        await this.applyAutoFixes(
          owner,
          repo,
          prData.head.ref,
          autoFixes,
          config.confidenceThreshold || 80,
        );
      }

      if (
        config.enableAutoLabeling !== false &&
        labeling.autoApplyLabels.length > 0
      ) {
        await this.applyLabels(owner, repo, prNumber, labeling);
      }

      // Step 7: Trigger CI checks (if enabled)
      const ciChecks = { triggered: false, checkNames: [] as string[] };
      if (config.enableCITrigger && config.workflowsToTrigger?.length) {
        ciChecks.triggered = await this.triggerCIChecks(
          owner,
          repo,
          prData.head.ref,
          config.workflowsToTrigger,
        );
        ciChecks.checkNames = config.workflowsToTrigger;
      }

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        summary,
        reviewResult,
        autoFixes,
        labeling,
      );

      const analysisTime = Date.now() - startTime;
      this.logger.log(`Enhanced PR analysis completed in ${analysisTime}ms`);

      return {
        prNumber,
        summary,
        reviewResult,
        autoFixes,
        labeling,
        changelogEntry,
        recommendations,
        ciChecks,
      };
    } catch (error) {
      this.logger.error(
        `Enhanced PR analysis failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async postEnhancedReview(
    owner: string,
    repo: string,
    analysis: EnhancedPRAnalysis,
    commitSha: string,
  ): Promise<void> {
    try {
      // Create comprehensive review body
      const reviewBody = this.formatEnhancedReviewBody(analysis);

      // Prepare inline comments with validation
      const inlineComments = analysis.reviewResult.comments
        .filter(
          (comment) =>
            comment.line &&
            comment.file &&
            typeof comment.line === 'number' &&
            comment.line > 0 &&
            comment.file.trim().length > 0,
        )
        .map((comment) => ({
          path: comment.file,
          line: comment.line!,
          body: this.formatInlineComment(comment, analysis.autoFixes),
        }))
        .slice(0, 30); // Limit to 30 comments to avoid API limits

      // Determine review event
      const event = this.determineReviewEvent(analysis);

      this.logger.log(
        `Attempting to post review with ${inlineComments.length} inline comments`,
      );

      try {
        // Post the review
        await this.githubService.createReview(
          owner,
          repo,
          analysis.prNumber,
          commitSha,
          reviewBody,
          event,
          inlineComments,
        );
      } catch (reviewError) {
        this.logger.warn(
          `Failed to post review with inline comments: ${reviewError.message}`,
        );

        // Fallback: Post as general comment without inline comments
        await this.githubService.postGeneralComment(
          owner,
          repo,
          analysis.prNumber,
          reviewBody +
            '\n\n⚠️ *Note: Some inline comments could not be posted due to API limitations.*',
        );

        this.logger.log('Posted review as general comment instead');
      }

      // Post auto-fix suggestions as separate comment if any
      if (analysis.autoFixes.fixes.length > 0) {
        await this.postAutoFixComment(
          owner,
          repo,
          analysis.prNumber,
          analysis.autoFixes,
        );
      }

      // Post changelog preview
      if (analysis.changelogEntry) {
        await this.postChangelogPreview(
          owner,
          repo,
          analysis.prNumber,
          analysis.changelogEntry,
        );
      }

      this.logger.log(`Posted enhanced review for PR #${analysis.prNumber}`);
    } catch (error) {
      this.logger.error(`Failed to post enhanced review: ${error.message}`);
      throw error;
    }
  }

  private async getFileContents(
    owner: string,
    repo: string,
    files: any[],
    ref: string,
  ): Promise<Map<string, string>> {
    const fileContents = new Map<string, string>();

    for (const file of files.slice(0, 10)) {
      // Limit to prevent API rate limits
      try {
        if (file.status !== 'removed') {
          const content = await this.githubService.getFileContent(
            owner,
            repo,
            file.filename,
            ref,
          );
          fileContents.set(file.filename, content);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to get content for ${file.filename}: ${error.message}`,
        );
      }
    }

    return fileContents;
  }

  private async applyAutoFixes(
    owner: string,
    repo: string,
    branch: string,
    autoFixes: AutoFixResult,
    confidenceThreshold: number,
  ): Promise<void> {
    const highConfidenceFixes = autoFixes.fixes.filter(
      (fix) => fix.confidence >= confidenceThreshold,
    );

    if (highConfidenceFixes.length === 0) {
      this.logger.log('No high-confidence auto-fixes to apply');
      return;
    }

    this.logger.log(
      `Applying ${highConfidenceFixes.length} high-confidence auto-fixes`,
    );

    for (const fix of highConfidenceFixes) {
      try {
        // Get current file content and SHA
        const currentContent = await this.githubService.getFileContent(
          owner,
          repo,
          fix.file,
          branch,
        );
        const lines = currentContent.split('\n');

        // Apply the fix
        if (fix.fixedCode === '') {
          // Remove line
          lines.splice(fix.line - 1, 1);
        } else {
          // Replace line
          lines[fix.line - 1] = fix.fixedCode;
        }

        const updatedContent = lines.join('\n');

        // Get file SHA for update
        const fileInfo = await this.githubService.getFileContent(
          owner,
          repo,
          fix.file,
          branch,
        );

        // Update file
        await this.githubService.updateFile(
          owner,
          repo,
          fix.file,
          updatedContent,
          `Auto-fix: ${fix.description}`,
          '', // SHA would be extracted from fileInfo
          branch,
        );

        this.logger.log(`Applied auto-fix to ${fix.file}:${fix.line}`);
      } catch (error) {
        this.logger.warn(
          `Failed to apply auto-fix to ${fix.file}: ${error.message}`,
        );
      }
    }
  }

  private async applyLabels(
    owner: string,
    repo: string,
    prNumber: number,
    labeling: LabelingResult,
  ): Promise<void> {
    try {
      // Create labels that don't exist
      for (const label of labeling.labels) {
        await this.githubService.createLabel(
          owner,
          repo,
          label.name,
          label.color,
          label.description,
        );
      }

      // Apply auto-apply labels
      if (labeling.autoApplyLabels.length > 0) {
        await this.githubService.addLabels(
          owner,
          repo,
          prNumber,
          labeling.autoApplyLabels,
        );
      }

      this.logger.log(
        `Applied ${labeling.autoApplyLabels.length} labels to PR #${prNumber}`,
      );
    } catch (error) {
      this.logger.warn(`Failed to apply labels: ${error.message}`);
    }
  }

  private async triggerCIChecks(
    owner: string,
    repo: string,
    ref: string,
    workflows: string[],
  ): Promise<boolean> {
    try {
      for (const workflow of workflows) {
        await this.githubService.triggerWorkflow(owner, repo, workflow, ref, {
          triggered_by: 'pr-review-agent',
          pr_analysis: true,
        });
      }

      this.logger.log(`Triggered ${workflows.length} CI workflows`);
      return true;
    } catch (error) {
      this.logger.warn(`Failed to trigger CI workflows: ${error.message}`);
      return false;
    }
  }

  private generateRecommendations(
    summary: PRSummary,
    reviewResult: AgentResult,
    autoFixes: AutoFixResult,
    labeling: LabelingResult,
  ): string[] {
    const recommendations: string[] = [];

    // Based on review score
    if (reviewResult.score && reviewResult.score < 70) {
      recommendations.push(
        'Consider addressing critical issues before merging',
      );
    }

    // Based on impact analysis
    if (summary.impactAnalysis.riskLevel === 'high') {
      recommendations.push(
        'High-risk changes detected - ensure thorough testing',
      );
    }

    // Based on auto-fixes
    if (autoFixes.fixes.length > 0) {
      recommendations.push(
        `${autoFixes.fixes.length} auto-fixable issues found - consider applying fixes`,
      );
    }

    // Based on testing notes
    if (summary.testingNotes.length > 0) {
      recommendations.push('Review testing requirements before deployment');
    }

    // Based on deployment notes
    if (summary.deploymentNotes.length > 0) {
      recommendations.push('Check deployment considerations');
    }

    return recommendations;
  }

  private formatEnhancedReviewBody(analysis: EnhancedPRAnalysis): string {
    const { summary, reviewResult, autoFixes, labeling } = analysis;

    let body = `# 🤖 Enhanced PR Review\n\n`;

    // Summary section
    body += `## 📋 Summary\n`;
    body += `**${summary.title}**\n\n`;
    body += `${summary.description}\n\n`;

    // Key changes
    if (summary.keyChanges.length > 0) {
      body += `### Key Changes\n`;
      summary.keyChanges.forEach((change) => {
        body += `- ${change}\n`;
      });
      body += '\n';
    }

    // Impact analysis
    body += `### Impact Analysis\n`;
    body += `- **Scope**: ${summary.impactAnalysis.scope}\n`;
    body += `- **Risk Level**: ${summary.impactAnalysis.riskLevel}\n`;
    if (summary.impactAnalysis.affectedAreas.length > 0) {
      body += `- **Affected Areas**: ${summary.impactAnalysis.affectedAreas.join(', ')}\n`;
    }
    body += '\n';

    // Review results
    body += `## 🔍 Code Review Results\n`;
    body += `**Overall Score**: ${reviewResult.score}/100\n\n`;
    body += `${reviewResult.summary}\n\n`;

    if (reviewResult.metadata) {
      body += `### Issue Breakdown\n`;
      body += `- 🔒 Security: ${reviewResult.metadata.securityIssues || 0}\n`;
      body += `- 📊 Quality: ${reviewResult.metadata.qualityIssues || 0}\n`;
      body += `- ⚡ Performance: ${reviewResult.metadata.performanceIssues || 0}\n`;
      body += `- 🎨 Style: ${reviewResult.metadata.styleIssues || 0}\n`;
      body += `- 🧪 Testing: ${reviewResult.metadata.testingIssues || 0}\n\n`;
    }

    // Auto-fixes
    if (autoFixes.fixes.length > 0) {
      body += `## 🔧 Auto-Fix Suggestions\n`;
      body += `${autoFixes.summary}\n\n`;
      body += `Found ${autoFixes.totalIssuesFixed} auto-fixable issues with ${Math.round(autoFixes.confidenceScore)}% average confidence.\n\n`;
    }

    // Labels
    if (labeling.labels.length > 0) {
      body += `## 🏷️ Suggested Labels\n`;
      const recommendedLabels = labeling.labels
        .filter((label) => label.confidence >= 80)
        .map((label) => `\`${label.name}\``)
        .join(', ');

      if (recommendedLabels) {
        body += `Recommended: ${recommendedLabels}\n\n`;
      }
    }

    // Testing and deployment notes
    if (summary.testingNotes.length > 0) {
      body += `## 🧪 Testing Notes\n`;
      summary.testingNotes.forEach((note) => {
        body += `- ${note}\n`;
      });
      body += '\n';
    }

    if (summary.deploymentNotes.length > 0) {
      body += `## 🚀 Deployment Notes\n`;
      summary.deploymentNotes.forEach((note) => {
        body += `- ${note}\n`;
      });
      body += '\n';
    }

    body += `---\n*Generated by Enhanced PR Review Agent*`;

    return body;
  }

  private formatInlineComment(comment: any, autoFixes: AutoFixResult): string {
    let body = `**${comment.message}**\n\n`;
    body += `*Category*: ${comment.category} | *Severity*: ${comment.severity}\n\n`;

    if (comment.suggestion) {
      body += `💡 **Suggestion**: ${comment.suggestion}\n\n`;
    }

    // Check if there's an auto-fix for this issue
    const autoFix = autoFixes.fixes.find(
      (fix) => fix.file === comment.file && fix.line === comment.line,
    );

    if (autoFix) {
      body += `🔧 **Auto-fix available** (${autoFix.confidence}% confidence):\n`;
      body += '```typescript\n';
      body += `- ${autoFix.originalCode}\n`;
      body += `+ ${autoFix.fixedCode}\n`;
      body += '```\n';
    }

    return body;
  }

  private async postAutoFixComment(
    owner: string,
    repo: string,
    prNumber: number,
    autoFixes: AutoFixResult,
  ): Promise<void> {
    let comment = `## 🔧 Auto-Fix Report\n\n`;
    comment += `${autoFixes.summary}\n\n`;

    if (autoFixes.fixes.length > 0) {
      comment += `### Available Fixes\n\n`;

      autoFixes.fixes.forEach((fix, index) => {
        comment += `**${index + 1}. ${fix.file}:${fix.line}** (${fix.confidence}% confidence)\n`;
        comment += `${fix.description}\n`;
        comment += '```diff\n';
        comment += `- ${fix.originalCode}\n`;
        comment += `+ ${fix.fixedCode}\n`;
        comment += '```\n\n';
      });

      comment += `*High-confidence fixes (≥80%) can be auto-applied if enabled.*\n`;
    }

    await this.githubService.postGeneralComment(owner, repo, prNumber, comment);
  }

  private async postChangelogPreview(
    owner: string,
    repo: string,
    prNumber: number,
    changelogEntry: ChangelogEntry,
  ): Promise<void> {
    let comment = `## 📝 Changelog Preview\n\n`;
    comment += `This PR will add the following entry to the changelog:\n\n`;
    comment += `### ${changelogEntry.title}\n`;
    comment += `*${changelogEntry.date} - ${changelogEntry.type}*\n\n`;
    comment += `${changelogEntry.description}\n\n`;

    if (changelogEntry.changes.length > 0) {
      comment += `**Changes:**\n`;
      changelogEntry.changes.forEach((change) => {
        comment += `- ${change}\n`;
      });
    }

    if (
      changelogEntry.breakingChanges &&
      changelogEntry.breakingChanges.length > 0
    ) {
      comment += `\n**⚠️ Breaking Changes:**\n`;
      changelogEntry.breakingChanges.forEach((change) => {
        comment += `- ${change}\n`;
      });
    }

    await this.githubService.postGeneralComment(owner, repo, prNumber, comment);
  }

  private determineReviewEvent(
    analysis: EnhancedPRAnalysis,
  ): 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT' {
    const { reviewResult, summary } = analysis;

    const criticalIssues = reviewResult.comments.filter(
      (c) => c.severity === 'high',
    ).length;
    const securityIssues = reviewResult.comments.filter(
      (c) => c.category === 'security',
    ).length;

    if (
      criticalIssues > 0 ||
      securityIssues > 0 ||
      summary.impactAnalysis.riskLevel === 'high'
    ) {
      return 'REQUEST_CHANGES';
    }

    if (reviewResult.score && reviewResult.score >= 85) {
      return 'APPROVE';
    }

    return 'COMMENT';
  }
}
