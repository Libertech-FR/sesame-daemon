import { RedisOptions } from 'ioredis';
import { ExecutorConfigInterface } from './_common/interfaces/executor-config.interface';
import { resolve } from 'path';

const logLevel = process.env['LOG_LEVEL'] || 'info';

export interface ConfigInstance {
  logLevel: string;
  ioredis: {
    uri: string;
    options: RedisOptions;
  };
  nameQueue: string;
  backendsPath: string;
  backendExecutorConfig: ExecutorConfigInterface;
}

export default (): ConfigInstance => {
  return {
    logLevel,
    ioredis: {
      uri: process.env['REDIS_URI'] || 'redis://localhost:6379/0',
      options: {
        showFriendlyErrorStack: true,
      },
    },
    nameQueue: process.env['NAME_QUEUE'] || 'backend',
    backendsPath: resolve(process.env['BACKENDS_PATH'] || __dirname + '/../backends'),
    backendExecutorConfig: {
      shell: process.env['BACKENDS_EXECUTOR_SHELL'] || true,
    },
  };
};
