import { EventEmitter } from 'events';
import { executorTask } from '~/_common/tasks/executor.task';
import { spawn } from 'node:child_process';
import { Logger } from '@nestjs/common';

jest.mock('node:child_process', () => ({
  spawn: jest.fn(),
}));

class MockWritable {
  public chunks: string[] = [];
  public ended = false;

  public write = jest.fn((chunk: string) => {
    this.chunks.push(chunk);
    return true;
  });

  public end = jest.fn(() => {
    this.ended = true;
  });
}

class MockReadable extends EventEmitter {}

function createMockChildProcess() {
  const child = new EventEmitter() as EventEmitter & {
    stdin: MockWritable;
    stdout: MockReadable;
    stderr: MockReadable;
  };

  child.stdin = new MockWritable();
  child.stdout = new MockReadable();
  child.stderr = new MockReadable();

  return child;
}

describe('executorTask stdin/stdout structure', () => {
  const spawnMock = spawn as jest.Mock;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    loggerDebugSpy = jest.spyOn(Logger, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    loggerDebugSpy.mockRestore();
  });

  it('writes JSON on stdin and converts null values to empty strings', async () => {
    const child = createMockChildProcess();
    spawnMock.mockReturnValue(child);

    const job = {
      data: {
        user: null,
        profile: {
          mail: null,
          age: 42,
        },
        groups: [null, 'dev'],
      },
    } as any;

    const promise = executorTask('/tmp/backend/bin/script.sh', job, { shell: true });

    child.emit('close', 0);
    await promise;

    expect(child.stdin.write).toHaveBeenCalledWith(
      JSON.stringify({
        user: '',
        profile: {
          mail: '',
          age: 42,
        },
        groups: ['', 'dev'],
      }),
    );
    expect(child.stdin.end).toHaveBeenCalled();
  });

  it('aggregates stdout and stderr then resolves with expected structure', async () => {
    const child = createMockChildProcess();
    spawnMock.mockReturnValue(child);

    const job = { data: { action: 'list-backends' } } as any;
    const promise = executorTask('/tmp/backend/bin/script.sh', job, { shell: true });

    child.stdout.emit('data', Buffer.from('{"status":0,'));
    child.stdout.emit('data', Buffer.from('"message":"ok"}'));
    child.stderr.emit('data', Buffer.from('warning'));
    child.emit('close', 1);

    await expect(promise).resolves.toEqual({
      status: 1,
      output: '{"status":0,"message":"ok"}',
      error: 'warning',
    });
  });

  it('keeps incomplete JSON from stdout as-is', async () => {
    const child = createMockChildProcess();
    spawnMock.mockReturnValue(child);

    const job = { data: { action: 'list-backends' } } as any;
    const promise = executorTask('/tmp/backend/bin/script.sh', job, { shell: true });

    child.stdout.emit('data', Buffer.from('{"status":0,"message":"partial"'));
    child.emit('close', 0);

    await expect(promise).resolves.toEqual({
      status: 0,
      output: '{"status":0,"message":"partial"',
      error: '',
    });
  });

  it('preserves escaped characters in stdin payload', async () => {
    const child = createMockChildProcess();
    spawnMock.mockReturnValue(child);

    const job = {
      data: {
        raw: 'line1\\nline2',
        quote: 'He said "hello"',
        slash: 'C:\\\\temp\\\\script.sh',
      },
    } as any;

    const promise = executorTask('/tmp/backend/bin/script.sh', job, { shell: true });

    child.emit('close', 0);
    await promise;

    expect(child.stdin.write).toHaveBeenCalledTimes(1);
    const payload = child.stdin.write.mock.calls[0][0];
    expect(JSON.parse(payload)).toEqual(job.data);
  });

  it('writes large stdin payload without truncation', async () => {
    const child = createMockChildProcess();
    spawnMock.mockReturnValue(child);

    const items = Array.from({ length: 5000 }, (_, idx) => ({
      id: idx,
      value: `v-${idx}`,
    }));
    const job = { data: { items } } as any;

    const promise = executorTask('/tmp/backend/bin/script.sh', job, { shell: true });

    child.emit('close', 0);
    await promise;

    expect(child.stdin.write).toHaveBeenCalledTimes(1);
    const payload = child.stdin.write.mock.calls[0][0] as string;
    expect(payload.length).toBeGreaterThan(100000);
    expect(JSON.parse(payload).items).toHaveLength(5000);
  });

  it('resolves when close code is null', async () => {
    const child = createMockChildProcess();
    spawnMock.mockReturnValue(child);

    const job = { data: { action: 'list-backends' } } as any;
    const promise = executorTask('/tmp/backend/bin/script.sh', job, { shell: true });

    child.emit('close', null);

    await expect(promise).resolves.toEqual({
      status: null,
      output: '',
      error: '',
    });
  });
});
