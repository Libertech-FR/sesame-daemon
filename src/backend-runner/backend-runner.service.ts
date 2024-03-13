import { Injectable, Logger, OnModuleInit, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import { ActionType, BackendConfigDto } from './_dto/backend-config.dto';
import { Redis } from '@nestjs-modules/ioredis';
import executorTask from '../_common/tasks/executor.task';
import { BackendResultInterface } from './_interfaces/backend-result.interface';
import { ExecutorConfigInterface } from '~/_common/interfaces/executor-config.interface';
import { join } from 'path';
import { ExecutorInterface } from './executors.interface';
import { ListBackendsExecutor } from './_executors/list-backends.executor';

@Injectable()
export class BackendRunnerService implements OnApplicationBootstrap, OnModuleInit {
  private readonly _backendsConfig: BackendConfigDto[] = [];
  private readonly _logger = new Logger(BackendRunnerService.name);

  protected executors: Map<string, ExecutorInterface> = new Map<string, ExecutorInterface>();

  public constructor(private readonly config: ConfigService) {
    this._backendsConfig = this.config.get<BackendConfigDto[]>('backendsConfig');
  }

  public get backendsConfig() {
    return this._backendsConfig;
  }

  public get logger() {
    return this._logger;
  }

  public async onModuleInit() {
    this.executors.set(ActionType.LIST_BACKENDS, new ListBackendsExecutor(this));
    this.logger.log('OnModuleInit initialized 🔴');
  }

  public async onApplicationBootstrap() {
    const worker = new Worker(
      this.config.get<string>('nameQueue'),
      async (job) => {
        let status = 0;
        const data = [];
        for await (const backend of this._backendsConfig) {
          switch (job.name) {
            case ActionType.LIST_BACKENDS: {
              return await this.listBackends(job);
            }

            default: {
              if (!backend.active) {
                this.logger.warn(`backend ${backend.name} is not active`);
                continue;
              }
              this.logger.log(`Execute backend command ${job.name} ${backend.name}`);
              const result = await this.executeBackend(job, backend);
              status += result.status;
              data.push(result);
              if (backend.actions[job.name].onError === 'stop' && result.status !== 0) {
                this.logger.log('stop on Error');
                break;
              }
            }
          }
        }
        return {
          jobId: job.id,
          status,
          data,
        };
      },
      {
        connection: this.config.get<Redis>('ioredis'),
        autorun: false,
      },
    );
    await worker.run();
    this.logger.log('OnApplicationBootstrap initialized 🔴');
  }

  public async listBackends(job: Job) {
    this.logger.log('execute LISTBACKEND');
    return {
      status: 0,
      jobId: job.id,
      data: this._backendsConfig,
    };
  }

  public async executeBackend(job: Job, backend: BackendConfigDto): Promise<BackendResultInterface> {
    const process = await executorTask(join(backend.path, 'bin', backend.actions[job.name].exec), job, {
      ...this.config.get<ExecutorConfigInterface>('backendExecutorConfig'),
    });
    try {
      if (process.status !== 0) {
        return {
          backend: backend.name,
          status: process.status,
          error: JSON.parse(process.output),
        };
      }
      return {
        backend: backend.name,
        status: process.status,
        output: JSON.parse(process.output),
      };
    } catch (e) {
      return {
        backend: backend.name,
        status: process.status,
        error: {
          status: process.status,
          message: process.error,
        },
      };
    }
  }
}
