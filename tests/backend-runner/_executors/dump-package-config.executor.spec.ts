import { DumpPackageConfigExecutor } from '~/backend-runner/_executors/dump-package-config.executor';

describe('DumpPackageConfigExecutor', () => {
  it('returns package json payload with success status', async () => {
    const packageJson = {
      name: 'sesame-daemon',
      version: '1.2.3',
      description: 'daemon',
      private: true,
    };

    const debug = jest.fn();
    const executor = new DumpPackageConfigExecutor({
      packageJson,
      logger: { debug },
    } as any);

    const result = await executor.execute({
      job: { id: 'job-pkg' },
    } as any);

    expect(result).toEqual({
      status: 0,
      jobId: 'job-pkg',
      data: [packageJson],
    });
    expect(debug).toHaveBeenCalledTimes(1);
    expect(debug.mock.calls[0][0]).toContain('Dump package config:');
    expect(debug.mock.calls[0][0]).toContain('"name":"sesame-daemon"');
  });
});
