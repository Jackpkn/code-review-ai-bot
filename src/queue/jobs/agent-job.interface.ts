export interface AgentJob {
    reviewId: string;
    agentName: string;
    prContext: any; // PRContext
    agentConfig: any; // AgentConfig
    timeout: number;
} 