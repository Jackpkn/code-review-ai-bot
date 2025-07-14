import { Injectable, Logger } from '@nestjs/common';
import { CodeContext } from '../base/agent-result.interface';
import { PRSummary } from './pr-summary.service';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ChangelogEntry {
  version?: string;
  date: string;
  prNumber: number;
  title: string;
  description: string;
  author: string;
  type: 'feature' | 'bugfix' | 'improvement' | 'breaking' | 'security' | 'docs';
  changes: string[];
  breakingChanges?: string[];
  securityFixes?: string[];
}

export interface ChangelogConfig {
  filePath: string;
  format: 'markdown' | 'json' | 'yaml';
  includeAuthor: boolean;
  includePRLinks: boolean;
  groupByType: boolean;
  autoVersion: boolean;
}

@Injectable()
export class ChangelogService {
  private readonly logger = new Logger(ChangelogService.name);

  private readonly defaultConfig: ChangelogConfig = {
    filePath: 'CHANGELOG.md',
    format: 'markdown',
    includeAuthor: true,
    includePRLinks: true,
    groupByType: true,
    autoVersion: false,
  };

  async generateChangelogEntry(
    context: CodeContext,
    summary: PRSummary,
    config: Partial<ChangelogConfig> = {},
  ): Promise<ChangelogEntry> {
    const finalConfig = { ...this.defaultConfig, ...config };

    const entry: ChangelogEntry = {
      date: new Date().toISOString().split('T')[0],
      prNumber: context.prNumber,
      title: summary.title,
      description: summary.description,
      author: context.author,
      type: this.determineChangeType(context, summary),
      changes: summary.keyChanges,
    };

    // Add breaking changes if detected
    const breakingChanges = this.extractBreakingChanges(summary);
    if (breakingChanges.length > 0) {
      entry.breakingChanges = breakingChanges;
      entry.type = 'breaking';
    }

    // Add security fixes if detected
    const securityFixes = this.extractSecurityFixes(summary);
    if (securityFixes.length > 0) {
      entry.securityFixes = securityFixes;
      if (entry.type !== 'breaking') {
        entry.type = 'security';
      }
    }

    return entry;
  }

  async updateChangelog(
    entry: ChangelogEntry,
    config: Partial<ChangelogConfig> = {},
  ): Promise<void> {
    const finalConfig = { ...this.defaultConfig, ...config };

    try {
      switch (finalConfig.format) {
        case 'markdown':
          await this.updateMarkdownChangelog(entry, finalConfig);
          break;
        case 'json':
          await this.updateJsonChangelog(entry, finalConfig);
          break;
        case 'yaml':
          await this.updateYamlChangelog(entry, finalConfig);
          break;
      }

      this.logger.log(`Updated changelog: ${finalConfig.filePath}`);
    } catch (error) {
      this.logger.error(`Failed to update changelog: ${error.message}`);
      throw error;
    }
  }

  private async updateMarkdownChangelog(
    entry: ChangelogEntry,
    config: ChangelogConfig,
  ): Promise<void> {
    const changelogPath = config.filePath;
    let content = '';

    // Read existing changelog or create new one
    try {
      content = await fs.readFile(changelogPath, 'utf-8');
    } catch (error) {
      // File doesn't exist, create new changelog
      content = this.createNewMarkdownChangelog();
    }

    const newEntry = this.formatMarkdownEntry(entry, config);
    const updatedContent = this.insertMarkdownEntry(content, newEntry);

    await fs.writeFile(changelogPath, updatedContent, 'utf-8');
  }

  private createNewMarkdownChangelog(): string {
    return `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

`;
  }

