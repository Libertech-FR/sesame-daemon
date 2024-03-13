import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface AbstractServiceContext {
  [key: string | number]: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  moduleRef?: ModuleRef;
  eventEmitter?: EventEmitter2;
}

@Injectable()
export abstract class AbstractService {
  protected logger: Logger;
  protected moduleRef: ModuleRef;
  protected eventEmitter?: EventEmitter2;

  protected constructor(context?: AbstractServiceContext) {
    this.moduleRef = context?.moduleRef;
    this.logger = new Logger(this.serviceName);
  }

  public get serviceName(): string {
    return this.constructor.name.replace(/Service$/, '');
  }
}
