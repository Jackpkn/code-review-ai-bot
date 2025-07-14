# Enhanced PR Review and Auto-Fix Agent

A comprehensive GitHub PR review system with AI-powered analysis, auto-fix suggestions, natural language summaries, and automated workflows.

## 🚀 Features

### ✅ Implemented Features

1. **Natural Language PR Summaries**
   - Business and technical summaries
   - Impact analysis with risk assessment
   - Key changes identification
   - Testing and deployment notes

2. **Persona-Based Reviews**
   - **Security Analyst**: Focus on vulnerabilities and secure coding
   - **Tech Lead**: Team standards and project direction
   - **Senior Engineer**: Architecture and best practices
   - **Mentor**: Learning-focused, encouraging feedback
   - **Performance Engineer**: Speed and efficiency optimization
   - **Code Standards Enforcer**: Strict adherence to conventions
   - **Friendly Reviewer**: Supportive and constructive
   - **Software Architect**: Design patterns and scalability

3. **Auto-Fix Suggestions**
   - Intelligent code fixes with confidence scoring
   - Support for style issues, code smells, and simple bugs
   - Automatic application of high-confidence fixes
   - Detailed fix explanations and previews

4. **Smart PR Labeling**
   - Automatic label generation based on PR content
   - Size labels (XS, S, M, L, XL)
   - Type labels (feature, bugfix, refactor, docs, test)
   - Area labels (frontend, backend, database, config)
   - Risk and priority labels
   - Custom label creation

5. **Changelog Generation**
   - Automatic changelog entries
   - Multiple formats (Markdown, JSON, YAML)
   - Breaking changes detection
   - Security fixes identification
   - Release notes generation

6. **CI Integration**
   - Trigger workflows based on PR analysis
   - Custom check runs with detailed results
   - Integration with existing CI/CD pipelines

7. **Inline Code Comments**
   - Specific line-by-line feedback
   - Actionable suggestions with code examples
   - Severity-based prioritization
   - Auto-fix integration in comments

## 🛠️ Setup and Configuration

### Environment Variables

```bash
# Core Configuration
PR_REVIEW_PERSONA=senior                    # Default persona
USE_ENHANCED_PR_REVIEW=true                # Enable enhanced features
GROQ_API_KEY=your_groq_api_key             # AI service key
GITHUB_TOKEN=your_github_token             # GitHub API access

# Auto-Fix Configuration
ENABLE_AUTO_FIX=true                       # Enable auto-fix generation
AUTO_APPLY_FIXES=false                     # Auto-apply high-confidence fixes
AUTO_FIX_CONFIDENCE_THRESHOLD=80           # Minimum confidence for auto-apply

# Labeling Configuration
ENABLE_AUTO_LABELING=true                  # Enable automatic labeling

# Changelog Configuration
ENABLE_CHANGELOG=true                      # Enable changelog generation
CHANGELOG_FORMAT=markdown                  # Format: markdown, json, yaml
CHANGELOG_PATH=CHANGELOG.md                # Changelog file path

# CI Integration
ENABLE_CI_TRIGGER=false                    # Enable CI workflow triggering
CI_WORKFLOWS_TO_TRIGGER=test.yml,build.yml # Comma-separated workflow files

# GitHub Webhook
GITHUB_WEBHOOK_SECRET=your_webhook_secret  # Webhook signature verification
```

### GitHub Webhook Setup

1. Go to your repository settings → Webhooks
2. Add webhook with URL: `https://your-domain.com/api/webhook/github`
3. Select events: `Pull requests`, `Pull request reviews`
4. Set content type to `application/json`
5. Add your webhook secret

## 📡 API Endpoints

### Enhanced Analysis

```bash
# Full PR analysis with all features
POST /api/pr-review/analyze/enhanced
{
  "owner": "username",
  "repo": "repository",
  "prNumber": 123,
  "config": {
    "persona": "security-analyst",
    "enableAutoFix": true,
    "enableAutoLabeling": true,
    "enableChangelogGeneration": true,
    "autoApplyFixes": false,
    "confidenceThreshold": 85
  }
}

# Analyze and post review to GitHub
POST /api/pr-review/analyze/enhanced/with-review
{
  "owner": "username",
  "repo": "repository",
  "prNumber": 123,
  "commitSha": "abc123def456",
  "config": { ... }
}
```

