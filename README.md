# PR Review Agent

A comprehensive TypeScript/JavaScript PR review agent with configurable personas for different review styles and focus areas.

## Features

- **Multi-aspect Analysis**: Code quality, security, performance, style, and testing
- **Configurable Personas**: 7 built-in personas with different review styles
- **Language Support**: TypeScript, JavaScript, JSX, TSX, JSON, Markdown
- **Structured Output**: JSON-formatted findings with severity levels
- **Extensible Rules**: Custom rules and personas can be added
- **REST API**: Full API for integration with CI/CD pipelines

## Available Personas

### 1. Senior Engineer (Default)

- **Focus**: Architecture, maintainability, performance, security
- **Style**: Balanced
- **Best for**: Production code reviews, architectural decisions

### 2. Mentor

- **Focus**: Learning, best practices, code clarity, testing
- **Style**: Encouraging
- **Best for**: Junior developer PRs, educational reviews

### 3. Security Expert

- **Focus**: Security vulnerabilities, data protection, authentication
- **Style**: Strict
- **Best for**: Security-critical applications, compliance reviews

### 4. Performance Engineer

- **Focus**: Performance optimization, memory usage, algorithms
- **Style**: Strict
- **Best for**: Performance-critical applications, optimization reviews

### 5. Code Standards Enforcer

- **Focus**: Standards, conventions, consistency, documentation
- **Style**: Strict
- **Best for**: Team standardization, style guide enforcement

### 6. Friendly Reviewer

- **Focus**: Readability, collaboration, best practices
- **Style**: Encouraging
- **Best for**: Open source projects, collaborative environments

### 7. Software Architect

- **Focus**: Architecture, design patterns, scalability, modularity
- **Style**: Balanced
- **Best for**: System design reviews, architectural changes

## Usage

### Basic Analysis

```typescript
import { PRReviewAgentService } from './pr-review-agent.service';
import { PersonaConfig } from './persona.config';

const agent = new PRReviewAgentService(groqService, configService);

// Analyze with default persona (Senior Engineer)
const result = await agent.analyze(codeContext);

// Set specific persona
const securityPersona = PersonaConfig.getPersona('security');
agent.setPersona(securityPersona);
const securityResult = await agent.analyze(codeContext);
```

### REST API Usage

```bash
# Get available personas
GET /api/pr-review/personas

# Set persona
PUT /api/pr-review/persona
{
  "persona": "security"
}

# Analyze PR
POST /api/pr-review/analyze
{
  "prNumber": 123,
  "repoOwner": "owner",
  "repoName": "repo",
  "files": [...],
  "title": "Add new feature",
  "description": "Feature description"
}

# Analyze with specific persona
POST /api/pr-review/analyze-with-persona
{
  "context": { ... },
  "persona": "performance"
}
```

### Environment Configuration

```bash
# .env
PR_REVIEW_PERSONA=senior  # Default persona
GROQ_API_KEY=your_groq_api_key
```

## Code Context Structure

```typescript
interface CodeContext {
  prNumber: number;
  repoOwner: string;
  repoName: string;
  files: FileChange[];
  baseSha: string;
  headSha: string;
  title: string;
  description: string;
  author: string;
  branch: string;
}

interface FileChange {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch: string;
  previousFilename?: string;
  content?: string;
}
```

## Analysis Result

```typescript
interface AgentResult {
  agentName: string;
  analysisTime: number;
  comments: ReviewComment[];
  summary: string;
  score: number; // 0-100
  metadata: {
    persona: string;
    filesAnalyzed: number;
    qualityIssues: number;
    securityIssues: number;
    styleIssues: number;
    performanceIssues: number;
    testingIssues: number;
    criticalIssues: number;
  };
}

interface ReviewComment {
  file: string;
  line?: number;
  startLine?: number;
  endLine?: number;
  message: string;
  severity: 'low' | 'medium' | 'high';
  category: 'security' | 'quality' | 'performance' | 'style' | 'testing';
  suggestion?: string;
  ruleId?: string;
}
```

