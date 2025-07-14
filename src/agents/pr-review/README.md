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
