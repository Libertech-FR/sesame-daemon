import { BackendRunnerService } from '../backend-runner.service';
import { ExecutorExecuteResponseInterface, ExecutorInterface } from '../executors.interface';

export class DumpPackageConfigExecutor implements ExecutorInterface {
  public constructor(public service: BackendRunnerService) { }

  public async execute({ job }): Promise<ExecutorExecuteResponseInterface> {
    return {
      status: 0,
      jobId: job.id,
      data: [this.service.packageJson],
    };
  }
}
