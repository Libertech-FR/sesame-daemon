import executorTask from '~/_common/tasks/executor.task';
import { BackendRunnerService } from '../backend-runner.service';
import { ExecutorExecuteResponseInterface, ExecutorInterface } from '../executors.interface';
import { join } from 'path';
import { Job } from 'bullmq';
import { BackendConfigV1Dto } from '../_dto/backend-config-v1.dto';
import { BackendResultInterface } from '../_interfaces/backend-result.interface';
import { ExecutorConfigInterface } from '~/_common/interfaces/executor-config.interface';

export class CatchAllExecutor implements ExecutorInterface {
  public constructor(public service: BackendRunnerService) {}

  public async execute({ job }): Promise<ExecutorExecuteResponseInterface> {
    let status = 0;
    const data = [];

    for await (const backend of this.service.backendsConfig.backendsConfigData) {
      if (!backend.active) {
        this.service.logger.warn(`backend ${backend.name} is not active`);
        continue;
      }

      this.service.logger.log(`Execute backend command ${job.name} ${backend.name}`);
      const result = await this.executeBackend(job, backend);
      status += result.status;
      data.push(result);

      if (backend.actions[job.name].onError === 'stop' && result.status !== 0) {
        this.service.logger.log('stop on Error');
        break;
      }
    }

    return {
      jobId: job.id,
      status,
      data,
    };
  }

  public async executeBackend(job: Job, backend: BackendConfigV1Dto): Promise<BackendResultInterface> {
    const process = await executorTask(join(backend.path, 'bin', backend.actions[job.name].exec), job, {
      ...this.service.config.get<ExecutorConfigInterface>('backendExecutorConfig'),
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
