import { describe, expect, it } from 'vitest';
import { parseArgs } from './args.js';

describe('parseArgs', () => {
  it('returns help when no args', () => {
    expect(parseArgs([])).toHaveProperty('help', true);
  });

  it('parses a path with defaults', () => {
    const r = parseArgs(['./src']);
    expect(r).toMatchObject({ target: './src', format: 'human', failOn: 'high' });
  });

  it('rejects unknown options', () => {
    expect(parseArgs(['./src', '--bogus'])).toHaveProperty('error');
  });

  it('rejects multiple positional args', () => {
    expect(parseArgs(['./a', './b'])).toHaveProperty('error');
  });

  it('parses sarif format with output file', () => {
    const r = parseArgs(['./src', '--format', 'sarif', '--out', 'out.sarif']);
    expect(r).toMatchObject({ format: 'sarif', outFile: 'out.sarif' });
  });

  it('accepts markdown format', () => {
    const r = parseArgs(['./src', '--format', 'markdown']);
    expect(r).toMatchObject({ format: 'markdown' });
  });

  it('rejects invalid format', () => {
    expect(parseArgs(['./src', '--format', 'xml'])).toHaveProperty('error');
  });

  it('accumulates ignore values', () => {
    const r = parseArgs(['./src', '--ignore', 'a', '--ignore', 'b']);
    expect((r as { ignore: string[] }).ignore).toEqual(['a', 'b']);
  });

  it('accepts --diff with a range', () => {
    const r = parseArgs(['./src', '--diff', 'main...HEAD']);
    expect(r).toMatchObject({ target: './src', diff: 'main...HEAD' });
  });

  it('--diff without a path defaults target to "."', () => {
    const r = parseArgs(['--diff', 'origin/main...HEAD']);
    expect(r).toMatchObject({ target: '.', diff: 'origin/main...HEAD' });
  });

  it('--diff requires a value', () => {
    expect(parseArgs(['./src', '--diff'])).toHaveProperty('error');
  });
});
