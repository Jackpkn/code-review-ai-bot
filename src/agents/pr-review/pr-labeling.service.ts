import { Injectable, Logger } from '@nestjs/common';
import { CodeContext, ReviewComment } from '../base/agent-result.interface';
import { PRSummary } from './pr-summary.service';

export interface PRLabel {
  name: string;
  color: string;
  description: string;
  confidence: number;
}

export interface LabelingResult {
  labels: PRLabel[];
  reasoning: string[];
  autoApplyLabels: string[];
}

@Injectable()
export class PRLabelingService {
  private readonly logger = new Logger(PRLabelingService.name);

  private readonly labelRules = [
    // Size labels
    {
      name: 'size/XS',
      color: '3CBF00',
      description: 'Extra small PR (1-10 lines)',
      condition: (context: CodeContext) => this.getTotalChanges(context) <= 10,
      confidence: 95,
    },
    {
      name: 'size/S',
      color: '5D9CEC',
      description: 'Small PR (11-50 lines)',
      condition: (context: CodeContext) => {
        const changes = this.getTotalChanges(context);
        return changes > 10 && changes <= 50;
      },
      confidence: 95,
    },
    {
      name: 'size/M',
      color: 'FBCA04',
      description: 'Medium PR (51-200 lines)',
      condition: (context: CodeContext) => {
        const changes = this.getTotalChanges(context);
        return changes > 50 && changes <= 200;
      },
      confidence: 95,
    },
    {
      name: 'size/L',
      color: 'F9D0C4',
      description: 'Large PR (201-500 lines)',
      condition: (context: CodeContext) => {
        const changes = this.getTotalChanges(context);
        return changes > 200 && changes <= 500;
      },
      confidence: 95,
    },
    {
      name: 'size/XL',
      color: 'D93F0B',
      description: 'Extra large PR (500+ lines)',
      condition: (context: CodeContext) => this.getTotalChanges(context) > 500,
      confidence: 95,
    },

    // Type labels
    {
      name: 'type/feature',
      color: '0E8A16',
      description: 'New feature implementation',
      condition: (context: CodeContext) =>
        this.hasNewFiles(context) ||
        context.title.toLowerCase().includes('feat') ||
        context.title.toLowerCase().includes('add') ||
        context.description?.toLowerCase().includes('feature'),
      confidence: 80,
    },
    {
      name: 'type/bugfix',
      color: 'D73A4A',
      description: 'Bug fix',
      condition: (context: CodeContext) =>
        context.title.toLowerCase().includes('fix') ||
        context.title.toLowerCase().includes('bug') ||
        context.description?.toLowerCase().includes('fix'),
      confidence: 85,
    },
    {
      name: 'type/refactor',
      color: 'FBCA04',
      description: 'Code refactoring',
      condition: (context: CodeContext) =>
        context.title.toLowerCase().includes('refactor') ||
        context.description?.toLowerCase().includes('refactor') ||
        this.hasOnlyModifiedFiles(context),
      confidence: 70,
    },
    {
      name: 'type/docs',
      color: '0075CA',
      description: 'Documentation changes',
      condition: (context: CodeContext) =>
        context.files.every(
          (f) =>
            f.filename.endsWith('.md') ||
            f.filename.endsWith('.txt') ||
            f.filename.includes('README'),
        ),
      confidence: 90,
    },
    {
      name: 'type/test',
      color: '7057FF',
      description: 'Test changes',
      condition: (context: CodeContext) =>
        context.files.some(
          (f) =>
            f.filename.includes('test') ||
            f.filename.includes('spec') ||
            f.filename.includes('__tests__'),
        ),
      confidence: 85,
    },

    // Area labels
    {
      name: 'area/frontend',
      color: 'FF6B6B',
      description: 'Frontend changes',
      condition: (context: CodeContext) =>
        context.files.some(
          (f) =>
            f.filename.endsWith('.jsx') ||
            f.filename.endsWith('.tsx') ||
            f.filename.endsWith('.vue') ||
            f.filename.endsWith('.css') ||
            f.filename.endsWith('.scss') ||
            f.filename.includes('component'),
        ),
      confidence: 90,
    },
    {
      name: 'area/backend',
      color: '4ECDC4',
      description: 'Backend changes',
      condition: (context: CodeContext) =>
        context.files.some(
          (f) =>
            f.filename.includes('controller') ||
            f.filename.includes('service') ||
            f.filename.includes('model') ||
            f.filename.includes('api') ||
            f.filename.includes('server'),
        ),
      confidence: 85,
    },
    {
      name: 'area/database',
      color: '45B7D1',
      description: 'Database changes',
      condition: (context: CodeContext) =>
        context.files.some(
          (f) =>
            f.filename.includes('migration') ||
            f.filename.includes('schema') ||
            f.filename.includes('model') ||
            f.filename.includes('database') ||
            f.filename.endsWith('.sql'),
        ),
      confidence: 95,
    },
    {
      name: 'area/config',
      color: 'F39C12',
      description: 'Configuration changes',
      condition: (context: CodeContext) =>
        context.files.some(
          (f) =>
            f.filename.includes('config') ||
            f.filename.includes('.env') ||
            f.filename.endsWith('.json') ||
            f.filename.endsWith('.yml') ||
            f.filename.endsWith('.yaml'),
        ),
      confidence: 90,
    },

    // Priority labels based on security issues
    {
      name: 'priority/critical',
      color: 'B60205',
      description: 'Critical security or blocking issues',
      condition: (context: CodeContext, comments?: ReviewComment[]) =>
        comments?.some(
          (c) => c.severity === 'high' && c.category === 'security',
        ) || false,
      confidence: 95,
    },
    {
      name: 'priority/high',
      color: 'D93F0B',
      description: 'High priority changes',
      condition: (context: CodeContext, comments?: ReviewComment[]) =>
        comments?.some((c) => c.severity === 'high') || false,
      confidence: 80,
    },

    // Review status labels
    {
      name: 'needs-review',
      color: 'FBCA04',
      description: 'Needs code review',
      condition: () => true, // Always apply to new PRs
      confidence: 100,
    },
  ];

