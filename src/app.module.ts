import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import config from './config';
import { BackendRunnerModule } from './backend-runner/backend-runner.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RedisOptions } from 'ioredis';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        config: {
          ...config.get<RedisOptions>('ioredis.options'),
          url: config.get<string>('ioredis.uri'),
        },
      }),
    }),
    BackendRunnerModule,
  ],
  providers: [AppService],
})
export class AppModule {}