  private formatMarkdownEntry(
    entry: ChangelogEntry,
    config: ChangelogConfig,
  ): string {
    const date = entry.date;
    const prLink = config.includePRLinks
      ? ` ([#${entry.prNumber}](../../pull/${entry.prNumber}))`
      : '';
    const author = config.includeAuthor ? ` by @${entry.author}` : '';

    let entryText = `### ${entry.title}${prLink}${author}\n`;
    entryText += `*${date}*\n\n`;
    entryText += `${entry.description}\n\n`;

    if (config.groupByType) {
      const typeEmoji = this.getTypeEmoji(entry.type);
      entryText += `**Type:** ${typeEmoji} ${entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}\n\n`;
    }

    if (entry.changes.length > 0) {
      entryText += `**Changes:**\n`;
      entry.changes.forEach((change) => {
        entryText += `- ${change}\n`;
      });
      entryText += '\n';
    }

    if (entry.breakingChanges && entry.breakingChanges.length > 0) {
      entryText += `**⚠️ BREAKING CHANGES:**\n`;
      entry.breakingChanges.forEach((change) => {
        entryText += `- ${change}\n`;
      });
      entryText += '\n';
    }

    if (entry.securityFixes && entry.securityFixes.length > 0) {
      entryText += `**🔒 Security Fixes:**\n`;
      entry.securityFixes.forEach((fix) => {
        entryText += `- ${fix}\n`;
      });
      entryText += '\n';
    }

    return entryText + '---\n\n';
  }

  private insertMarkdownEntry(content: string, newEntry: string): string {
    // Find the "Unreleased" section or create it
    const unreleasedRegex = /## \[Unreleased\]\s*\n/;
    const match = content.match(unreleasedRegex);

    if (match) {
      const insertIndex = match.index! + match[0].length;
      return (
        content.slice(0, insertIndex) +
        '\n' +
        newEntry +
        content.slice(insertIndex)
      );
    } else {
      // Add unreleased section if it doesn't exist
      const headerRegex = /# Changelog\s*\n/;
      const headerMatch = content.match(headerRegex);

      if (headerMatch) {
        const insertIndex = headerMatch.index! + headerMatch[0].length;
        const unreleasedSection = '\n## [Unreleased]\n\n' + newEntry;
        return (
          content.slice(0, insertIndex) +
          unreleasedSection +
          content.slice(insertIndex)
        );
      } else {
        // Prepend to existing content
        return newEntry + content;
      }
    }
  }

  private async updateJsonChangelog(
    entry: ChangelogEntry,
    config: ChangelogConfig,
  ): Promise<void> {
    let changelog: any = { entries: [] };

    try {
      const content = await fs.readFile(config.filePath, 'utf-8');
      changelog = JSON.parse(content);
    } catch (error) {
      // File doesn't exist or is invalid, start fresh
    }

    if (!changelog.entries) {
      changelog.entries = [];
    }

    changelog.entries.unshift(entry);
    changelog.lastUpdated = new Date().toISOString();

    await fs.writeFile(
      config.filePath,
      JSON.stringify(changelog, null, 2),
      'utf-8',
    );
  }

  private async updateYamlChangelog(
    entry: ChangelogEntry,
    config: ChangelogConfig,
  ): Promise<void> {
    // For simplicity, we'll use a basic YAML format
    // In a real implementation, you'd use a YAML library
    let content = '';

    try {
      content = await fs.readFile(config.filePath, 'utf-8');
    } catch (error) {
      content = 'changelog:\n  entries: []\n';
    }

    const yamlEntry = this.formatYamlEntry(entry);
    const updatedContent = this.insertYamlEntry(content, yamlEntry);

    await fs.writeFile(config.filePath, updatedContent, 'utf-8');
  }

  private formatYamlEntry(entry: ChangelogEntry): string {
    let yaml = `  - date: "${entry.date}"\n`;
    yaml += `    prNumber: ${entry.prNumber}\n`;
    yaml += `    title: "${entry.title}"\n`;
    yaml += `    description: "${entry.description}"\n`;
    yaml += `    author: "${entry.author}"\n`;
    yaml += `    type: "${entry.type}"\n`;
    yaml += `    changes:\n`;

    entry.changes.forEach((change) => {
      yaml += `      - "${change}"\n`;
    });

    if (entry.breakingChanges && entry.breakingChanges.length > 0) {
      yaml += `    breakingChanges:\n`;
      entry.breakingChanges.forEach((change) => {
        yaml += `      - "${change}"\n`;
      });
    }

    return yaml;
  }

