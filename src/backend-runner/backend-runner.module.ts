import { Module } from '@nestjs/common';
import { BackendRunnerService } from './backend-runner.service';
import { BackendConfigService } from './backend-config.service';

@Module({
  imports: [],
  exports: [],
  providers: [BackendRunnerService, BackendConfigService],
})
export class BackendRunnerModule {}
