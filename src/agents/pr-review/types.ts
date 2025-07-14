export interface PRAnalysisRequest {
  prNumber: number;
  repoOwner: string;
  repoName: string;
  persona?: string;
  focusAreas?: string[];
  severity?: 'low' | 'medium' | 'high';
}

export interface PRAnalysisResponse {
  prNumber: number;
  persona: string;
  overallScore: number;
  summary: string;
  analysisTime: number;
  issues: {
    security: number;
    quality: number;
    performance: number;
    style: number;
    testing: number;
  };
  recommendations: string[];
  criticalIssues: number;
  canMerge: boolean;
}

export interface PersonaWeights {
  codeQuality: number;
  security: number;
  style: number;
  performance: number;
  testing: number;
}

export interface ReviewRule {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'quality' | 'performance' | 'style' | 'testing';
  severity: 'high' | 'medium' | 'low';
  enabled: boolean;
  fileTypes: string[];
  pattern?: RegExp;
  message: string;
  suggestion: string;
}

export interface CustomPersonaRequest {
  name: string;
  description: string;
  temperature: number;
  focusAreas: string[];
  reviewStyle: 'strict' | 'balanced' | 'encouraging';
  greeting: string;
  positiveMessages: string[];
  criticalAdvice: string;
  generalAdvice: string;
  weights: PersonaWeights;
}
