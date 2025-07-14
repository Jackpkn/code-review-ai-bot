import { Injectable, Logger } from '@nestjs/common';
import { GroqService } from '../../shared/lln.service';
import { CodeContext } from '../base/agent-result.interface';
import { ReviewPersona } from './persona.config';

export interface PRSummary {
  title: string;
  description: string;
  keyChanges: string[];
  impactAnalysis: {
    scope: 'low' | 'medium' | 'high';
    riskLevel: 'low' | 'medium' | 'high';
    affectedAreas: string[];
  };
  technicalSummary: string;
  businessSummary: string;
  testingNotes: string[];
  deploymentNotes: string[];
}

@Injectable()
export class PRSummaryService {
  private readonly logger = new Logger(PRSummaryService.name);

  constructor(private readonly groqService: GroqService) {}

  async generateNaturalLanguageSummary(
    context: CodeContext,
    persona: ReviewPersona,
  ): Promise<PRSummary> {
    try {
      const prompt = this.buildSummaryPrompt(context, persona);
      const response = await this.groqService.complete(prompt, {
        temperature: 0.2,
        maxTokens: 1500,
      });

      return this.parseSummaryResponse(response, context);
    } catch (error) {
      this.logger.error(`Failed to generate PR summary: ${error.message}`);
      return this.generateFallbackSummary(context);
    }
  }

  private buildSummaryPrompt(
    context: CodeContext,
    persona: ReviewPersona,
  ): string {
    const filesList = context.files
      .map(
        (f) => `- ${f.filename} (${f.status}, +${f.additions}/-${f.deletions})`,
      )
      .join('\n');

    return `As a ${persona.name}, analyze this pull request and provide a comprehensive summary in natural language.

## PR Details
**Title**: ${context.title}
**Description**: ${context.description || 'No description provided'}
**Author**: ${context.author}
**Branch**: ${context.branch}
**Files Changed**: ${context.files.length}

## Files Modified:
${filesList}

## Code Changes Preview:
${this.getCodePreview(context)}

Please provide a JSON response with the following structure:
{
  "title": "Clear, descriptive title for this PR",
  "description": "Natural language description of what this PR does",
  "keyChanges": ["List of 3-5 key changes made"],
  "impactAnalysis": {
    "scope": "low|medium|high",
    "riskLevel": "low|medium|high", 
    "affectedAreas": ["List of system areas affected"]
  },
  "technicalSummary": "Technical details for developers",
  "businessSummary": "Business impact and value for stakeholders",
  "testingNotes": ["What should be tested"],
  "deploymentNotes": ["Deployment considerations"]
}

Focus on:
- What problem this PR solves
- How it solves it
- What the impact will be
- Any risks or considerations
- Testing and deployment guidance

Write in clear, natural language that both technical and non-technical stakeholders can understand.`;
  }

  private getCodePreview(context: CodeContext): string {
    return context.files
      .slice(0, 3) // Limit to first 3 files
      .map((file) => {
        const patchPreview = file.patch
          ? file.patch.split('\n').slice(0, 10).join('\n')
          : 'No patch available';

        return `### ${file.filename}
\`\`\`diff
${patchPreview}
\`\`\``;
      })
      .join('\n\n');
  }

  private parseSummaryResponse(
    response: string,
    context: CodeContext,
  ): PRSummary {
    try {
      // Try to parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.validateAndCleanSummary(parsed);
      }
    } catch (error) {
      this.logger.warn(`Failed to parse JSON summary: ${error.message}`);
    }

