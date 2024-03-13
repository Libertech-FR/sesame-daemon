import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { Injectable, Logger, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';
import { ActionType, BackendConfigV1Dto } from './_dto/backend-config-v1.dto';
import { CatchAllExecutor } from './_executors/catch-all.executor';
import { ListBackendsExecutor } from './_executors/list-backends.executor';
import { ExecutorInterface } from './executors.interface';
import { BackendConfigService } from './backend-config.service';

@Injectable()
export class BackendRunnerService implements OnApplicationBootstrap, OnModuleInit {
  private readonly _logger = new Logger(BackendRunnerService.name);

  protected executors: Map<string, ExecutorInterface> = new Map<string, ExecutorInterface>();

  public get backendsConfig(): BackendConfigService {
    return this._backendsConfig;
  }

  public get logger(): Logger {
    return this._logger;
  }

  public get config(): ConfigService {
    return this.config;
  }

  public constructor(
    private readonly _config: ConfigService,
    private readonly _backendsConfig: BackendConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  public async onModuleInit() {
    this.executors.set('*', new CatchAllExecutor(this));
    this.executors.set(ActionType.LIST_BACKENDS, new ListBackendsExecutor(this));

    this.logger.log('OnModuleInit initialized 🔴');
  }

  public async onApplicationBootstrap() {
    const worker = new Worker(
      this._config.get<string>('nameQueue'),
      async (job) => {
        let jobName = job.name;
        if (!this.executors.has(job.name)) jobName = '*';
        this.logger.log(`Job ${job.name} received. Try to execute...`);

        return this.executors.get(jobName).execute({ job });
      },
      {
        connection: this.redis,
        autorun: false,
      },
    );
    await worker.run();
    this.logger.log('OnApplicationBootstrap initialized 🔴');
  }
}
