import { Injectable } from '@nestjs/common';
import { BaseAgent } from '../base/base.agent';
import { AgentIssue, AgentResult } from '../base/agent-result.interface';
import { qualitySystemPrompt } from './prompt';

@Injectable()
export class QualityAgent extends BaseAgent {
  getAgentName(): string {
    return 'QualityAgent';
  }
  getSystemPrompt(): string {
    return qualitySystemPrompt;
  }
  parseResponse(response: string): Partial<AgentResult> {
    const score = this.extractScore(response);
    const blockMerge = this.extractBlockMerge(response);
    const issues = this.extractQualityIssues(response);

    return {
      score,
      blockMerge,
      issues,
      suggestions: this.extractRefactoringOpportunities(response),
    };
  }

  private extractQualityIssues(response: string): AgentIssue[] {
    const issues: AgentIssue[] = [];
    const issueRegex =
      /- (WARNING|INFO): (.+?) \| FILE: (.+?) \| LINE: (\d+) \| FIX: (.+)/g;

    let match;
    while ((match = issueRegex.exec(response)) !== null) {
      const [, severity, description, file, line, fix] = match;
      issues.push({
        severity: severity as 'WARNING' | 'INFO',
        type: 'code_quality',
        description: description.trim(),
        file: file.trim(),
        line: parseInt(line, 10),
        fixSuggestion: fix.trim(),
        category: 'quality',
      });
    }

    return issues;
  }

  private extractRefactoringOpportunities(response: string): string[] {
    const opportunities: string[] = [];
    const opportunityMatch = response.match(
      /REFACTORING_OPPORTUNITIES:(.*?)(?=\n[A-Z_]+:|$)/s,
    );

    if (opportunityMatch) {
      const opportunityText = opportunityMatch[1];
      const lines = opportunityText.split('\n').filter((line) => line.trim());
      opportunities.push(
        ...lines.map((line) => line.replace(/^[-*]\s*/, '').trim()),
      );
    }

    return opportunities;
  }
}
