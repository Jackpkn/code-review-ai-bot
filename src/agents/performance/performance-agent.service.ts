import { Injectable } from '@nestjs/common';
import { BaseAgentService } from '../base/base-agent.service';
import {
  AgentConfig,
  CodeContext,
  ReviewComment,
  AgentResult,
} from '../base/agent-result.interface';

@Injectable()
export class PerformanceAgentService extends BaseAgentService {
  private readonly config: AgentConfig = {
    name: 'Performance Agent',
    description:
      'Analyzes code for performance issues, bottlenecks, and optimization opportunities',
    supportedFileTypes: [
      'js',
      'ts',
      'jsx',
      'tsx',
      'py',
      'java',
      'cs',
      'php',
      'go',
      'rb',
      'rs',
      'cpp',
      'c',
    ],
    enabled: true,
    priority: 6, // Medium-high priority for performance
    maxTokens: 2000,
    temperature: 0.1,
  };

  getConfig(): AgentConfig {
    return this.config;
  }

  async analyze(context: CodeContext): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      const relevantFiles = context.files.filter(
        (file) =>
          this.shouldAnalyzeFile(file.filename) && file.status !== 'removed',
      );

      if (relevantFiles.length === 0) {
        return {
          agentName: this.config.name,
          analysisTime: Date.now() - startTime,
          comments: [],
          summary: 'No relevant files found for performance analysis',
          score: 100,
        };
      }

      const comments: ReviewComment[] = [];

      for (const file of relevantFiles) {
        const fileComments = await this.analyzeFile(
          file.filename,
          file.patch,
          context,
        );
        comments.push(...fileComments);
      }

      const score = this.calculatePerformanceScore(comments);
      const summary = this.generateSummary(comments, relevantFiles.length);

