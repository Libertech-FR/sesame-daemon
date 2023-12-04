import { Injectable, Logger } from '@nestjs/common';
// import { Worker } from 'bullmq';
// import { fdir } from 'fdir';
// import * as fs from 'fs';
// import * as YAML from 'yaml';
// import * as process from 'child_process';
// import * as mainProcess from 'process';
// import * as path from 'path';
// import { BackendConfigDto } from './backend-runner/_dto/Backend-config.dto';
// import { BackendResultDto } from './backend-runner/_dto/Backend-result.dto';
// import { plainToInstance } from 'class-transformer';
import { ConfigService } from '@nestjs/config';
// import { spawnSync, exec } from 'child_process';
// import executorTask from './_common/tasks/executor.task';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  // backendsConfig: Array<BackendConfigDto> = [];

  constructor(private readonly configService: ConfigService) {}

  // async runDaemon() {
  //   await this.loadConfig();
  //   const backendResults = [];
  //
  //   const worker = new Worker(
  //     this.configService.get('nameQueue'),
  //     async (job) => {
  //       const results = [];
  //       let gStatus = 0;
  //       this.logger.log('start daemon');
  //       for await (const backend of this.backendsConfig) {
  //         if (job.name === 'LISTBACKEND') {
  //           this.logger.log('execute LISTBACKEND');
  //           return { jobId: job.id, status: 0, data: this.backendsConfig };
  //         }
  //         if (backend.active === 1) {
  //           this.logger.log('Execute backend command ' + job.name + ' ' + backend.name);
  //           const task = backend.actions[job.name];
  //           this.logger.debug(backend.path + '/bin/' + task.exec);
  //
  //           // const out2 = await executorTask(backend.path +'/bin/'+ task.exec, job)
  //           // console.log('out2', out2)
  //           const out = process.spawnSync(backend.path + '/bin/' + task.exec, [], {
  //             shell: 'powershell.exe',
  //             input: JSON.stringify(job.data),
  //           });
  //
  //           gStatus += out.status;
  //           const result = new BackendResultDto();
  //           result.backend = backend.name;
  //           result.status = out.status;
  //           result.output = out.stdout?.toString();
  //           // console.log('result', result, out, out.error)
  //           result.error = out.stderr?.toString();
  //           results.push(result);
  //           if (task.onError === 'stop' && out.status != 0) {
  //             this.logger.log('stop on Error ');
  //             break;
  //           }
  //         }
  //       }
  //       this.logger.debug('results : ');
  //       this.logger.debug(results);
  //       return { jobId: job.id, status: gStatus, data: results };
  //     },
  //     { connection: this.configService.get('redis') },
  //   );
  // }
  //
  // async loadConfig() {
  //   this.logger.log('load backends config');
  //   const crawler = new fdir().withBasePath().filter((path, isDirectory) => path.endsWith('.yml'));
  //   const files = crawler.crawl(this.configService.get('backendsPath')).sync().sort();
  //   for await (const element of files) {
  //     this.logger.log('Load ' + element);
  //     const file = fs.readFileSync(element, 'utf8');
  //     const config = YAML.parse(file);
  //     try {
  //       const verif = plainToInstance(BackendConfigDto, config);
  //     } catch (e) {
  //       //const erreurs=errors.map((e) => e.toString()).join(', ')
  //       //this.logger.fatal(`Erreur fichier de configuration : ${element} : ${erreurs}` )
  //       mainProcess.exit(1);
  //     }
  //     config.path = path.dirname(element);
  //     this.backendsConfig.push(config);
  //     this.logger.log('Loaded ' + config.name);
  //   }
  //   this.logger.debug(this.backendsConfig);
  // }
}
