import { RedisOptions } from 'ioredis';
import { ExecutorConfigInterface } from './_common/interfaces/executor-config.interface';
import { resolve } from 'path';

export interface ConfigInstance {
  application: {
    logLevel: string;
    nameQueue: string;
    backendsPath: string;
    backendExecutorConfig: ExecutorConfigInterface;
  };
  ioredis: {
    uri: string;
    options: RedisOptions;
  };
}

export default (): ConfigInstance => {
  return {
    application: {
      logLevel: process.env['SESAME_LOG_LEVEL'] || 'info',
      nameQueue: process.env['SESAME_NAME_QUEUE'] || 'sesame',
      backendsPath: resolve(process.env['SESAME_BACKENDS_PATH'] || __dirname + '/../backends'),
      backendExecutorConfig: {
        shell: process.env['SESAME_BACKENDS_EXECUTOR_SHELL'] || true,
      },
    },
    ioredis: {
      uri: process.env['SESAME_REDIS_URI'] || 'redis://localhost:6379/0',
      options: {
        showFriendlyErrorStack: true,
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        retryStrategy: (times) => Math.min(times * 1_000, 10_000),
      },
    },
  };
};