### Individual Features

```bash
# Generate natural language summary
POST /api/pr-review/summary
{
  "context": { ... },
  "persona": "tech-lead"
}

# Generate auto-fix suggestions
POST /api/pr-review/auto-fix/analyze
{
  "comments": [...],
  "fileContents": { "file.ts": "content..." }
}

# Generate labels
POST /api/pr-review/labels/generate
{
  "context": { ... },
  "summary": { ... },
  "comments": [...]
}

# Generate changelog entry
POST /api/pr-review/changelog/generate
{
  "context": { ... },
  "summary": { ... }
}
```

### Configuration

```bash
# Get available features and personas
GET /api/pr-review/features

# Health check
GET /api/pr-review/health

# Persona management
GET /api/pr-review/personas
PUT /api/pr-review/persona
POST /api/pr-review/personas/custom
```

## 🎯 Usage Examples

### 1. Basic Enhanced Review

```typescript
// Webhook automatically triggers enhanced review
// Or manually trigger via API:

const response = await fetch('/api/pr-review/analyze/enhanced', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    owner: 'myorg',
    repo: 'myproject',
    prNumber: 42,
    config: {
      persona: 'senior',
      enableAutoFix: true,
      enableAutoLabeling: true,
    },
  }),
});

const analysis = await response.json();
console.log('PR Analysis:', analysis);
```

### 2. Security-Focused Review

```typescript
const securityReview = await fetch('/api/pr-review/analyze/enhanced', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    owner: 'myorg',
    repo: 'myproject',
    prNumber: 42,
    config: {
      persona: 'security-analyst',
      enableAutoFix: false, // Manual review for security
      confidenceThreshold: 95, // High confidence only
    },
  }),
});
```

### 3. Auto-Fix with High Confidence

```typescript
const autoFixReview = await fetch('/api/pr-review/analyze/enhanced', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    owner: 'myorg',
    repo: 'myproject',
    prNumber: 42,
    config: {
      persona: 'friendly',
      enableAutoFix: true,
      autoApplyFixes: true,
      confidenceThreshold: 90,
    },
  }),
});
```

## 🔧 Customization

### Custom Personas

```typescript
// Add custom persona via API
await fetch('/api/pr-review/personas/custom', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'devops-engineer',
    persona: {
      name: 'DevOps Engineer',
      description: 'Infrastructure and deployment focused',
      temperature: 0.1,
      focusAreas: ['infrastructure', 'deployment', 'monitoring'],
      reviewStyle: 'strict',
      greeting: '🚀 DevOps review complete.',
      positiveMessages: ['Excellent infrastructure practices!'],
      criticalAdvice: 'Infrastructure issues require immediate attention.',
      generalAdvice: 'Consider operational impact of changes.',
      codeQualityWeight: 0.2,
      securityWeight: 0.3,
      styleWeight: 0.1,
      performanceWeight: 0.25,
      testingWeight: 0.15,
    },
  }),
});
```

### Custom Rules

```typescript
// Extend auto-fix rules
import { ReviewRulesConfig } from './rules.config';

ReviewRulesConfig.addCustomRule({
  id: 'CUSTOM-001',
  name: 'Custom Rule',
  description: 'Custom code pattern detection',
  category: 'quality',
  severity: 'medium',
  enabled: true,
  fileTypes: ['ts', 'js'],
  pattern: /customPattern/,
  message: 'Custom issue detected',
  suggestion: 'Apply custom fix',
});
```

## 📊 Example Output

### Enhanced Review Comment

