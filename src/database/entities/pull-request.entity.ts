export class PullRequest {
    id: string;
    githubId: number;
    repositoryId: string;
    number: number;
    title: string;
    description: string;
    author: string;
    headSha: string;
    baseSha: string;
    status: string; // PRStatus
    createdAt: Date;
    updatedAt: Date;
} 