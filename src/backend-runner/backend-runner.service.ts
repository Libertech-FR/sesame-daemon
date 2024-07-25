import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable, Logger, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnrecoverableError, Worker } from 'bullmq';
import { CatchAllExecutor } from './_executors/catch-all.executor';
import { ListBackendsExecutor } from './_executors/list-backends.executor';
import { ExecutorExecuteResponseInterface, ExecutorInterface } from './executors.interface';
import { BackendConfigService } from './backend-config.service';
import { ActionType } from './_enum/action-type.enum';
import { ExecutorConfigInterface } from '~/_common/interfaces/executor-config.interface';
import Redis from 'ioredis';
import { DumpPackageConfigExecutor } from './_executors/dump-package-config.executor';
import { existsSync, readFileSync } from 'node:fs';
import { PackageJson } from 'types-package-json';

@Injectable()
export class BackendRunnerService implements OnApplicationBootstrap, OnModuleInit {
  protected _package: Partial<PackageJson | object>;
  private readonly _logger = new Logger(BackendRunnerService.name);

  protected executors: Map<string, ExecutorInterface> = new Map<string, ExecutorInterface>();

  public get backendsConfig(): BackendConfigService {
    return this._backendsConfig;
  }

  public get logger(): Logger {
    return this._logger;
  }

  public get packageJson(): Partial<PackageJson | object> {
    return this._package;
  }

  public get backendExecutorConfig(): ExecutorConfigInterface {
    return this._config.get<ExecutorConfigInterface>('application.backendExecutorConfig');
  }

  public constructor(
    private readonly _config: ConfigService,
    private readonly _backendsConfig: BackendConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    this._package = {};
    try {
      if (existsSync('/snapshot/data/package.json')) {
        this._package = JSON.parse(readFileSync('/snapshot/data/package.json', 'utf-8'));
      } else if (existsSync('/snapshot/sesame-daemon/package.json')) {
        this._package = JSON.parse(readFileSync('/snapshot/sesame-daemon/package.json', 'utf-8'));
      } else {
        this._package = JSON.parse(readFileSync('package.json', 'utf-8'));
      }
    } catch (e) {
      this._logger.error('Error reading package.json file: ', e);
      this._package = {};
    }
    // console.log('pkg', (process as any).pkg)
    // console.log('pkg', this._package)
  }

  public async onModuleInit() {
    this.executors.set('*', new CatchAllExecutor(this));
    this.executors.set(ActionType.LIST_BACKENDS, new ListBackendsExecutor(this));
    this.executors.set(ActionType.DUMP_PACKAGE_CONFIG, new DumpPackageConfigExecutor(this));

    this.redis.on('connecting', () => this.logger.verbose(`Redis connecting... 🟡`));
    this.redis.on('connect', () => this.logger.log(`Redis connected 🟢`));
    this.redis.on('ready', () => this.logger.debug(`Redis ready to listen jobs 🟣`));
    this.redis.on('close', () => this.logger.fatal(`Redis connection closed 🟥`));

    this.logger.log('OnModuleInit initialized 🔴');
  }

  public async onApplicationBootstrap() {
    const worker = new Worker(
      this._config.get<string>('application.nameQueue'),
      async (job): Promise<ExecutorExecuteResponseInterface> => {
        let jobName = job.name;
        if (!this.executors.has(job.name)) jobName = '*';
        this.logger.log(`Job ${job.name} received. Try to execute...`);

        const result = await this.executors.get(jobName).execute({ job });
        this.logger.verbose(`Job ${job.name} executed with status ${result.status}`);

        if (result.status !== 0) {
          const errMsg = []
          this.logger.error(`Job ${job.name} failed with status ${result.status}`);

          for (const data of result.data) {
            errMsg.push(data?.error?.message || 'No error message');
          }

          return result;
        }

        this.logger.log(`Job ${job.name} success with status ${result.status}`);
        return result;
      },
      {
        connection: this.redis,
        autorun: false,
      },
    );

    worker.on('active', () => this.logger.log(`Worker now active 🟢`));
    worker.on('resumed', () => this.logger.log(`Worker now resumed 🟢`));
    worker.on('error', (err) => this.logger.error(err));
    worker.on('closed', () => {
      this.logger.fatal(`Worker closed 🟥`);
      process.exit(1);
    });

    await worker.run();
    this.logger.log('OnApplicationBootstrap initialized 🔴');
  }
}