  async generateLabels(
    context: CodeContext,
    summary: PRSummary,
    comments?: ReviewComment[],
  ): Promise<LabelingResult> {
    const labels: PRLabel[] = [];
    const reasoning: string[] = [];
    const autoApplyLabels: string[] = [];

    // Apply rule-based labels
    for (const rule of this.labelRules) {
      try {
        if (rule.condition(context, comments)) {
          labels.push({
            name: rule.name,
            color: rule.color,
            description: rule.description,
            confidence: rule.confidence,
          });

          reasoning.push(`Applied "${rule.name}" because: ${rule.description}`);

          // Auto-apply high-confidence labels
          if (rule.confidence >= 90) {
            autoApplyLabels.push(rule.name);
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to evaluate label rule ${rule.name}: ${error.message}`,
        );
      }
    }

    // Add summary-based labels
    const summaryLabels = this.generateSummaryBasedLabels(summary);
    labels.push(...summaryLabels);

    // Add impact-based labels
    const impactLabels = this.generateImpactLabels(summary.impactAnalysis);
    labels.push(...impactLabels);

    return {
      labels: this.deduplicateLabels(labels),
      reasoning,
      autoApplyLabels,
    };
  }

  private getTotalChanges(context: CodeContext): number {
    return context.files.reduce(
      (sum, file) => sum + file.additions + file.deletions,
      0,
    );
  }

  private hasNewFiles(context: CodeContext): boolean {
    return context.files.some((file) => file.status === 'added');
  }

  private hasOnlyModifiedFiles(context: CodeContext): boolean {
    return context.files.every((file) => file.status === 'modified');
  }

  private generateSummaryBasedLabels(summary: PRSummary): PRLabel[] {
    const labels: PRLabel[] = [];

    // Check for breaking changes
    if (
      summary.description.toLowerCase().includes('breaking') ||
      summary.keyChanges.some((change) =>
        change.toLowerCase().includes('breaking'),
      )
    ) {
      labels.push({
        name: 'breaking-change',
        color: 'D73A4A',
        description: 'Contains breaking changes',
        confidence: 85,
      });
    }

    // Check for performance improvements
    if (
      summary.technicalSummary.toLowerCase().includes('performance') ||
      summary.keyChanges.some((change) =>
        change.toLowerCase().includes('performance'),
      )
    ) {
      labels.push({
        name: 'performance',
        color: '0E8A16',
        description: 'Performance improvements',
        confidence: 80,
      });
    }

    // Check for security changes
    if (
      summary.technicalSummary.toLowerCase().includes('security') ||
      summary.keyChanges.some((change) =>
        change.toLowerCase().includes('security'),
      )
    ) {
      labels.push({
        name: 'security',
        color: 'D73A4A',
        description: 'Security-related changes',
        confidence: 90,
      });
    }

    return labels;
  }

  private generateImpactLabels(
    impactAnalysis: PRSummary['impactAnalysis'],
  ): PRLabel[] {
    const labels: PRLabel[] = [];

    // Risk level labels
    if (impactAnalysis.riskLevel === 'high') {
      labels.push({
        name: 'risk/high',
        color: 'D73A4A',
        description: 'High risk changes',
        confidence: 85,
      });
    } else if (impactAnalysis.riskLevel === 'medium') {
      labels.push({
        name: 'risk/medium',
        color: 'FBCA04',
        description: 'Medium risk changes',
        confidence: 80,
      });
    }

    // Scope labels
    if (impactAnalysis.scope === 'high') {
      labels.push({
        name: 'scope/wide',
        color: 'F39C12',
        description: 'Wide-reaching changes',
        confidence: 85,
      });
    }

    return labels;
  }

  private deduplicateLabels(labels: PRLabel[]): PRLabel[] {
    const seen = new Set<string>();
    return labels.filter((label) => {
      if (seen.has(label.name)) {
        return false;
      }
      seen.add(label.name);
      return true;
    });
  }

  getRecommendedLabels(labels: PRLabel[]): string[] {
    return labels
      .filter((label) => label.confidence >= 80)
      .sort((a, b) => b.confidence - a.confidence)
      .map((label) => label.name);
  }

  formatLabelsForGitHub(
    labels: PRLabel[],
  ): Array<{ name: string; color: string; description: string }> {
    return labels.map((label) => ({
      name: label.name,
      color: label.color,
      description: label.description,
    }));
  }
}
