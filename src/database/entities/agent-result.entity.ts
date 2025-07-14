export class AgentResult {
    id: string;
    reviewId: string;
    agentName: string;
    score: number;
    issues: any[]; // Issue[]
    suggestions: any[]; // Suggestion[]
    executionTime: number;
    status: string; // AgentStatus
} 