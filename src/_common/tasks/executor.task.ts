import { spawn } from 'node:child_process';
import { Job } from 'bullmq';
import { ExecutorResponseInterface } from '../interfaces/executor-response.interface';
import { ExecutorConfigInterface } from '../interfaces/executor-config.interface';
import { join } from 'path';

export async function executorTask(
  command: string,
  job: Job,
  options?: ExecutorConfigInterface,
): Promise<ExecutorResponseInterface> {
  return new Promise((resolve, reject) => {
    const jobDataArg = JSON.stringify(job.data);
    // const escapedJobDataArg = `'${jobDataArg.replace(/'/g, "'\\''")}'`;

    try {
      const child = spawn(join(command), {
        shell: options?.shell ?? true,
        stdio: 'pipe',
      });

      child.stdin.write(jobDataArg);
      child.stdin.end();

      let outputChunk = '';
      let errorChunk = '';

      child.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
        outputChunk += data;
      });

      child.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
        errorChunk += data;
      });

      child.on('close', (code) => {
        console.log(`Le processus enfant s'est terminé avec le code ${code}`);
        resolve({
          status: code,
          output: outputChunk?.toString(),
          error: errorChunk?.toString(),
        });
      });

      child.on('error', (spawnError) => {
        console.error('Erreur lors du lancement du processus enfant', spawnError);
        reject(spawnError);
      });
    } catch (error) {
      console.error('Erreur lors de l\'exécution de la tâche', error);
      reject(error);
    }
  });
}
