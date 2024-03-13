import { Job } from 'bullmq';
import { BackendRunnerService } from './backend-runner.service';

export interface ExecutorExecuteOptionsInterface {
  job: Job<any, any, string>;
}

export interface ExecutorExecuteResponseInterface {
  jobId: string;
  status: number;
  data: object;
}

export interface ExecutorInterface {
  readonly service: BackendRunnerService;

  execute(context: ExecutorExecuteOptionsInterface): Promise<ExecutorExecuteResponseInterface>;
}