    // Fallback to text parsing
    return this.parseTextSummary(response, context);
  }

  private validateAndCleanSummary(summary: any): PRSummary {
    return {
      title: summary.title || 'Code Changes',
      description: summary.description || 'Updates to codebase',
      keyChanges: Array.isArray(summary.keyChanges) ? summary.keyChanges : [],
      impactAnalysis: {
        scope: ['low', 'medium', 'high'].includes(summary.impactAnalysis?.scope)
          ? summary.impactAnalysis.scope
          : 'medium',
        riskLevel: ['low', 'medium', 'high'].includes(
          summary.impactAnalysis?.riskLevel,
        )
          ? summary.impactAnalysis.riskLevel
          : 'medium',
        affectedAreas: Array.isArray(summary.impactAnalysis?.affectedAreas)
          ? summary.impactAnalysis.affectedAreas
          : [],
      },
      technicalSummary:
        summary.technicalSummary || 'Technical changes made to the codebase',
      businessSummary:
        summary.businessSummary || 'Business value and impact of changes',
      testingNotes: Array.isArray(summary.testingNotes)
        ? summary.testingNotes
        : [],
      deploymentNotes: Array.isArray(summary.deploymentNotes)
        ? summary.deploymentNotes
        : [],
    };
  }

  private parseTextSummary(response: string, context: CodeContext): PRSummary {
    const lines = response.split('\n');
    let title = context.title;
    let description = 'Code changes and improvements';
    const keyChanges: string[] = [];

    // Simple text parsing
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('Title:') || trimmed.startsWith('**Title:**')) {
        title = trimmed.replace(/^\*?\*?Title:\*?\*?\s*/, '');
      } else if (
        trimmed.startsWith('Description:') ||
        trimmed.startsWith('**Description:**')
      ) {
        description = trimmed.replace(/^\*?\*?Description:\*?\*?\s*/, '');
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        keyChanges.push(trimmed.substring(2));
      }
    }

    return {
      title,
      description,
      keyChanges: keyChanges.slice(0, 5),
      impactAnalysis: {
        scope: this.assessScope(context),
        riskLevel: this.assessRisk(context),
        affectedAreas: this.identifyAffectedAreas(context),
      },
      technicalSummary: description,
      businessSummary: `Changes to ${context.files.length} files with focus on code quality and functionality`,
      testingNotes: ['Test affected functionality', 'Verify no regressions'],
      deploymentNotes: ['Standard deployment process', 'Monitor for issues'],
    };
  }

  private assessScope(context: CodeContext): 'low' | 'medium' | 'high' {
    const totalChanges = context.files.reduce(
      (sum, file) => sum + file.changes,
      0,
    );
    const fileCount = context.files.length;

    if (fileCount > 10 || totalChanges > 500) return 'high';
    if (fileCount > 5 || totalChanges > 100) return 'medium';
    return 'low';
  }

  private assessRisk(context: CodeContext): 'low' | 'medium' | 'high' {
    const criticalFiles = context.files.filter(
      (file) =>
        file.filename.includes('config') ||
        file.filename.includes('auth') ||
        file.filename.includes('security') ||
        file.filename.includes('database') ||
        file.filename.includes('migration'),
    );

    const hasLargeChanges = context.files.some((file) => file.changes > 200);

    if (criticalFiles.length > 0 || hasLargeChanges) return 'high';
    if (context.files.length > 5) return 'medium';
    return 'low';
  }

  private identifyAffectedAreas(context: CodeContext): string[] {
    const areas = new Set<string>();

    context.files.forEach((file) => {
      const path = file.filename.toLowerCase();

      if (path.includes('auth') || path.includes('login'))
        areas.add('Authentication');
      if (path.includes('api') || path.includes('controller')) areas.add('API');
      if (path.includes('database') || path.includes('model'))
        areas.add('Database');
      if (path.includes('ui') || path.includes('component'))
        areas.add('User Interface');
      if (path.includes('test') || path.includes('spec')) areas.add('Testing');
      if (path.includes('config') || path.includes('env'))
        areas.add('Configuration');
      if (path.includes('security')) areas.add('Security');
      if (path.includes('performance')) areas.add('Performance');
    });

    return Array.from(areas);
  }

  private generateFallbackSummary(context: CodeContext): PRSummary {
    return {
      title: context.title || 'Code Changes',
      description:
        context.description || 'Updates and improvements to the codebase',
      keyChanges: [
        `Modified ${context.files.length} files`,
        `Added ${context.files.reduce((sum, f) => sum + f.additions, 0)} lines`,
        `Removed ${context.files.reduce((sum, f) => sum + f.deletions, 0)} lines`,
      ],
      impactAnalysis: {
        scope: this.assessScope(context),
        riskLevel: this.assessRisk(context),
        affectedAreas: this.identifyAffectedAreas(context),
      },
      technicalSummary: `This PR modifies ${context.files.length} files with various code changes and improvements.`,
      businessSummary: 'Code quality improvements and feature enhancements.',
      testingNotes: ['Test all modified functionality', 'Run regression tests'],
      deploymentNotes: [
        'Follow standard deployment process',
        'Monitor application health',
      ],
    };
  }
}
