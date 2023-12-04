import { Module } from '@nestjs/common';
import { BackendRunnerService } from './backend-runner.service';

@Module({
  imports: [],
  providers: [BackendRunnerService],
  exports: [BackendRunnerService],
})
export class BackendRunnerModule {}
