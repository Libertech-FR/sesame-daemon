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
    const child = spawn(join(command), [], {
      shell: options?.shell ?? true,
    });

    let output = '';
    let error = '';

    // Ecoute pour la sortie standard (stdout)
    child.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
      output += data;
    });

    // Ecoute pour la sortie d'erreur (stderr)
    child.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
      error += data;
    });

    // Envoyer les données de job au processus enfant
    child.stdin.write(JSON.stringify(job.data));
    child.stdin.end();

    child.on('close', (code) => {
      console.log(`Le processus enfant s'est terminé avec le code ${code}`);
      resolve({
        status: code,
        output: output,
        error: error,
      });
    });

    child.on('error', (spawnError) => {
      console.error('Erreur lors du lancement du processus enfant', spawnError);
      reject(spawnError);
    });
  });
  /**const out = spawnSync(join(command), [], {
    input: JSON.stringify(job.data),
    shell: options?.shell ?? true,
  });
  return Promise.resolve({
    status: out.status,
    output: out.stdout?.toString(),
    error: out.stderr?.toString(),
  });**/
}
