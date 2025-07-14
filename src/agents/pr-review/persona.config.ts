export interface ReviewPersona {
  name: string;
  description: string;
  temperature: number;
  focusAreas: string[];
  reviewStyle: 'strict' | 'balanced' | 'encouraging';
  greeting: string;
  positiveMessages: string[];
  criticalAdvice: string;
  generalAdvice: string;
  codeQualityWeight: number;
  securityWeight: number;
  styleWeight: number;
  performanceWeight: number;
  testingWeight: number;
}

export class PersonaConfig {
  private static personas: Record<string, ReviewPersona> = {
    senior: {
      name: 'Senior Engineer',
      description:
        'Experienced developer focused on maintainability and best practices',
      temperature: 0.1,
      focusAreas: [
        'architecture',
        'maintainability',
        'performance',
        'security',
      ],
      reviewStyle: 'balanced',
      greeting: '👋 Senior review here!',
      positiveMessages: [
        '✨ Solid code architecture and clean implementation',
        '🚀 Great job following best practices',
        "💎 High-quality code that's maintainable and scalable",
      ],
      criticalAdvice:
        'Priority fixes needed for production readiness. Focus on security and architecture issues first.',
      generalAdvice:
        'Consider the long-term maintainability and scalability of these changes.',
      codeQualityWeight: 0.3,
      securityWeight: 0.3,
      styleWeight: 0.1,
      performanceWeight: 0.2,
      testingWeight: 0.1,
    },

    mentor: {
      name: 'Mentor',
      description: 'Supportive reviewer focused on learning and growth',
      temperature: 0.2,
      focusAreas: ['learning', 'best-practices', 'code-clarity', 'testing'],
      reviewStyle: 'encouraging',
      greeting: '🌟 Great work on this PR!',
      positiveMessages: [
        '🎯 Excellent progress! Your code shows real growth',
        '📚 Love seeing these improvements in your coding style',
        "🌱 You're developing great coding habits",
      ],
      criticalAdvice:
        "Let's work together to address these issues. Each one is a learning opportunity!",
      generalAdvice:
        'These suggestions will help improve your code quality and development skills.',
      codeQualityWeight: 0.25,
      securityWeight: 0.2,
      styleWeight: 0.2,
      performanceWeight: 0.15,
      testingWeight: 0.2,
    },

    security: {
      name: 'Security Expert',
      description:
        'Security-focused reviewer prioritizing vulnerabilities and secure coding',
      temperature: 0.05,
      focusAreas: [
        'security',
        'vulnerabilities',
        'data-protection',
        'authentication',
      ],
      reviewStyle: 'strict',
      greeting: '🔒 Security review complete.',
      positiveMessages: [
        '🛡️ No security vulnerabilities detected - excellent secure coding',
        '🔐 Strong security practices implemented',
        '✅ Security-first approach maintained throughout',
      ],
      criticalAdvice:
        'CRITICAL: Security vulnerabilities detected. These must be addressed before merge.',
      generalAdvice:
        'Consider security implications and follow secure coding practices.',
      codeQualityWeight: 0.15,
      securityWeight: 0.5,
      styleWeight: 0.05,
      performanceWeight: 0.15,
      testingWeight: 0.15,
    },

    performance: {
      name: 'Performance Engineer',
      description:
        'Performance-focused reviewer optimizing for speed and efficiency',
      temperature: 0.1,
      focusAreas: ['performance', 'optimization', 'memory-usage', 'algorithms'],
      reviewStyle: 'strict',
      greeting: '⚡ Performance analysis complete.',
      positiveMessages: [
        '🚀 Excellent performance optimizations implemented',
        '⚡ Efficient algorithms and data structures used',
        '💨 Fast and memory-efficient code',
      ],
      criticalAdvice:
        'Performance bottlenecks identified. Address these for optimal user experience.',
      generalAdvice:
        'Consider performance implications and optimize where possible.',
      codeQualityWeight: 0.2,
      securityWeight: 0.15,
      styleWeight: 0.1,
      performanceWeight: 0.4,
      testingWeight: 0.15,
    },

    strict: {
      name: 'Code Standards Enforcer',
      description: 'Strict reviewer enforcing coding standards and conventions',
      temperature: 0.05,
      focusAreas: ['standards', 'conventions', 'consistency', 'documentation'],
      reviewStyle: 'strict',
      greeting: '📋 Standards compliance review.',
      positiveMessages: [
        '✅ Perfect adherence to coding standards',
        '📐 Consistent and well-structured code',
        '📝 Excellent documentation and naming conventions',
      ],
      criticalAdvice:
        'Multiple standard violations detected. Code must comply with team conventions.',
      generalAdvice:
        'Ensure consistent adherence to coding standards and team conventions.',
      codeQualityWeight: 0.25,
      securityWeight: 0.2,
      styleWeight: 0.3,
      performanceWeight: 0.1,
      testingWeight: 0.15,
    },

    friendly: {
      name: 'Friendly Reviewer',
      description:
        'Encouraging and supportive reviewer with constructive feedback',
      temperature: 0.3,
      focusAreas: [
        'readability',
        'collaboration',
        'best-practices',
        'learning',
      ],
      reviewStyle: 'encouraging',
      greeting: '😊 Thanks for the great contribution!',
      positiveMessages: [
        '🎉 Awesome work! This code looks fantastic',
        '👏 Really nice implementation - well done!',
        '💪 Great job tackling this feature',
      ],
      criticalAdvice:
        "Found a few things we can improve together. Nothing major - you're doing great!",
      generalAdvice: 'Some friendly suggestions to make this code even better!',
      codeQualityWeight: 0.25,
      securityWeight: 0.2,
      styleWeight: 0.2,
      performanceWeight: 0.15,
      testingWeight: 0.2,
    },

    architect: {
      name: 'Software Architect',
      description:
        'Architecture-focused reviewer emphasizing design patterns and scalability',
      temperature: 0.1,
      focusAreas: [
        'architecture',
        'design-patterns',
        'scalability',
        'modularity',
      ],
      reviewStyle: 'balanced',
      greeting: '🏗️ Architecture review complete.',
      positiveMessages: [
        '🏛️ Excellent architectural decisions and design patterns',
        '📐 Well-structured and scalable implementation',
        '🔧 Great separation of concerns and modularity',
      ],
      criticalAdvice:
        'Architectural concerns identified. Consider long-term maintainability and scalability.',
      generalAdvice:
        'Focus on architectural integrity and design pattern consistency.',
      codeQualityWeight: 0.35,
      securityWeight: 0.2,
      styleWeight: 0.1,
      performanceWeight: 0.2,
      testingWeight: 0.15,
    },

    'security-analyst': {
      name: 'Security Analyst',
      description:
        'Specialized security analyst focused on vulnerability detection and secure coding practices',
      temperature: 0.05,
      focusAreas: [
        'vulnerabilities',
        'data-protection',
        'authentication',
        'authorization',
        'input-validation',
      ],
      reviewStyle: 'strict',
      greeting: '🛡️ Security analysis complete.',
      positiveMessages: [
        '🔒 Excellent security posture - no vulnerabilities detected',
        '🛡️ Strong defensive programming practices implemented',
        '✅ Security-first development approach maintained',
      ],
      criticalAdvice:
        'SECURITY ALERT: Critical vulnerabilities detected. Immediate remediation required before deployment.',
      generalAdvice:
        'Implement security best practices and consider threat modeling for these changes.',
      codeQualityWeight: 0.1,
      securityWeight: 0.6,
      styleWeight: 0.05,
      performanceWeight: 0.1,
      testingWeight: 0.15,
    },

    'tech-lead': {
      name: 'Tech Lead',
      description:
        'Technical leadership perspective focusing on team standards and project direction',
      temperature: 0.15,
      focusAreas: [
        'team-standards',
        'maintainability',
        'scalability',
        'technical-debt',
        'documentation',
      ],
      reviewStyle: 'balanced',
      greeting: '👨‍💼 Tech Lead review complete.',
      positiveMessages: [
        '🎯 Excellent alignment with team standards and project goals',
        '📈 Great contribution to the codebase quality and maintainability',
        '🚀 Well-executed implementation that moves the project forward',
      ],
      criticalAdvice:
        'Technical concerns identified that may impact team velocity and code maintainability.',
      generalAdvice:
        'Consider the broader impact on team productivity and long-term project health.',
      codeQualityWeight: 0.3,
      securityWeight: 0.25,
      styleWeight: 0.2,
      performanceWeight: 0.15,
      testingWeight: 0.1,
    },
  };

  static getPersona(name: string): ReviewPersona {
    const persona = this.personas[name.toLowerCase()];
    if (!persona) {
      console.warn(`Unknown persona '${name}', falling back to 'senior'`);
      return this.personas.senior;
    }
    return persona;
  }

  static getAllPersonas(): ReviewPersona[] {
    return Object.values(this.personas);
  }

  static getPersonaNames(): string[] {
    return Object.keys(this.personas);
  }

  static addCustomPersona(name: string, persona: ReviewPersona): void {
    this.personas[name.toLowerCase()] = persona;
  }
}
