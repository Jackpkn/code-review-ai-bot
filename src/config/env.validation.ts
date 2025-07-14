import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(5000),

  // GitHub Configuration
  GITHUB_TOKEN: Joi.string().required(),
  GITHUB_WEBHOOK_SECRET: Joi.string().required(),

  // AI Service Configuration
  GROQ_API_KEY: Joi.string().required(),
  GROQ_MODEL: Joi.string().default('meta-llama/llama-4-scout-17b-16e-instruct'),

  // Enhanced PR Review Configuration
  USE_ENHANCED_PR_REVIEW: Joi.boolean().default(true),
  PR_REVIEW_PERSONA: Joi.string().default('senior'),

  // Auto-Fix Configuration
  ENABLE_AUTO_FIX: Joi.boolean().default(true),
  AUTO_APPLY_FIXES: Joi.boolean().default(false),
  AUTO_FIX_CONFIDENCE_THRESHOLD: Joi.number().min(0).max(100).default(80),

  // Labeling Configuration
  ENABLE_AUTO_LABELING: Joi.boolean().default(true),

  // Changelog Configuration
  ENABLE_CHANGELOG: Joi.boolean().default(false),
  CHANGELOG_FORMAT: Joi.string()
    .valid('markdown', 'json', 'yaml')
    .default('markdown'),
  CHANGELOG_PATH: Joi.string().default('CHANGELOG.md'),

  // CI Integration
  ENABLE_CI_TRIGGER: Joi.boolean().default(false),
  CI_WORKFLOWS_TO_TRIGGER: Joi.string().optional(),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),
});
