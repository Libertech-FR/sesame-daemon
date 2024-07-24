import { executorTask } from '~/_common/tasks/executor.task';
import { BackendRunnerService } from '../backend-runner.service';
import { ExecutorExecuteResponseInterface, ExecutorInterface } from '../executors.interface';
import { join } from 'path';
import { Job } from 'bullmq';
import { BackendConfigV1Dto } from '../_dto/backend-config-v1.dto';
import { BackendResultInfoInterface, BackendResultInterface } from '../_interfaces/backend-result.interface';
import { ValidationError, validateOrReject } from 'class-validator';
import { BackendResultInfoErrorDto, BackendResultInfoSuccessDto } from '../_dto/backend-result-info.dto';
import { plainToInstance } from 'class-transformer';
import { BackendCodesEnumError } from '../_interfaces/backend-codes.enum';

interface ValidationRecursive {
  [key: string]: string;
}

export class CatchAllExecutor implements ExecutorInterface {
  public constructor(public service: BackendRunnerService) { }

  public async execute({ job }: { job: Job<any, any, string> }): Promise<ExecutorExecuteResponseInterface> {
    let status = 0;
    const data = [];

    const numberOfBackends = this.service.backendsConfig.backendsConfigData.length;

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
        await job.updateProgress(100);
        break;
      }

      await job.updateProgress(100 / numberOfBackends);
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
        const error = this.extractLastJsonImproved(process.error || process.output);
        const errorSchema = plainToInstance(BackendResultInfoErrorDto, error);
        await validateOrReject(errorSchema);

        return {
          backend: backend.name,
          status: process.status,
          error,
        };
      }

      this.service.logger.log(`Backend ${backend.name} executed successfully`);
      const output = this.extractLastJsonImproved(process.output);
      const outputSchema = plainToInstance(BackendResultInfoSuccessDto, output);
      await validateOrReject(outputSchema);

      return {
        backend: backend.name,
        status: process.status,
        output,
      };
    } catch (errors) {
      console.log('errors', errors)
      let validations: ValidationRecursive = {};
      for (const error of errors) {
        validations = { ...validations, ...this.validationRecursive(error) };
      }

      this.service.logger.error(`Invalid JSON response from backend ${backend.name}, erreur de validation : ${Object.keys(validations).join(', ')}`.trim());

      return {
        backend: backend.name,
        status: BackendCodesEnumError.INVALID_JSON_RESPONSE,
        message: `Erreur de validation : ${Object.keys(validations).join(', ')}`.trim(),
        error: {
          status: BackendCodesEnumError.INVALID_JSON_RESPONSE,
          message: `Erreur de validation : ${Object.keys(validations).join(', ')}`.trim(),
          data: validations,
        },
      };
    }
  }

  private extractLastJsonImproved(stdout: string): BackendResultInfoInterface {
    if (!stdout) return {
      status: BackendCodesEnumError.INVALID_JSON_RESPONSE,
      message: 'No output',
    }

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

    if (jsonCandidates.length === 0) return {
      status: BackendCodesEnumError.INVALID_JSON_RESPONSE,
      message: 'No JSON output',
    }

    return JSON.parse(jsonCandidates[jsonCandidates.length - 1]);
  }

  private validationRecursive(error: ValidationError, prefix = ''): ValidationRecursive {
    let validations = {};
    if (error.constraints) {
      validations[`${prefix + error.property}`] = Object.values(error.constraints)[0];
    }
    if (error.children.length > 0) {
      for (const errorChild of error.children) {
        if (errorChild.constraints) {
          validations[`${prefix + error.property}.${errorChild.property}`] = Object.values(errorChild.constraints)[0];
        }
        if (errorChild.children.length > 0) {
          validations = {
            ...validations,
            ...this.validationRecursive(errorChild, `${prefix + error.property}.${errorChild.property}.`),
          };
        }
      }
    }
    return validations;
  }
}
