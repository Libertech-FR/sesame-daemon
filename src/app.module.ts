import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import config from './config'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [config]
    }),
  ],
  providers: [AppService],
})
export class AppModule {}