  private insertYamlEntry(content: string, newEntry: string): string {
    const entriesRegex = /entries:\s*\n/;
    const match = content.match(entriesRegex);

    if (match) {
      const insertIndex = match.index! + match[0].length;
      return (
        content.slice(0, insertIndex) + newEntry + content.slice(insertIndex)
      );
    } else {
      return content + '\n' + newEntry;
    }
  }

  private determineChangeType(
    context: CodeContext,
    summary: PRSummary,
  ): ChangelogEntry['type'] {
    const title = context.title.toLowerCase();
    const description = (context.description || '').toLowerCase();
    const summaryText = (
      summary.description +
      ' ' +
      summary.technicalSummary
    ).toLowerCase();

    // Check for breaking changes
    if (
      title.includes('breaking') ||
      description.includes('breaking') ||
      summaryText.includes('breaking')
    ) {
      return 'breaking';
    }

    // Check for security fixes
    if (
      title.includes('security') ||
      description.includes('security') ||
      summaryText.includes('security') ||
      title.includes('cve')
    ) {
      return 'security';
    }

    // Check for bug fixes
    if (
      title.includes('fix') ||
      title.includes('bug') ||
      description.includes('fix') ||
      description.includes('bug')
    ) {
      return 'bugfix';
    }

    // Check for documentation
    if (
      context.files.every(
        (f) => f.filename.endsWith('.md') || f.filename.includes('doc'),
      )
    ) {
      return 'docs';
    }

    // Check for new features
    if (
      title.includes('feat') ||
      title.includes('add') ||
      description.includes('feature') ||
      description.includes('new')
    ) {
      return 'feature';
    }

    // Default to improvement
    return 'improvement';
  }

  private extractBreakingChanges(summary: PRSummary): string[] {
    const breakingChanges: string[] = [];

    summary.keyChanges.forEach((change) => {
      if (
        change.toLowerCase().includes('breaking') ||
        change.toLowerCase().includes('remove') ||
        change.toLowerCase().includes('deprecate')
      ) {
        breakingChanges.push(change);
      }
    });

    if (summary.description.toLowerCase().includes('breaking')) {
      breakingChanges.push(
        'Breaking API changes - see PR description for details',
      );
    }

    return breakingChanges;
  }

  private extractSecurityFixes(summary: PRSummary): string[] {
    const securityFixes: string[] = [];

    summary.keyChanges.forEach((change) => {
      if (
        change.toLowerCase().includes('security') ||
        change.toLowerCase().includes('vulnerability') ||
        change.toLowerCase().includes('cve')
      ) {
        securityFixes.push(change);
      }
    });

    return securityFixes;
  }

  private getTypeEmoji(type: ChangelogEntry['type']): string {
    const emojis = {
      feature: '✨',
      bugfix: '🐛',
      improvement: '⚡',
      breaking: '💥',
      security: '🔒',
      docs: '📚',
    };

    return emojis[type] || '📝';
  }

  async generateReleaseNotes(
    entries: ChangelogEntry[],
    version?: string,
  ): Promise<string> {
    const releaseDate = new Date().toISOString().split('T')[0];
    const versionHeader = version
      ? `## [${version}] - ${releaseDate}`
      : `## Release - ${releaseDate}`;

    let notes = `${versionHeader}\n\n`;

    // Group by type
    const grouped = entries.reduce(
      (acc, entry) => {
        if (!acc[entry.type]) acc[entry.type] = [];
        acc[entry.type].push(entry);
        return acc;
      },
      {} as Record<string, ChangelogEntry[]>,
    );

    // Order types by importance
    const typeOrder: ChangelogEntry['type'][] = [
      'breaking',
      'security',
      'feature',
      'improvement',
      'bugfix',
      'docs',
    ];

    typeOrder.forEach((type) => {
      if (grouped[type] && grouped[type].length > 0) {
        const emoji = this.getTypeEmoji(type);
        notes += `### ${emoji} ${type.charAt(0).toUpperCase() + type.slice(1)}s\n\n`;

        grouped[type].forEach((entry) => {
          notes += `- **${entry.title}** (#${entry.prNumber})\n`;
          if (entry.description !== entry.title) {
            notes += `  ${entry.description}\n`;
          }
          notes += '\n';
        });
      }
    });

    return notes;
  }
}
