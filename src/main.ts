import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppService } from './app.service';
import { LogLevel } from '@nestjs/common'
import ConfigInstance from './config'

declare const module: any
;(async (): Promise<void> => {
  const app = await NestFactory.createApplicationContext(AppModule,{logger: setLogLevel() as LogLevel[]});
  const appService = app.get(AppService);
  appService.runDaemon()
  if (module.hot) {
    module.hot.accept()
    module.hot.dispose((): Promise<void> => app.close())
  }
})()
function setLogLevel():Array<string>{
  let loggerOptions=['error', 'warn','fatal']
  let configInstance=ConfigInstance()
  switch(configInstance['logLevel']){
    case 'fatal' :
      loggerOptions=['fatal']
      break;
    case 'error' :
      loggerOptions=['error','fatal']
      break;
    case 'warn':
      loggerOptions=['error', 'warn','fatal']
      break;
    case 'info' :
      loggerOptions=['error', 'warn','fatal','log','verbose']
      break;
    case 'debug' :
      loggerOptions=['error', 'warn','fatal','log','verbose','debug']
      break;
  }
  return loggerOptions
}
