import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LogLevel } from '@nestjs/common';
import configInstance from './config';

declare const module: any;
(async (): Promise<void> => {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: await setLogLevel(),
  });

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose((): Promise<void> => app.close());
  }
})();

async function setLogLevel(): Promise<LogLevel[]> {
  let loggerOptions: LogLevel[] = ['error', 'warn', 'fatal'];
  const config = await configInstance();
  switch (config['logLevel']) {
    case 'fatal':
      loggerOptions = ['fatal'];
      break;
    case 'error':
      loggerOptions = ['error', 'fatal'];
      break;
    case 'warn':
      loggerOptions = ['error', 'warn', 'fatal'];
      break;
    case 'info':
      loggerOptions = ['error', 'warn', 'fatal', 'log', 'verbose'];
      break;
    case 'debug':
      loggerOptions = ['error', 'warn', 'fatal', 'log', 'verbose', 'debug'];
      break;
  }
  return loggerOptions;
}