      return this.validateResult({
        agentName: this.config.name,
        analysisTime: Date.now() - startTime,
        comments,
        summary,
        score,
        metadata: {
          filesAnalyzed: relevantFiles.length,
          criticalPerformanceIssues: comments.filter(
            (c) => c.severity === 'high',
          ).length,
          algorithmicIssues: comments.filter((c) => c.category === 'algorithm')
            .length,
          memoryIssues: comments.filter((c) => c.category === 'memory').length,
          databaseIssues: comments.filter((c) => c.category === 'database')
            .length,
          networkIssues: comments.filter((c) => c.category === 'network')
            .length,
        },
      });
    } catch (error) {
      this.logger.error(
        `Performance analysis failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async analyzeFile(
    filename: string,
    patch: string,
    context: CodeContext,
  ): Promise<ReviewComment[]> {
    const fileExtension = this.getFileExtension(filename);
    const systemPrompt = this.getSystemPrompt(fileExtension);

    const userPrompt = `Review this code change for performance issues:

**File**: ${filename}
**PR Context**: ${context.title}
**Changes**:
\`\`\`diff
${patch}
\`\`\`

**Focus Areas**:
- Algorithmic complexity (O(n²) vs O(n log n))
- Memory usage and leaks
- Database query efficiency
- Network/API call optimization
- Resource management
- Caching opportunities
- Concurrent/parallel processing
- I/O operations efficiency

Analyze only the added/modified lines (+ prefix). Provide specific line numbers and optimization suggestions.`;

    const response = await this.callLLM(systemPrompt, userPrompt, 0.1);
    return this.parseResponse(response);
  }

  private getSystemPrompt(fileExtension: string): string {
    const basePrompt = `You are a performance optimization expert reviewing code changes. Focus on:

1. **Algorithmic Complexity**: Inefficient algorithms, nested loops, unnecessary computations
2. **Memory Management**: Memory leaks, excessive allocations, object retention
3. **Database Performance**: N+1 queries, missing indexes, inefficient queries
4. **Network Optimization**: Redundant API calls, missing request batching, timeout issues
5. **Resource Management**: File handles, connections, expensive operations
6. **Caching**: Missing cache opportunities, cache invalidation issues
7. **Concurrency**: Threading issues, blocking operations, parallel processing opportunities
8. **I/O Operations**: Inefficient file operations, synchronous blocking calls
9. **Data Structures**: Inappropriate data structure choices, inefficient access patterns
10. **Framework Specific**: ORM issues, middleware bottlenecks, rendering performance`;

    const languageSpecific = this.getLanguageSpecificRules(fileExtension);

    return `${basePrompt}

${languageSpecific}

Respond with a JSON array of findings:
[
  {
    "file": "filename",
    "line": 42,
    "message": "Detailed performance issue description with impact analysis",
    "severity": "high|medium|low",
    "category": "algorithm|memory|database|network|concurrency|io|cache|resource|data-structure",
    "suggestion": "Specific optimization recommendation with expected improvement",
    "ruleId": "PERF-001"
  }
]

Prioritize issues with significant performance impact. Include complexity analysis where relevant (O(n), O(n²), etc.).`;
  }

  private getLanguageSpecificRules(fileExtension: string): string {
    const rules = {
      ts: `
**TypeScript/JavaScript Specific**:
- Array methods efficiency (forEach vs for loops)
- Object property access patterns
- Promise/async optimization
- Event loop blocking operations
- Memory leaks in closures and event listeners
- Bundle size and tree shaking
- React/Vue rendering performance
- DOM manipulation efficiency`,

      py: `
**Python Specific**:
- List comprehensions vs loops
- Generator expressions for large datasets
- Global Interpreter Lock (GIL) considerations
- Memory-efficient data processing
- Database ORM query optimization
- Asyncio and concurrent programming
- NumPy/Pandas optimization patterns`,

      java: `
**Java Specific**:
- Collection framework efficiency
- StringBuilder vs String concatenation
- Stream API performance
- Garbage collection impact
- Thread pool management
- JVM optimization opportunities
- Database connection pooling`,

      go: `
**Go Specific**:
- Goroutine and channel efficiency
- Memory allocation patterns
- Interface vs concrete types
- Slice and map operations
- Context cancellation patterns
- Database connection management
- Profiling and benchmarking considerations`,

      rs: `
**Rust Specific**:
- Zero-cost abstractions usage
- Memory allocation patterns
- Iterator vs loop efficiency
- Borrowing vs cloning decisions
- Async/await performance
- SIMD optimization opportunities
- Unsafe code necessity evaluation`,

      cpp: `
**C++ Specific**:
- Memory management and RAII
- Template instantiation costs
- Virtual function call overhead
- STL container efficiency
- Move semantics usage
- Memory alignment and cache efficiency
- Compiler optimization hints`,
    };

    return rules[fileExtension] || rules['ts']; // Default to TypeScript rules
  }

  private calculatePerformanceScore(comments: ReviewComment[]): number {
    if (comments.length === 0) return 100;

    const severityWeights = { high: 35, medium: 15, low: 5 };
    const categoryWeights = {
      algorithm: 2.0, // Highest impact
      memory: 1.8,
      database: 1.7,
      network: 1.5,
      concurrency: 1.4,
      io: 1.3,
      cache: 1.2,
      resource: 1.1,
      'data-structure': 1.0,
    };

    const totalDeduction = comments.reduce((sum, comment) => {
      const severityScore = severityWeights[comment.severity];
      const categoryMultiplier = categoryWeights[comment.category] || 1.0;
      return sum + severityScore * categoryMultiplier;
    }, 0);

    return Math.max(0, 100 - totalDeduction);
  }

  private generateSummary(
    comments: ReviewComment[],
    filesAnalyzed: number,
  ): string {
    if (comments.length === 0) {
      return `⚡ Performance analysis complete. Reviewed ${filesAnalyzed} files - no performance issues detected.`;
    }

    const high = comments.filter((c) => c.severity === 'high').length;
    const medium = comments.filter((c) => c.severity === 'medium').length;
    const low = comments.filter((c) => c.severity === 'low').length;

    // Get performance categories with counts
    const categoryCount = comments.reduce((acc, comment) => {
      acc[comment.category] = (acc[comment.category] || 0) + 1;
      return acc;
    }, {});

    const topCategories = Object.entries(categoryCount)
      .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, count]) => `${category} (${count})`)
      .join(', ');

    let summary = `⚡ Performance analysis found ${comments.length} issue(s) across ${filesAnalyzed} files. `;

    if (high > 0) {
      summary += `${high} critical performance bottlenecks requiring immediate optimization. `;
    }
    if (medium > 0) {
      summary += `${medium} moderate performance concerns. `;
    }
    if (low > 0) {
      summary += `${low} minor optimization opportunities. `;
    }

    summary += `Main performance areas: ${topCategories}.`;

    // Add specific recommendations based on issue types
    const hasAlgorithmic = comments.some((c) => c.category === 'algorithm');
    const hasMemory = comments.some((c) => c.category === 'memory');
    const hasDatabase = comments.some((c) => c.category === 'database');
    const hasNetwork = comments.some((c) => c.category === 'network');

    if (hasAlgorithmic || hasMemory || hasDatabase || hasNetwork) {
      summary += ' Priority fixes: ';
      const priorities: string[] = [];
      if (hasAlgorithmic) priorities.push('optimize algorithms');
      if (hasMemory) priorities.push('reduce memory usage');
      if (hasDatabase) priorities.push('improve query efficiency');
      if (hasNetwork) priorities.push('optimize network calls');
      summary += priorities.slice(0, 2).join(' and ') + '.';
    }

    // Add impact assessment
    const criticalIssues = comments.filter((c) => c.severity === 'high');
    if (criticalIssues.length > 0) {
      const impactAreas = [...new Set(criticalIssues.map((c) => c.category))];
      summary += ` Critical impact areas: ${impactAreas.join(', ')}.`;
    }

    return summary;
  }
}
