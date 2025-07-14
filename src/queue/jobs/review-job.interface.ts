export interface ReviewJob {
    pullRequestId: string;
    repositoryId: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    triggerEvent: 'opened' | 'synchronize' | 'review_requested';
    metadata: {
        fileCount: number;
        linesChanged: number;
        hasSecurityFiles: boolean;
    };
} 