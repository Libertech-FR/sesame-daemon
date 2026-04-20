import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from '~/app.service';

describe('AppService', () => {
  let module: TestingModule;
  let appService: AppService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    appService = module.get<AppService>(AppService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(appService).toBeDefined();
  });

  it('should expose service name from abstract service', () => {
    expect(appService.serviceName).toBe('App');
  });
});
