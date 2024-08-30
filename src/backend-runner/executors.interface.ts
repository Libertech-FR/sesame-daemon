import { Job } from 'bullmq';
import { BackendRunnerService } from './backend-runner.service';

export interface ExecutorExecuteOptionsInterface {
  job: Job<any, any, string>;
}

export interface ExecutorExecuteResponseInterface {
  jobName?: string;
  options?: {
    [key: string | number]: any;
  };
  jobId: string;
  status: number;
  data: Array<any>;
}

export interface ExecutorInterface {
  readonly service: BackendRunnerService;

  execute(context: ExecutorExecuteOptionsInterface): Promise<ExecutorExecuteResponseInterface>;
}
