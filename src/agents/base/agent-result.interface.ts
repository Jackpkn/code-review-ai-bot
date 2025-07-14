export interface ReviewComment {
  file: string;
  line?: number;
  message: string;
  severity: 'low' | 'medium' | 'high';
  category: string;
  suggestion?: string;
  ruleId?: string;
  startLine?: number;
  endLine?: number;
}

export interface AgentResult {
  agentName: string;
  analysisTime: number;
  comments: ReviewComment[];
  summary: string;
  score?: number; // 0-100
  metadata?: Record<string, any>;
}

export interface AgentConfig {
  name: string;
  description: string;
  supportedFileTypes: string[];
  enabled: boolean;
  priority: number; // 1-10, higher = more important
  maxTokens: number;
  temperature: number;
}

export interface CodeContext {
  prNumber: number;
  repoOwner: string;
  repoName: string;
  files: FileChange[];
  baseSha: string;
  headSha: string;
  title: string;
  description: string;
  author: string;
  branch: string;
}

export interface FileChange {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch: string;
  previousFilename?: string;
  content?: string; // Full file content if needed
}

export interface AnalysisRequest {
  context: CodeContext;
  agents: string[]; // List of agent names to run
  priority: 'low' | 'medium' | 'high';
  timeout?: number; // In seconds
}

export interface AnalysisResult {
  prNumber: number;
  status: 'completed' | 'failed' | 'timeout';
  agentResults: AgentResult[];
  overallScore: number;
  summary: string;
  startTime: Date;
  endTime: Date;
  totalTime: number;
  errors?: string[];
}

export enum AgentType {
  SECURITY = 'security',
  QUALITY = 'quality',
  PERFORMANCE = 'performance',
  TESTING = 'testing',
  SUMMARY = 'summary',
}

export interface AgentMetrics {
  agentName: string;
  totalAnalyses: number;
  avgExecutionTime: number;
  successRate: number;
  lastRun: Date;
  errorCount: number;
}
