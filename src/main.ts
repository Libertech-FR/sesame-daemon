import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import configInstance from './config';
import { getLogLevel } from './_common/functions/get-log-level';

declare const module: any;
(async (): Promise<void> => {
  const config = configInstance();
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: getLogLevel(config.logLevel),
  });
  await app.init();

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose((): Promise<void> => app.close());
  }
})();
