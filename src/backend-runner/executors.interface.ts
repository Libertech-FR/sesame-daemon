import { BackendRunnerService } from './backend-runner.service';

export interface ExecutorExecuteOptionsInterface {}

export interface ExecutorExecuteResponseInterface {
    jobId: string;
    status: number;
}

export interface ExecutorInterface {
  readonly service: BackendRunnerService;

  execute(context: ExecutorExecuteOptionsInterface): Promise<ExecutorExecuteResponseInterface>;
}