## Custom Personas

Create custom personas for specific team needs:

```typescript
const customPersona: ReviewPersona = {
  name: 'DevOps Engineer',
  description: 'Infrastructure and deployment focused reviewer',
  temperature: 0.1,
  focusAreas: ['infrastructure', 'deployment', 'monitoring', 'security'],
  reviewStyle: 'strict',
  greeting: '🚀 DevOps review complete.',
  positiveMessages: ['Excellent infrastructure code!'],
  criticalAdvice: 'Infrastructure issues detected.',
  generalAdvice: 'Consider operational implications.',
  codeQualityWeight: 0.2,
  securityWeight: 0.3,
  styleWeight: 0.1,
  performanceWeight: 0.25,
  testingWeight: 0.15,
};

PersonaConfig.addCustomPersona('devops', customPersona);
```

## Integration Examples

### GitHub Actions

```yaml
name: PR Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: PR Review
        run: |
          curl -X POST "${{ secrets.REVIEW_API_URL }}/api/pr-review/analyze-with-persona" \
            -H "Content-Type: application/json" \
            -d '{
              "context": {
                "prNumber": ${{ github.event.number }},
                "repoOwner": "${{ github.repository_owner }}",
                "repoName": "${{ github.event.repository.name }}",
                "title": "${{ github.event.pull_request.title }}",
                "files": []
              },
              "persona": "senior"
            }'
```

### GitLab CI

```yaml
pr_review:
  stage: review
  script:
    - |
      curl -X POST "$REVIEW_API_URL/api/pr-review/analyze" \
        -H "Content-Type: application/json" \
        -d @pr_context.json
  only:
    - merge_requests
```

## Rule Configuration

The agent includes built-in rules for common issues:

- **Security**: Hardcoded secrets, SQL injection, XSS vulnerabilities
- **Quality**: Function complexity, magic numbers, empty catch blocks
- **Performance**: Inefficient loops, synchronous operations
- **Style**: Console statements, TODO comments
- **Testing**: Missing coverage, disabled tests

Custom rules can be added via the `ReviewRulesConfig` class.

## Best Practices

1. **Choose the right persona** for your team and project type
2. **Configure environment variables** for default persona
3. **Integrate with CI/CD** for automated reviews
4. **Customize rules** for your specific coding standards
5. **Use different personas** for different types of PRs
6. **Monitor analysis time** and adjust token limits if needed

## Troubleshooting

### Common Issues

1. **High token usage**: Reduce `maxTokens` in persona config
2. **Slow analysis**: Check network connectivity to Groq API
3. **Missing comments**: Verify file types are supported
4. **Incorrect persona**: Check environment variable configuration

### Debug Mode

Enable debug logging:

```typescript
// Set LOG_LEVEL=debug in environment
const result = await agent.analyze(context);
console.log('Analysis metadata:', result.metadata);
```

## Contributing

1. Add new personas in `persona.config.ts`
2. Extend rules in `rules.config.ts`
3. Update prompts in `prompts.ts`
4. Add tests for new functionality
5. Update documentation

## License

This PR Review Agent is part of the larger code review system and follows the same licensing terms.

## Project setup

```bash
$ pnpm install
```

## Environment Variables

This project requires several environment variables to function properly. Copy the example file and configure your variables:

```bash
$ cp .env.example .env
```

Then edit the `.env` file with your actual values:

- `GROQ_API_KEY`: Your Groq API key for AI code review functionality
- `GITHUB_TOKEN`: Your GitHub personal access token for GitHub API access
- `GITHUB_WEBHOOK_SECRET`: Secret for GitHub webhook verification
- `NODE_ENV`: Environment (development/production/test)
- `PORT`: Server port (default: 3000)

### Getting API Keys

1. **Groq API Key**: Sign up at [Groq](https://console.groq.com/) and generate an API key
2. **GitHub Token**: Create a personal access token at [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
3. **GitHub Webhook Secret**: Generate a random secret for webhook verification

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
