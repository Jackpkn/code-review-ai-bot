import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { log } from 'console';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    rawBody: true, // Enable raw body parsing
  });

  // ENABLE CORS FOR WEBHOOK
  app.enableCors();
  // global prefix
  app.setGlobalPrefix('api');
  const port = process.env.PORT ?? 5000;
  await app.listen(port);
  log(`PR Review BOT is running on http://localhost:${port}`);
}
bootstrap();
