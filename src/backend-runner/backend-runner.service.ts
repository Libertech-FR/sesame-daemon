import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import { ActionType, BackendConfigDto } from './_dto/backend-config.dto';
import { Redis } from '@nestjs-modules/ioredis';
import executorTask from '../_common/tasks/executor.task';
import { BackendResultInterface } from './_interfaces/backend-result.interface';
import { ExecutorConfigInterface } from '~/_common/interfaces/executor-config.interface';
import { join } from 'path';

@Injectable()
export class BackendRunnerService implements OnModuleInit {
  private readonly backendsConfig: BackendConfigDto[] = [];
  private readonly logger = new Logger(BackendRunnerService.name);

  public constructor(private readonly config: ConfigService) {
    this.backendsConfig = this.config.get<BackendConfigDto[]>('backendsConfig');
  }

  public async onModuleInit() {
    this.logger.log('BackendRunnerService initialized');

    const worker = new Worker(
      this.config.get<string>('nameQueue'),
      async (job) => {
        let status = 0;
        const data = [];
        for await (const backend of this.backendsConfig) {
          switch (job.name) {
            case ActionType.LISTBACKEND: {
              return await this.listBackends(job);
            }

            default: {
              if (backend.active !== 1) {
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
  }

  public async listBackends(job: Job) {
    this.logger.log('execute LISTBACKEND');
    return {
      status: 0,
      jobId: job.id,
      data: this.backendsConfig,
    };
  }

  public async executeBackend(job: Job, backend: BackendConfigDto): Promise<BackendResultInterface> {
    const process = await executorTask(join(backend.path, 'bin', backend.actions[job.name].exec), job, {
      ...this.config.get<ExecutorConfigInterface>('backendExecutorConfig'),
    });
    return {
      backend: backend.name,
      ...process,
    };
  }
}