```markdown
# 🤖 Enhanced PR Review

## 📋 Summary

**Add user authentication system**

This PR implements a comprehensive user authentication system with JWT tokens, password hashing, and role-based access control.

### Key Changes

- Add JWT authentication middleware
- Implement password hashing with bcrypt
- Create user roles and permissions system
- Add login/logout endpoints
- Update database schema for users

### Impact Analysis

- **Scope**: high
- **Risk Level**: medium
- **Affected Areas**: Authentication, API, Database

## 🔍 Code Review Results

**Overall Score**: 78/100

👋 Senior review here! Found 8 issue(s) across 12 files: 🔒 2 security, 📊 3 quality, ⚡ 1 performance, 🎨 2 style. Consider the long-term maintainability and scalability of these changes.

### Issue Breakdown

- 🔒 Security: 2
- 📊 Quality: 3
- ⚡ Performance: 1
- 🎨 Style: 2
- 🧪 Testing: 0

## 🔧 Auto-Fix Suggestions

🔧 Generated 3 auto-fixes: 2 style, 1 quality. Average confidence: 85%

Found 3 auto-fixable issues with 85% average confidence.

## 🏷️ Suggested Labels

Recommended: `size/L`, `type/feature`, `area/backend`, `area/database`, `security`

## 🧪 Testing Notes

- Test authentication flows with valid/invalid credentials
- Verify JWT token expiration and refresh
- Test role-based access control
- Validate password hashing security

## 🚀 Deployment Notes

- Update environment variables for JWT secrets
- Run database migrations for user schema
- Configure session storage
- Update API documentation

---

_Generated by Enhanced PR Review Agent_
```

### Auto-Fix Example

````markdown
## 🔧 Auto-Fix Report

🔧 Generated 3 auto-fixes: 2 style, 1 quality. Average confidence: 85%

### Available Fixes

**1. src/auth/auth.service.ts:42** (90% confidence)
Remove console.log statement from production code

```diff
- console.log('User authenticated:', user.id);
+ // User authenticated successfully
```
````

**2. src/utils/helpers.ts:15** (85% confidence)
Replace magic number with named constant

```diff
- if (attempts > 3) {
+ const MAX_LOGIN_ATTEMPTS = 3;
+ if (attempts > MAX_LOGIN_ATTEMPTS) {
```

**3. src/auth/middleware.ts:28** (80% confidence)
Add proper error handling

```diff
- } catch (error) {
+ } catch (error) {
+   logger.error('Authentication error:', error);
+   return res.status(401).json({ error: 'Authentication failed' });
```

_High-confidence fixes (≥80%) can be auto-applied if enabled._

````

## 🚦 CI/CD Integration

### GitHub Actions Example

```yaml
name: Enhanced PR Review
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  pr-review:
    runs-on: ubuntu-latest
    steps:
      - name: Enhanced PR Review
        uses: ./
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          persona: 'senior'
          enable-auto-fix: true
          enable-labeling: true
          confidence-threshold: 85
````

### Webhook Integration

The system automatically processes PRs when webhooks are configured. The webhook handler will:

1. Detect PR events (opened, synchronize)
2. Analyze the PR with the configured persona
3. Generate summaries, auto-fixes, and labels
4. Post comprehensive review comments
5. Apply labels and trigger CI workflows
6. Update changelog if configured

## 🔍 Monitoring and Debugging

### Health Check

```bash
curl https://your-domain.com/api/pr-review/health
```

### Logs

The system provides detailed logging for:

- PR analysis progress
- Auto-fix generation and application
- Label creation and application
- Changelog updates
- CI workflow triggers
- Error handling and fallbacks

### Metrics

Track key metrics:

- Analysis time per PR
- Auto-fix success rate
- Review accuracy
- User satisfaction
- CI integration success

## 🛡️ Security Considerations

1. **API Keys**: Store securely in environment variables
2. **Webhook Secrets**: Verify all incoming webhooks
3. **Auto-Fix**: Review before auto-applying fixes
4. **Permissions**: Use minimal required GitHub permissions
5. **Rate Limits**: Respect GitHub API rate limits
6. **Data Privacy**: Don't log sensitive code content

## 🚀 Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "run", "start:prod"]
```

### Environment Setup

```bash
# Production deployment
docker build -t pr-review-agent .
docker run -d \
  --name pr-review-agent \
  -p 5000:5000 \
  --env-file .env.production \
  pr-review-agent
```

## 📈 Future Enhancements

- [ ] Machine learning model training on review feedback
- [ ] Integration with more code analysis tools
- [ ] Support for additional programming languages
- [ ] Advanced metrics and analytics dashboard
- [ ] Team-specific persona customization
- [ ] Integration with project management tools
- [ ] Automated dependency updates
- [ ] Code complexity analysis
- [ ] Performance benchmarking integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Update documentation
5. Submit a pull request

The Enhanced PR Review Agent will review your contribution! 🎉
