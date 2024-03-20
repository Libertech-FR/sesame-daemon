import { executorTask } from '~/_common/tasks/executor.task';
import { BackendRunnerService } from '../backend-runner.service';
import { ExecutorExecuteResponseInterface, ExecutorInterface } from '../executors.interface';
import { join } from 'path';
import { Job } from 'bullmq';
import { BackendConfigV1Dto } from '../_dto/backend-config-v1.dto';
import { BackendResultInfoInterface, BackendResultInterface } from '../_interfaces/backend-result.interface';
import { BackendCodesEnum } from '../_interfaces/backend-codes.enum';
import { validateOrReject } from 'class-validator';
import { BackendResultInfoDto } from '../_dto/backend-result-info.dto';
import { plainToInstance } from 'class-transformer';

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
        const error = this.extractLastJsonImproved(process.error);
        const errorSchema = plainToInstance(BackendResultInfoDto, error);
        await validateOrReject(errorSchema);

        return {
          backend: backend.name,
          status: process.status,
          error,
        };
      }

      this.service.logger.log(`Backend ${backend.name} executed successfully`);
      const output = this.extractLastJsonImproved(process.output);
      const outputSchema = plainToInstance(BackendResultInfoDto, output);
      await validateOrReject(outputSchema);

      return {
        backend: backend.name,
        status: process.status,
        output,
      };
    } catch (e) {
      this.service.logger.error(`Error parsing JSON output from backend ${backend.name}`);

      return {
        backend: backend.name,
        status: BackendCodesEnum.INVALID_JSON_RESPONSE,
        message: `Invalid JSON response from backend: ${process.error || process.output}`,
      };
    }
  }

  private extractLastJsonImproved(stdout: string): BackendResultInfoInterface {
    const jsonCandidates = [];
    let braceCount = 0,
      inString = false,
      escape = false,
      currentJson = '';

    for (const char of stdout) {
      if (escape) {
        escape = false;
      } else if (char === '\\') {
        escape = true;
      } else if (char === '"') {
        inString = !inString;
      } else if (!inString && char === '{') {
        braceCount++;
        if (braceCount === 1) {
          currentJson = char;
          continue;
        }
      } else if (!inString && char === '}') {
        braceCount--;
      }

      if (braceCount > 0) currentJson += char;
      if (braceCount === 0 && currentJson !== '') {
        currentJson += char;
        jsonCandidates.push(currentJson);
        currentJson = '';
      }
    }

    return JSON.parse(jsonCandidates[jsonCandidates.length - 1]);
  }
}
