import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  GITHUB_TOKEN: Joi.string().required(),
  GITHUB_WEBHOOK_SECRET: Joi.string().required(),
  GROQ_API_KEY: Joi.string().required(),
});
