import { spawnSync } from 'node:child_process';
import { Job } from 'bullmq';
import { ExecutorResponseInterface } from '../interfaces/executor-response.interface';
import { ExecutorConfigInterface } from '../interfaces/executor-config.interface';
import { join } from 'path';

export default function executorTask(
  command: string,
  job: Job,
  options?: ExecutorConfigInterface,
): Promise<ExecutorResponseInterface> {
  const out = spawnSync(join(command), [], {
    input: JSON.stringify(job.data),
    shell: options?.shell ?? true,
  });
  return Promise.resolve({
    status: out.status,
    output: out.stdout?.toString(),
    error: out.stderr?.toString(),
  });
}
