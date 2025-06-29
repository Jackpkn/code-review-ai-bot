import {
  Injectable,
  LogLevel,
  LoggerService as NestLoggerService,
} from '@nestjs/common';
import pino from 'pino';
@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: pino.Logger;
  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    });
  }
  log(message: any, context?: string) {
    this.logger.info({ context }, message);
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error({ context, trace }, message);
  }

  warn(message: any, context?: string) {
    this.logger.warn({ context }, message);
  }

  debug(message: any, context?: string) {
    this.logger.debug({ context }, message);
  }

  verbose(message: any, context?: string) {
    this.logger.trace({ context }, message);
  }
  fatal?(message: any, ...optionalParams: any[]) {
    this.logger.fatal({ message }, ...optionalParams);
  }
  // TODO: IMPLEMENT LATER ON
  setLogLevels?(levels: LogLevel[]) {
    throw new Error('Method not implemented.');
  }
}
