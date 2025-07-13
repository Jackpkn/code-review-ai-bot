import { Injectable } from '@nestjs/common';
import { AgentIssue, AgentResult } from '../base/agent-result.interface';
import { BaseAgent } from '../base/base.agent';
import { securitySystemPrompt } from './security.prompt';
@Injectable()
export class SecurityAgent extends BaseAgent {
  getAgentName(): string {
    return 'Security';
  }
  getSystemPrompt(): string {
    return securitySystemPrompt;
  }
  parseResponse(response: any): Partial<AgentResult> {
    const score = this.extractScore(response);
    const blockMerge = this.extractBlockMerge(response);
    const issues = this.extractIssues(response);
    // Additional secret detection
    const secrets = this.detectSecrets(response);
    if (secrets.length > 0) {
      issues.push(...secrets);
    }

    return {
      score,
      blockMerge: blockMerge || issues.some((i) => i.severity === 'CRITICAL'),
      issues,
      suggestions: this.extractSuggestions(response),
    };
  }
  private extractIssues(response: string): AgentIssue[] {
    const issues: AgentIssue[] = [];
    const issueRegex =
      /- (CRITICAL|WARNING|INFO): (.+?) \| FILE: (.+?) \| LINE: (\d+) \| FIX: (.+)/g;

    let match;
    while ((match = issueRegex.exec(response)) !== null) {
      const [, severity, description, file, line, fix] = match;
      issues.push({
        severity: severity as 'CRITICAL' | 'WARNING' | 'INFO',
        type: 'security_vulnerability',
        description: description.trim(),
        file: file.trim(),
        line: parseInt(line, 10),
        fixSuggestion: fix.trim(),
        category: 'security',
      });
    }

    return issues;
  }
  private detectSecrets(codeDiff: string): AgentIssue[] {
    const secretPatterns = [
      {
        name: 'API Key',
        pattern: /api[_-]?key['":\s]*[=:]['":\s]*([a-zA-Z0-9-_]{20,})/gi,
        severity: 'CRITICAL' as const,
      },
      {
        name: 'AWS Access Key',
        pattern: /AKIA[0-9A-Z]{16}/gi,
        severity: 'CRITICAL' as const,
      },
      {
        name: 'Password',
        pattern: /password['":\s]*[=:]['":\s]*([^\s'",]{8,})/gi,
        severity: 'CRITICAL' as const,
      },
      {
        name: 'JWT Token',
        pattern: /eyJ[a-zA-Z0-9-_]+\.eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+/gi,
        severity: 'WARNING' as const,
      },
      {
        name: 'Connection String',
        pattern: /mongodb:\/\/[^\s'"]+/gi,
        severity: 'WARNING' as const,
      },
      {
        name: 'Sensitive Data',
        pattern: /secret['":\s]*[=:\s]*['"][^'"]+['"]/gi,
        severity: 'WARNING' as const,
      },
    ];

    const secrets: AgentIssue[] = [];

    for (const { name, pattern, severity } of secretPatterns) {
      const matches = Array.from(codeDiff.matchAll(pattern));

      for (const match of matches) {
        const lineNumber = codeDiff
          .substring(0, match.index)
          .split('\n').length;

        secrets.push({
          severity,
          type: 'secret_exposure',
          description: `Possible ${name} detected in code`,
          line: lineNumber,
          fixSuggestion: `Remove ${name} and use environment variables instead`,
          category: 'security',
        });
      }
    }

    return secrets;
  }
  private extractSuggestions(response: string): string[] {
    // Extract suggestions from response
    const suggestions: string[] = [];
    const suggestionMatch = response.match(
      /SUGGESTIONS:(.*?)(?=\n[A-Z_]+:|$)/s,
    );

    if (suggestionMatch) {
      const suggestionText = suggestionMatch[1];
      const lines = suggestionText.split('\n').filter((line) => line.trim());
      suggestions.push(
        ...lines.map((line) => line.replace(/^[-*]\s*/, '').trim()),
      );
    }

    return suggestions;
  }
}
