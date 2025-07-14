export interface PRContext {
    diff: ParsedDiff;
    files: GitHubFile[];
    commits: CommitPattern[];
    context: CodeContext;
    history: ReviewHistory;
}

export interface ParsedDiff {
    files: string[];
    addedLines: number;
    removedLines: number;
    changes: Array<{ file: string; additions: number; deletions: number }>;
}

export interface GitHubFile {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
}

export interface CodeContext {
    dependencies: string[];
    criticalPaths: string[];
    imports: string[];
    exports: string[];
}

export interface CommitPattern {
    message: string;
    author: string;
    date: string;
}

export interface ReviewHistory {
    previousReviews: string[];
} 