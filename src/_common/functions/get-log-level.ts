import { LogLevel } from '@nestjs/common';

export function getLogLevel(logLevel?: string): LogLevel[] {
  const logLevelMap: Record<LogLevel | string, LogLevel[]> = {
    fatal: ['fatal'],
    error: ['error', 'fatal'],
    warn: ['error', 'fatal', 'warn'],
    info: ['error', 'fatal', 'warn', 'log'],
    debug: ['error', 'fatal', 'warn', 'log', 'debug'],
    verbose: ['error', 'fatal', 'warn', 'log', 'debug', 'verbose'],
  };
  return logLevelMap[logLevel] || logLevelMap['info'];
}
