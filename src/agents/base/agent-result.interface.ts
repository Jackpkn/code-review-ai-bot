export interface AgentIssue {
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  type: string;
  description: string;
  line?: number;
  file?: string;
  fixSuggestion?: string;
  category: 'security' | 'quality' | 'performance' | 'testing';
}

export interface AgentResult {
  agentName: string;
  score: number;
  issues: AgentIssue[];
  suggestions: string[];
  blockMerge: boolean;
  metadata?: Record<string, any>;
  executionTime?: number;
}

export interface PRData {
  title: string;
  body: string;
  author: string;
  diff: string;
  filesChanged: number;
  additions: number;
  deletions: number;
  changedFiles: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string;
  }>;
  repository: {
    name: string;
    fullName: string;
  };
  comments: Array<{
    id: string;
    body: string;
    author: string;
    createdAt: string;
  }>;
}
export interface ReviewResult {
  action: 'APPROVE' | 'REQUEST_CHANGES' | 'BLOCK';
  message: string;
  scores: Record<string, number>;
  summary: string;
  estimatedFixTime?: string;
  oneClickFixes?: Array<{
    issue: string;
    command: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
}
