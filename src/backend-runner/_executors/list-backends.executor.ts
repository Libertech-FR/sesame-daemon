import { BackendRunnerService } from '../backend-runner.service';
import { ExecutorInterface } from '../executors.interface';

export class ListBackendsExecutor implements ExecutorInterface {
  public constructor(public service: BackendRunnerService) {}

  public async execute({}): Promise<void> {
    this.service.logger.log('execute LISTBACKEND');
    return {
      status: 0,
      jobId: job.id,
      data: this.service.backendsConfig,
    };
  }
}
