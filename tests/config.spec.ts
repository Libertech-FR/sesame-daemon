import config from '~/config';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env['SESAME_LOG_LEVEL'];
    delete process.env['SESAME_NAME_QUEUE'];
    delete process.env['SESAME_REDIS_URI'];
    delete process.env['SESAME_BACKENDS_PATH'];
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns default values when env is missing', () => {
    const cfg = config();

    expect(cfg.application.logLevel).toBe('info');
    expect(cfg.application.nameQueue).toBe('sesame');
    expect(cfg.ioredis.uri).toBe('redis://localhost:6379/0');
    expect(cfg.application.backendsPath).toContain('backends');
  });

  it('uses env overrides when provided', () => {
    process.env['SESAME_LOG_LEVEL'] = 'debug';
    process.env['SESAME_NAME_QUEUE'] = 'custom-queue';
    process.env['SESAME_REDIS_URI'] = 'redis://127.0.0.1:6379/4';
    process.env['SESAME_BACKENDS_PATH'] = '/tmp/backends';

    const cfg = config();

    expect(cfg.application.logLevel).toBe('debug');
    expect(cfg.application.nameQueue).toBe('custom-queue');
    expect(cfg.ioredis.uri).toBe('redis://127.0.0.1:6379/4');
    expect(cfg.application.backendsPath).toBe('/tmp/backends');
  });
});
