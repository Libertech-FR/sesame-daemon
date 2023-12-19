import { fdir } from 'fdir';
import fs from 'fs';
import * as YAML from 'yaml';
import { plainToInstance } from 'class-transformer';
import { BackendConfigDto } from '~/backend-runner/_dto/backend-config.dto';
import process from 'process';
import path from 'path';
import { Logger } from '@nestjs/common';
import { validateOrReject } from 'class-validator';

const backendsConfig: BackendConfigDto[] = [];

export default async function configInitializer(backendsPath: string): Promise<BackendConfigDto[]> {
  /**
   * If backendsConfig is not empty, it cached in memory, return it
   */
  if (backendsConfig.length) return backendsConfig;

  const logger = new Logger(configInitializer.name);
  logger.log('load backends config');

  const crawler = new fdir().withBasePath().filter((path: string) => path.endsWith('.yml'));
  const files = crawler.crawl(backendsPath).sync().sort();

  for await (const file of files) {
    logger.log('Load ' + file);
    const data = fs.readFileSync(file, 'utf8');
    const config = YAML.parse(data);

    try {
      config.path = path.dirname(file);
      const schema = plainToInstance(BackendConfigDto, config);
      await validateOrReject(schema, {
        whitelist: true,
      });
      backendsConfig.push(config);
      logger.log('Loaded ' + config.name);
    } catch (errors) {
      const err = new Error(`Invalid backend config file ${file}`);
      err.message = errors.map((e: { toString: () => any }) => e.toString()).join(', ');
      logger.error(err);
      process.exit(1);
    }
  }

  logger.verbose(backendsConfig);
  return backendsConfig;
}
