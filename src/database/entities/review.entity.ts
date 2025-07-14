export class Review {
    id: string;
    pullRequestId: string;
    overallScore: number;
    status: string; // ReviewStatus
    agentResults: any[]; // AgentResult[]
    finalSummary: string;
    createdAt: Date;
} 