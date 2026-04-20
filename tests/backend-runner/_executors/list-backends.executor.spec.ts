import { ListBackendsExecutor } from '~/backend-runner/_executors/list-backends.executor';

describe('ListBackendsExecutor', () => {
  it('returns job id, success status and backends list', async () => {
    const backends = [
      { name: 'a', active: true },
      { name: 'b', active: false },
    ];

    const executor = new ListBackendsExecutor({
      backendsConfig: {
        backendsConfigData: backends,
      },
    } as any);

    const result = await executor.execute({
      job: { id: 'job-1' },
    } as any);

    expect(result).toEqual({
      status: 0,
      jobId: 'job-1',
      data: backends,
    });
  });
});
