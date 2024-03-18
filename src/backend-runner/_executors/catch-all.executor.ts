import { executorTask } from '~/_common/tasks/executor.task';
import { BackendRunnerService } from '../backend-runner.service';
import { ExecutorExecuteResponseInterface, ExecutorInterface } from '../executors.interface';
import { join } from 'path';
import { Job } from 'bullmq';
import { BackendConfigV1Dto } from '../_dto/backend-config-v1.dto';
import { BackendResultInterface } from '../_interfaces/backend-result.interface';
import { BackendCodesEnum } from '../_interfaces/backend-codes.enum';

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
    const process = await executorTask(join(backend.path, 'bin', backend.actions[job.name].script), job, {
      ...this.service.backendExecutorConfig,
    });

    try {
      if (process.status !== 0) {
        this.service.logger.error(`Error executing backend ${backend.name}`);
        return {
          backend: backend.name,
          status: process.status,
          error: JSON.parse(process.output),
        };
      }

      this.service.logger.log(`Backend ${backend.name} executed successfully`);
      return {
        backend: backend.name,
        status: process.status,
        output: JSON.parse(process.output),
      };
    } catch (e) {
      this.service.logger.error(`Error parsing JSON output from backend ${backend.name}`);
      return {
        backend: backend.name,
        status: BackendCodesEnum.INVALID_JSON_RESPONSE,
        error: {
          status: BackendCodesEnum.INVALID_JSON_RESPONSE,
          message: process.error,
        },
      };
    }
  }
}
