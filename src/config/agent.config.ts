export interface AgentConfig {
    temperature: number;
    maxTokens: number;
    timeout: number;
    [key: string]: any;
}

export const defaultAgentConfig: AgentConfig = {
    temperature: 0.7,
    maxTokens: 2048,
    timeout: 60_000,
}; 