import { GroqService } from './src/shared/lln.service';

// Define the expected response types
interface ReviewSuggestion {
    filename: string;
    line?: number;
    type: 'bug' | 'improvement' | 'security' | 'naming' | 'edge_case' | 'documentation' | 'testing';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    suggestedFix?: string;
}

interface ReviewResult {
    summary: string;
    overallScore: number;
    suggestions: ReviewSuggestion[];
}

// Sample code to test the AI review
const sampleCode = `
## Pull Request Information
**Title:** Fix user authentication bug
**Description:** This PR fixes a critical authentication issue where users were being logged out unexpectedly.
**PR Number:** #123

## Files Changed (2 files):

### File: src/auth/auth.service.ts
**Status:** modified
**Changes:** +15 -8

**Diff:**
\`\`\`diff
- export class AuthService {
-   async validateUser(token: string): Promise<User | null> {
-     const decoded = jwt.verify(token, process.env.JWT_SECRET);
-     return this.userService.findById(decoded.userId);
-   }
+ export class AuthService {
+   async validateUser(token: string): Promise<User | null> {
+     try {
+       const decoded = jwt.verify(token, process.env.JWT_SECRET);
+       return await this.userService.findById(decoded.userId);
+     } catch (error) {
+       this.logger.error('Token validation failed:', error);
+       return null;
+     }
+   }
\`\`\`

### File: src/auth/auth.controller.ts
**Status:** modified
**Changes:** +5 -3

**Diff:**
\`\`\`diff
- @Post('login')
- async login(@Body() credentials: LoginDto) {
-   const user = await this.authService.validateUser(credentials);
+ @Post('login')
+ async login(@Body() credentials: LoginDto) {
+   const user = await this.authService.validateUser(credentials);
+   if (!user) {
+     throw new UnauthorizedException('Invalid credentials');
+   }
    return this.authService.generateToken(user);
  }
\`\`\`
`;

// Validation functions
function validateReviewResult(result: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!result.summary || typeof result.summary !== 'string') {
        errors.push('Missing or invalid "summary" field');
    }

    if (typeof result.overallScore !== 'number' || result.overallScore < 1 || result.overallScore > 10) {
        errors.push('"overallScore" must be a number between 1-10');
    }

    if (!Array.isArray(result.suggestions)) {
        errors.push('"suggestions" must be an array');
    } else {
        // Validate each suggestion
        result.suggestions.forEach((suggestion: any, index: number) => {
            const suggestionErrors = validateSuggestion(suggestion, index);
            errors.push(...suggestionErrors);
        });
    }

    return { isValid: errors.length === 0, errors };
}

function validateSuggestion(suggestion: any, index: number): string[] {
    const errors: string[] = [];

    // Required fields
    if (!suggestion.filename || typeof suggestion.filename !== 'string') {
        errors.push(`Suggestion ${index + 1}: Missing or invalid "filename"`);
    }

    if (!suggestion.type || !['bug', 'improvement', 'security', 'naming', 'edge_case', 'documentation', 'testing'].includes(suggestion.type)) {
        errors.push(`Suggestion ${index + 1}: Invalid "type" - must be one of: bug, improvement, security, naming, edge_case, documentation, testing`);
    }

    if (!suggestion.severity || !['low', 'medium', 'high', 'critical'].includes(suggestion.severity)) {
        errors.push(`Suggestion ${index + 1}: Invalid "severity" - must be one of: low, medium, high, critical`);
    }

    if (!suggestion.title || typeof suggestion.title !== 'string') {
        errors.push(`Suggestion ${index + 1}: Missing or invalid "title"`);
    }

    if (!suggestion.description || typeof suggestion.description !== 'string') {
        errors.push(`Suggestion ${index + 1}: Missing or invalid "description"`);
    }

    // Optional fields validation
    if (suggestion.line !== undefined && (typeof suggestion.line !== 'number' || suggestion.line < 1)) {
        errors.push(`Suggestion ${index + 1}: "line" must be a positive number if provided`);
    }

    if (suggestion.suggestedFix !== undefined && typeof suggestion.suggestedFix !== 'string') {
        errors.push(`Suggestion ${index + 1}: "suggestedFix" must be a string if provided`);
    }

    return errors;
}

async function testAIOutput() {
    console.log('🤖 Testing AI Code Review Output Format...\n');

    try {
        // Check for API key
        if (!process.env.GROQ_API_KEY) {
            throw new Error('GROQ_API_KEY environment variable is required');
        }

        // Create a mock config service
        const configService = {
            get: (key: string) => {
                if (key === 'GROQ_API_KEY') {
                    return process.env.GROQ_API_KEY;
                }
                return null;
            }
        };

        // Create Groq service instance
        const groqService = new GroqService(configService as any);

        console.log('📤 Sending sample code to AI for review...');

        // Get AI response
        const response = await groqService.getGroqChatCompletion(sampleCode);
        const aiMessage = response.choices[0]?.message?.content;

        if (!aiMessage) {
            throw new Error('No content in AI response');
        }

        console.log('📥 Received AI response:\n');
        console.log('='.repeat(80));
        console.log(aiMessage);
        console.log('='.repeat(80));

        // Test JSON parsing
        console.log('\n🔍 Testing JSON parsing...');

        const jsonMatch = aiMessage.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
            const jsonStr = jsonMatch[1];

            try {
                const parsed: ReviewResult = JSON.parse(jsonStr);

                console.log('✅ Successfully parsed JSON response!');
                console.log('\n📊 Parsed structure:');
                console.log(JSON.stringify(parsed, null, 2));

                // Validate structure
                console.log('\n🔍 Validating response structure...');
                const validation = validateReviewResult(parsed);

                if (validation.isValid) {
                    console.log('✅ All validation checks passed!');
                    console.log(`📈 Overall Score: ${parsed.overallScore}/10`);
                    console.log(`💡 Found ${parsed.suggestions.length} suggestions`);
                    console.log(`📝 Summary: ${parsed.summary}`);
                } else {
                    console.log('❌ Validation failed:');
                    validation.errors.forEach(error => console.log(`  - ${error}`));
                }

            } catch (parseError) {
                console.log('❌ Failed to parse JSON:', parseError);
                console.log('Raw JSON string:');
                console.log(jsonStr);
            }

        } else {
            console.log('❌ No JSON block found in response');
            console.log('📝 Response appears to be in text format instead of JSON');

            // Try to find any JSON-like content
            const jsonLikeMatch = aiMessage.match(/\{[\s\S]*\}/);
            if (jsonLikeMatch) {
                console.log('🔍 Found JSON-like content, attempting to parse...');
                try {
                    const parsed = JSON.parse(jsonLikeMatch[0]);
                    console.log('✅ Found and parsed JSON-like content!');
                    console.log(JSON.stringify(parsed, null, 2));
                } catch (error) {
                    console.log('❌ Failed to parse JSON-like content');
                }
            }
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);

        if (error.message.includes('GROQ_API_KEY')) {
            console.log('\n💡 Make sure to set your GROQ_API_KEY environment variable:');
            console.log('export GROQ_API_KEY=your_api_key_here');
        }
    }
}

// Run the test
testAIOutput(); 