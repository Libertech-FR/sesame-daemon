import { pick } from 'radash';
import { BackendRunnerService } from '../backend-runner.service';
import { ExecutorExecuteResponseInterface, ExecutorInterface } from '../executors.interface';
import { PackageJson } from 'types-package-json';

export class DumpPackageConfigExecutor implements ExecutorInterface {
  public constructor(public service: BackendRunnerService) { }

  public async execute({ job }): Promise<ExecutorExecuteResponseInterface> {
    this.service.logger.debug('Dump package config: ' + JSON.stringify(pick(this.service.packageJson, [
      'name',
      'description',
      'version',
    ] as any) as Pick<PackageJson, 'name' | 'description' | 'version'>));

    return { status: 0, jobId: job.id, data: [this.service.packageJson] };
  }
}
