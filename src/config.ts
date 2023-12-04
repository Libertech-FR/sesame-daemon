import { RedisOptions } from 'ioredis';
import { BackendConfigDto } from './backend-runner/_dto/Backend-config.dto';
import configInitializer from './_common/backend-initializer/config.initializer';
import { ExecutorConfigInterface } from './_common/interfaces/executor-config.interface';
import { resolve } from 'path';

export interface ConfigInstance {
  ioredis: {
    uri: string;
    options: RedisOptions;
  };
  logLevel: string;
  backendsPath: string;
  nameQueue: string;
  backendsConfig: BackendConfigDto[];
  backendExecutorConfig: ExecutorConfigInterface;
}

export default async (): Promise<ConfigInstance> => {
  const backendsPath = resolve(process.env['BACKENDS_PATH'] || __dirname + '/../backends');
  const backendsConfig = await configInitializer(backendsPath);
  return {
    ioredis: {
      uri: process.env['REDIS_URI'] || 'redis://localhost:6379/0',
      options: {
        showFriendlyErrorStack: true,
      },
    },
    logLevel: process.env['LOG_LEVEL'] || 'info',
    nameQueue: process.env['NAME_QUEUE'] || 'backend',
    backendsConfig,
    backendsPath,
    backendExecutorConfig: {
      shell: process.env['BACKENDS_EXECUTOR_SHELL'] || true,
    },
  };
};
