import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BackendConfigV1Dto } from './_dto/backend-config-v1.dto';
import { ConfigService } from '@nestjs/config';
import { fdir } from 'fdir';
import * as YAML from 'yaml';
import fs from 'fs';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import path from 'path';

@Injectable()
export class BackendConfigService implements OnModuleInit {
  private _backendsConfigData: BackendConfigV1Dto[] = [];
  private readonly logger = new Logger(BackendConfigService.name);

  public get backendsConfigData(): BackendConfigV1Dto[] {
    return this._backendsConfigData;
  }

  public constructor(private readonly config: ConfigService) {}

  public async onModuleInit() {
    await this.initialize();
  }

  public async initialize(): Promise<void> {
    const backendsConfigData = [];
    this.logger.log('Load backends config...');

    const crawler = new fdir().withBasePath().filter((path: string) => path.endsWith('.yml'));
    const files = crawler.crawl(this.config.get<string>('application.backendsPath')).sync().sort();

    for await (const file of files) {
      this.logger.log(`Loading ${file}...`);
      const data = fs.readFileSync(file, 'utf8');
      const config = YAML.parse(data);

      try {
        if (!config.path) config.path = path.dirname(file);
        const schema = plainToInstance(BackendConfigV1Dto, config);
        await validateOrReject(schema, {
          whitelist: true,
        });
        backendsConfigData.push(config);
        this.logger.log('New config file loaded ' + config.name);
      } catch (errors) {
        const err = new Error(`Invalid backend config file ${file}`);
        err.message = errors.map((e: { toString: () => any }) => e.toString()).join(', ');
        this.logger.error(err);
        process.exit(1);
      }
    }

    this.logger.verbose(backendsConfigData);
    this._backendsConfigData = backendsConfigData;
  }
}
