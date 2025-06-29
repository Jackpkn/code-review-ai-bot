export class Utils {
  static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  static truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }
  static extractRepoInfor(
    repoUrl: string,
  ): { owner: string; repo: string } | null {
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) return null;
    return {
      owner: match[1],
      repo: match[2].replace('.git', ''),
    };
  }
  static isValidGitHubUrl(url: string): boolean {
    return /^https:\/\/github\.com\/[^\/]+\/[^\/]+/.test(url);
  }
  static formatFiles(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }
  static getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLocaleLowerCase() || '';
  }

  static isTextFile(filename: string): boolean {
    const textExtensions = [
      'txt',
      'md',
      'json',
      'xml',
      'yml',
      'yaml',
      'csv',
      'log',
      'js',
      'ts',
      'jsx',
      'tsx',
      'py',
      'java',
      'cpp',
      'c',
      'cs',
      'php',
      'rb',
      'go',
      'rs',
      'swift',
      'kt',
      'scala',
      'r',
      'sql',
      'html',
      'css',
      'scss',
      'sass',
      'vue',
      'svelte',
      'sh',
      'bash',
      'zsh',
      'ps1',
      'bat',
      'dockerfile',
    ];

    const extension = this.getFileExtension(filename);
    return textExtensions.includes(extension);
  }
  static sanitizeMarkdown(text: string): string {
    // Basic markdown sanitization
    return text
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .trim();
  }
}
