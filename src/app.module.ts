import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import config from './config';
import { BackendRunnerModule } from './backend-runner/backend-runner.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    BackendRunnerModule,
  ],
  providers: [AppService],
})
export class AppModule {}
