/**
 * Enhanced PR Review Agent - Usage Examples
 *
 * This file demonstrates how to use the Enhanced PR Review and Auto-Fix Agent
 * with various configurations and personas.
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { EnhancedPRAgentService } from '../src/agents/pr-review/enhanced-pr-agent.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const enhancedPRService = app.get(EnhancedPRAgentService);

  console.log('🚀 Enhanced PR Review Agent Examples\n');

  // Example 1: Basic Enhanced Review
  console.log('📋 Example 1: Basic Enhanced Review');
  try {
    const basicAnalysis = await enhancedPRService.processFullPRAnalysis(
      'octocat', // GitHub owner
      'Hello-World', // Repository name
      1, // PR number
      {
        persona: 'senior',
        enableAutoFix: true,
        enableAutoLabeling: true,
        enableChangelogGeneration: false,
      },
    );

    console.log('✅ Basic Analysis Results:');
    console.log(`   - PR: #${basicAnalysis.prNumber}`);
    console.log(`   - Summary: ${basicAnalysis.summary.title}`);
    console.log(`   - Score: ${basicAnalysis.reviewResult.score}/100`);
    console.log(
      `   - Issues Found: ${basicAnalysis.reviewResult.comments.length}`,
    );
    console.log(`   - Auto-fixes: ${basicAnalysis.autoFixes.totalIssuesFixed}`);
    console.log(`   - Labels: ${basicAnalysis.labeling.labels.length}`);
    console.log('');
  } catch (error) {
    console.log('❌ Basic analysis failed:', error.message);
  }

  // Example 2: Security-Focused Review
  console.log('🔒 Example 2: Security-Focused Review');
  try {
    const securityAnalysis = await enhancedPRService.processFullPRAnalysis(
      'octocat',
      'Hello-World',
      1,
      {
        persona: 'security-analyst',
        enableAutoFix: false, // Manual review for security
        enableAutoLabeling: true,
        confidenceThreshold: 95, // High confidence only
      },
    );

    console.log('✅ Security Analysis Results:');
    console.log(
      `   - Persona: ${securityAnalysis.reviewResult.metadata?.persona}`,
    );
    console.log(
      `   - Security Issues: ${securityAnalysis.reviewResult.metadata?.securityIssues || 0}`,
    );
    console.log(
      `   - Critical Issues: ${securityAnalysis.reviewResult.metadata?.criticalIssues || 0}`,
    );
    console.log(
      `   - Risk Level: ${securityAnalysis.summary.impactAnalysis.riskLevel}`,
    );
    console.log('');
  } catch (error) {
    console.log('❌ Security analysis failed:', error.message);
  }

  // Example 3: Auto-Fix with High Confidence
  console.log('🔧 Example 3: Auto-Fix with High Confidence');
  try {
    const autoFixAnalysis = await enhancedPRService.processFullPRAnalysis(
      'octocat',
      'Hello-World',
      1,
      {
        persona: 'friendly',
        enableAutoFix: true,
        autoApplyFixes: true, // Auto-apply fixes
        confidenceThreshold: 90, // High confidence threshold
        enableAutoLabeling: true,
      },
    );

    console.log('✅ Auto-Fix Analysis Results:');
    console.log(
      `   - Total Fixes Generated: ${autoFixAnalysis.autoFixes.totalIssuesFixed}`,
    );
    console.log(
      `   - Average Confidence: ${Math.round(autoFixAnalysis.autoFixes.confidenceScore)}%`,
    );
    console.log(
      `   - Auto-Applied Labels: ${autoFixAnalysis.labeling.autoApplyLabels.length}`,
    );

    if (autoFixAnalysis.autoFixes.fixes.length > 0) {
      console.log('   - Sample Fixes:');
      autoFixAnalysis.autoFixes.fixes.slice(0, 3).forEach((fix, index) => {
        console.log(
          `     ${index + 1}. ${fix.file}:${fix.line} - ${fix.description} (${fix.confidence}%)`,
        );
      });
    }
    console.log('');
  } catch (error) {
    console.log('❌ Auto-fix analysis failed:', error.message);
  }

  // Example 4: Tech Lead Review with Full Features
  console.log('👨‍💼 Example 4: Tech Lead Review with Full Features');
  try {
    const techLeadAnalysis = await enhancedPRService.processFullPRAnalysis(
      'octocat',
      'Hello-World',
      1,
      {
        persona: 'tech-lead',
        enableAutoFix: true,
        enableAutoLabeling: true,
        enableChangelogGeneration: true,
        enableCITrigger: true,
        workflowsToTrigger: ['test.yml', 'build.yml'],
        confidenceThreshold: 85,
      },
    );

    console.log('✅ Tech Lead Analysis Results:');
    console.log(
      `   - Business Summary: ${techLeadAnalysis.summary.businessSummary}`,
    );
    console.log(
      `   - Technical Summary: ${techLeadAnalysis.summary.technicalSummary}`,
    );
    console.log(
      `   - Affected Areas: ${techLeadAnalysis.summary.impactAnalysis.affectedAreas.join(', ')}`,
    );
    console.log(
      `   - Testing Notes: ${techLeadAnalysis.summary.testingNotes.length} items`,
    );
    console.log(
      `   - Deployment Notes: ${techLeadAnalysis.summary.deploymentNotes.length} items`,
    );
    console.log(`   - CI Triggered: ${techLeadAnalysis.ciChecks.triggered}`);
    console.log(
      `   - Changelog Entry: ${techLeadAnalysis.changelogEntry.type}`,
    );
    console.log('');
  } catch (error) {
    console.log('❌ Tech lead analysis failed:', error.message);
  }

  // Example 5: Performance-Focused Review
  console.log('⚡ Example 5: Performance-Focused Review');
  try {
    const performanceAnalysis = await enhancedPRService.processFullPRAnalysis(
      'octocat',
      'Hello-World',
      1,
      {
        persona: 'performance',
        enableAutoFix: true,
        enableAutoLabeling: true,
      },
    );

    console.log('✅ Performance Analysis Results:');
    console.log(
      `   - Performance Issues: ${performanceAnalysis.reviewResult.metadata?.performanceIssues || 0}`,
    );
    console.log(
      `   - Overall Score: ${performanceAnalysis.reviewResult.score}/100`,
    );

    const perfIssues = performanceAnalysis.reviewResult.comments.filter(
      (c) => c.category === 'performance',
    );
    if (perfIssues.length > 0) {
      console.log('   - Performance Issues Found:');
      perfIssues.slice(0, 3).forEach((issue, index) => {
        console.log(
          `     ${index + 1}. ${issue.file}:${issue.line || 'N/A'} - ${issue.message}`,
        );
      });
    }
    console.log('');
  } catch (error) {
    console.log('❌ Performance analysis failed:', error.message);
  }

  // Example 6: Demonstrate Individual Services
  console.log('🔍 Example 6: Individual Service Usage');

  // Get individual services
  const summaryService = app.get('PRSummaryService');
  const labelingService = app.get('PRLabelingService');
  const autoFixService = app.get('AutoFixService');

  // Example context for individual services
  const exampleContext = {
    prNumber: 1,
    repoOwner: 'octocat',
    repoName: 'Hello-World',
    files: [
      {
        filename: 'src/example.ts',
        status: 'modified' as const,
        additions: 10,
        deletions: 5,
        changes: 15,
        patch: '+console.log("debug");',
      },
    ],
    baseSha: 'abc123',
    headSha: 'def456',
    title: 'Fix authentication bug',
    description: 'This PR fixes a critical authentication vulnerability',
    author: 'developer',
    branch: 'fix/auth-bug',
  };

  try {
    // Generate summary only
    const summary = await summaryService.generateNaturalLanguageSummary(
      exampleContext,
      { name: 'Senior Engineer', focusAreas: ['security', 'quality'] },
    );
    console.log('📝 Generated Summary:');
    console.log(`   - Title: ${summary.title}`);
    console.log(`   - Risk Level: ${summary.impactAnalysis.riskLevel}`);
    console.log(`   - Key Changes: ${summary.keyChanges.length} items`);
    console.log('');

    // Generate labels only
    const labeling = await labelingService.generateLabels(
      exampleContext,
      summary,
    );
    console.log('🏷️ Generated Labels:');
    console.log(`   - Total Labels: ${labeling.labels.length}`);
    console.log(`   - Auto-Apply: ${labeling.autoApplyLabels.length}`);
    console.log(
      `   - Recommended: ${labeling.labels
        .filter((l) => l.confidence >= 80)
        .map((l) => l.name)
        .join(', ')}`,
    );
    console.log('');
  } catch (error) {
    console.log('❌ Individual service usage failed:', error.message);
  }

  // Example 7: Configuration Examples
  console.log('⚙️ Example 7: Configuration Examples');

  const configurations = [
    {
      name: 'Strict Security Review',
      config: {
        persona: 'security-analyst',
        enableAutoFix: false,
        autoApplyFixes: false,
        confidenceThreshold: 95,
        enableAutoLabeling: true,
      },
    },
    {
      name: 'Developer-Friendly Review',
      config: {
        persona: 'friendly',
        enableAutoFix: true,
        autoApplyFixes: true,
        confidenceThreshold: 75,
        enableAutoLabeling: true,
        enableChangelogGeneration: true,
      },
    },
    {
      name: 'Production-Ready Review',
      config: {
        persona: 'senior',
        enableAutoFix: true,
        autoApplyFixes: false,
        confidenceThreshold: 90,
        enableAutoLabeling: true,
        enableChangelogGeneration: true,
        enableCITrigger: true,
        workflowsToTrigger: ['test.yml', 'security-scan.yml', 'build.yml'],
      },
    },
  ];

  configurations.forEach((config, index) => {
    console.log(`   ${index + 1}. ${config.name}:`);
    console.log(`      - Persona: ${config.config.persona}`);
    console.log(
      `      - Auto-Fix: ${config.config.enableAutoFix ? 'Enabled' : 'Disabled'}`,
    );
    console.log(
      `      - Auto-Apply: ${config.config.autoApplyFixes ? 'Yes' : 'No'}`,
    );
    console.log(`      - Confidence: ${config.config.confidenceThreshold}%`);
    console.log(
      `      - CI Trigger: ${config.config.enableCITrigger ? 'Yes' : 'No'}`,
    );
    console.log('');
  });

  console.log('🎉 Enhanced PR Review Agent Examples Complete!');
  console.log('\n📚 Next Steps:');
  console.log('   1. Configure your GitHub webhook');
  console.log('   2. Set environment variables');
  console.log('   3. Choose your preferred persona');
  console.log('   4. Enable desired features');
  console.log('   5. Start reviewing PRs automatically!');

  await app.close();
}

// Run examples if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as runEnhancedPRExamples };
