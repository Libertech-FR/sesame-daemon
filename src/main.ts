import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LogLevel } from '@nestjs/common';
import configInstance from './config';

declare const module: any;
(async (): Promise<void> => {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: await setLogLevel(),
  });
  await app.init();

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose((): Promise<void> => app.close());
  }
})();

async function setLogLevel(): Promise<LogLevel[]> {
  const config = await configInstance();
  const logLevelMap: Record<LogLevel | string, LogLevel[]> = {
    fatal: ['fatal'],
    error: ['error', 'fatal'],
    warn: ['error', 'fatal', 'warn'],
    info: ['error', 'fatal', 'warn', 'log'],
    debug: ['error', 'fatal', 'warn', 'log', 'debug'],
    verbose: ['error', 'fatal', 'warn', 'log', 'debug', 'verbose'],
  };
  return logLevelMap[config.logLevel] || logLevelMap['warn'];
}
