import { LogLevel } from '@nestjs/common';
import { getLogLevel } from '~/_common/functions/get-log-level';

describe('getLogLevel', () => {
  it('par defaut retourne les niveaux de info', () => {
    expect(getLogLevel()).toEqual(['error', 'fatal', 'warn', 'log'] as LogLevel[]);
  });

  it('mappe "error"', () => {
    expect(getLogLevel('error')).toEqual(['error', 'fatal'] as LogLevel[]);
  });

  it('mappe "warn"', () => {
    expect(getLogLevel('warn')).toEqual(['error', 'fatal', 'warn'] as LogLevel[]);
  });

  it('mappe "debug"', () => {
    expect(getLogLevel('debug')).toEqual(['error', 'fatal', 'warn', 'log', 'debug'] as LogLevel[]);
  });

  it('mappe "verbose"', () => {
    expect(getLogLevel('verbose')).toEqual(['error', 'fatal', 'warn', 'log', 'debug', 'verbose'] as LogLevel[]);
  });

  it('unknown => info par defaut', () => {
    expect(getLogLevel('unknown')).toEqual(getLogLevel('info'));
  });
});

