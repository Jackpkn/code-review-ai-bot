import { ReviewRule } from './types';

export class ReviewRulesConfig {
  private static rules: ReviewRule[] = [
    // Security Rules
    {
      id: 'SEC-001',
      name: 'Hardcoded Secrets',
      description: 'Detect hardcoded API keys, passwords, or tokens',
      category: 'security',
      severity: 'high',
      enabled: true,
      fileTypes: ['js', 'ts', 'jsx', 'tsx'],
      pattern: /(api[_-]?key|password|secret|token)\s*[:=]\s*['"][^'"]+['"]/i,
      message: 'Potential hardcoded secret detected',
      suggestion:
        'Use environment variables or secure configuration management',
    },
    {
      id: 'SEC-002',
      name: 'SQL Injection Risk',
      description: 'Detect potential SQL injection vulnerabilities',
      category: 'security',
      severity: 'high',
      enabled: true,
      fileTypes: ['js', 'ts'],
      pattern: /query\s*\(\s*['"`][^'"`]*\$\{[^}]+\}[^'"`]*['"`]/,
      message: 'Potential SQL injection vulnerability',
      suggestion: 'Use parameterized queries or prepared statements',
    },
    {
      id: 'SEC-003',
      name: 'XSS Risk',
      description: 'Detect potential XSS vulnerabilities',
      category: 'security',
      severity: 'high',
      enabled: true,
      fileTypes: ['jsx', 'tsx'],
      pattern: /dangerouslySetInnerHTML|innerHTML\s*=/,
      message: 'Potential XSS vulnerability',
      suggestion: 'Sanitize user input or use safe alternatives',
    },

    // Quality Rules
    {
      id: 'QUAL-001',
      name: 'Function Complexity',
      description: 'Detect overly complex functions',
      category: 'quality',
      severity: 'medium',
      enabled: true,
      fileTypes: ['js', 'ts', 'jsx', 'tsx'],
      message: 'Function appears to be overly complex',
      suggestion: 'Consider breaking down into smaller functions',
    },
    {
      id: 'QUAL-002',
      name: 'Magic Numbers',
      description: 'Detect magic numbers in code',
      category: 'quality',
      severity: 'low',
      enabled: true,
      fileTypes: ['js', 'ts', 'jsx', 'tsx'],
      pattern: /(?<![a-zA-Z_$])[0-9]{2,}(?![a-zA-Z_$])/,
      message: 'Magic number detected',
      suggestion: 'Consider using named constants',
    },
    {
      id: 'QUAL-003',
      name: 'Empty Catch Block',
      description: 'Detect empty catch blocks',
      category: 'quality',
      severity: 'medium',
      enabled: true,
      fileTypes: ['js', 'ts', 'jsx', 'tsx'],
      pattern: /catch\s*\([^)]*\)\s*\{\s*\}/,
      message: 'Empty catch block detected',
      suggestion: 'Handle errors appropriately or add logging',
    },

    // Performance Rules
    {
      id: 'PERF-001',
      name: 'Inefficient Loop',
      description: 'Detect potentially inefficient loops',
      category: 'performance',
      severity: 'medium',
      enabled: true,
      fileTypes: ['js', 'ts', 'jsx', 'tsx'],
      pattern: /for\s*\([^)]*\.length[^)]*\)/,
      message: 'Potentially inefficient loop detected',
      suggestion: 'Cache array length or use more efficient iteration',
    },
    {
      id: 'PERF-002',
      name: 'Synchronous File Operations',
      description: 'Detect synchronous file operations',
      category: 'performance',
      severity: 'medium',
      enabled: true,
      fileTypes: ['js', 'ts'],
      pattern: /fs\.(readFileSync|writeFileSync|existsSync)/,
      message: 'Synchronous file operation detected',
      suggestion: 'Use asynchronous alternatives for better performance',
    },

    // Style Rules
    {
      id: 'STYLE-001',
      name: 'Console Statements',
      description: 'Detect console statements in production code',
      category: 'style',
      severity: 'low',
      enabled: true,
      fileTypes: ['js', 'ts', 'jsx', 'tsx'],
      pattern: /console\.(log|warn|error|debug)/,
      message: 'Console statement detected',
      suggestion: 'Use proper logging library or remove debug statements',
    },
    {
      id: 'STYLE-002',
      name: 'TODO Comments',
      description: 'Detect TODO comments',
      category: 'style',
      severity: 'low',
      enabled: true,
      fileTypes: ['js', 'ts', 'jsx', 'tsx'],
      pattern: /\/\/\s*TODO|\/\*\s*TODO/i,
      message: 'TODO comment detected',
      suggestion: 'Consider creating a ticket or completing the task',
    },

    // Testing Rules
    {
      id: 'TEST-001',
      name: 'Missing Test Coverage',
      description: 'Detect functions without corresponding tests',
      category: 'testing',
      severity: 'medium',
      enabled: true,
      fileTypes: ['js', 'ts'],
      message: 'Function may lack test coverage',
      suggestion: 'Add unit tests for this function',
    },
    {
      id: 'TEST-002',
      name: 'Disabled Tests',
      description: 'Detect disabled or skipped tests',
      category: 'testing',
      severity: 'medium',
      enabled: true,
      fileTypes: ['js', 'ts'],
      pattern: /(describe|it|test)\.skip|x(describe|it|test)/,
      message: 'Disabled test detected',
      suggestion: 'Enable test or remove if no longer needed',
    },
  ];

  static getAllRules(): ReviewRule[] {
    return this.rules.filter((rule) => rule.enabled);
  }

  static getRulesByCategory(category: string): ReviewRule[] {
    return this.rules.filter(
      (rule) => rule.category === category && rule.enabled,
    );
  }

  static getRulesByFileType(fileType: string): ReviewRule[] {
    return this.rules.filter(
      (rule) =>
        rule.enabled &&
        (rule.fileTypes.length === 0 || rule.fileTypes.includes(fileType)),
    );
  }

  static getRule(id: string): ReviewRule | undefined {
    return this.rules.find((rule) => rule.id === id);
  }

  static addCustomRule(rule: ReviewRule): void {
    this.rules.push(rule);
  }

  static updateRule(id: string, updates: Partial<ReviewRule>): boolean {
    const ruleIndex = this.rules.findIndex((rule) => rule.id === id);
    if (ruleIndex === -1) return false;

    this.rules[ruleIndex] = { ...this.rules[ruleIndex], ...updates };
    return true;
  }

  static disableRule(id: string): boolean {
    return this.updateRule(id, { enabled: false });
  }

  static enableRule(id: string): boolean {
    return this.updateRule(id, { enabled: true });
  }
}
