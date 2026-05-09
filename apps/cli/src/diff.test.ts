// vibeguard:disable-file
// Test fixtures contain intentional vulnerable code to exercise diff scanning.
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { parseUnifiedDiff, scanDiff } from './diff.js';

const tempDirs: string[] = [];

afterAll(async () => {
  // Best-effort cleanup; ignore errors.
  await Promise.all(
    tempDirs.map((d) =>
      import('node:fs/promises').then((fs) => fs.rm(d, { recursive: true, force: true })),
    ),
  );
});

async function makeFiles(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'vibeguard-diff-'));
  tempDirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel);
    const idx = full.lastIndexOf('/');
    if (idx > 0) await mkdir(full.slice(0, idx), { recursive: true });
    await writeFile(full, content, 'utf8');
  }
  return dir;
}

describe('parseUnifiedDiff', () => {
  it('returns empty for empty input', () => {
    expect(parseUnifiedDiff('').size).toBe(0);
  });

  it('extracts added lines from a single hunk (--unified=0)', () => {
    const diff = [
      'diff --git a/foo.js b/foo.js',
      'index abc..def 100644',
      '--- a/foo.js',
      '+++ b/foo.js',
      '@@ -10,0 +11,2 @@',
      '+const a = 1;',
      '+const b = 2;',
    ].join('\n');
    const m = parseUnifiedDiff(diff);
    const added = m.get('foo.js');
    expect(added).toBeDefined();
    expect([...(added ?? [])].sort((a, b) => a - b)).toEqual([11, 12]);
  });

  it('handles unified=N context correctly (line counter advances on space lines)', () => {
    // Hunk says new file lines 5..9 are 5 lines: 1 context, 2 added, 1 context, 1 added would be wrong;
    // simpler: 2 context + 2 added.
    const diff = [
      '--- a/x.js',
      '+++ b/x.js',
      '@@ -5,2 +5,4 @@',
      ' const a = 1;',
      ' const b = 2;',
      '+const c = 3;',
      '+const d = 4;',
    ].join('\n');
    const m = parseUnifiedDiff(diff);
    expect([...(m.get('x.js') ?? [])].sort((a, b) => a - b)).toEqual([7, 8]);
  });

  it('treats deletions as not advancing the new-file counter', () => {
    const diff = [
      '--- a/x.js',
      '+++ b/x.js',
      '@@ -5,3 +5,1 @@',
      '-const a = 1;',
      '-const b = 2;',
      '+const c = 3;',
    ].join('\n');
    const m = parseUnifiedDiff(diff);
    expect([...(m.get('x.js') ?? [])]).toEqual([5]);
  });

  it('handles a deleted file (skips +++ /dev/null)', () => {
    const diff = [
      '--- a/old.js',
      '+++ /dev/null',
      '@@ -1,2 +0,0 @@',
      '-foo',
      '-bar',
    ].join('\n');
    expect(parseUnifiedDiff(diff).size).toBe(0);
  });

  it('parses multiple files and hunks', () => {
    const diff = [
      '--- a/a.js',
      '+++ b/a.js',
      '@@ -1,0 +2,1 @@',
      '+eval(x);',
      '@@ -10,0 +11,1 @@',
      '+more;',
      '--- a/b.js',
      '+++ b/b.js',
      '@@ -3,0 +4,1 @@',
      '+const k = "secret";',
    ].join('\n');
    const m = parseUnifiedDiff(diff);
    expect([...(m.get('a.js') ?? [])].sort((a, b) => a - b)).toEqual([2, 11]);
    expect([...(m.get('b.js') ?? [])]).toEqual([4]);
  });

  it('defaults hunk count to 1 when omitted', () => {
    const diff = ['--- a/x.js', '+++ b/x.js', '@@ -0,0 +5 @@', '+eval(input);'].join('\n');
    const m = parseUnifiedDiff(diff);
    expect([...(m.get('x.js') ?? [])]).toEqual([5]);
  });
});

describe('scanDiff', () => {
  it('reports findings only on added lines', async () => {
    // File contains two evals — only one is "in the diff".
    const cwd = await makeFiles({
      'app.js': ['const a = eval(x);', 'const b = 2;', 'const c = eval(y);'].join('\n'),
    });
    const diffText = [
      '--- a/app.js',
      '+++ b/app.js',
      '@@ -1,0 +1,1 @@',
      '+const a = eval(x);',
    ].join('\n');
    const result = await scanDiff({ cwd, range: 'unused', diffText, mode: 'fast' });
    const evals = result.findings.filter((f) => f.ruleId === 'VG-INJ-004');
    expect(evals).toHaveLength(1);
    expect(evals[0]?.startLine).toBe(1);
  });

  it('returns no findings when added lines are clean', async () => {
    const cwd = await makeFiles({ 'safe.js': 'const x = 1 + 1;\n' });
    const diffText = [
      '--- a/safe.js',
      '+++ b/safe.js',
      '@@ -0,0 +1,1 @@',
      '+const x = 1 + 1;',
    ].join('\n');
    const result = await scanDiff({ cwd, range: 'unused', diffText, mode: 'standard' });
    expect(result.findings).toEqual([]);
    expect(result.summary.total).toBe(0);
  });

  it('skips files that are missing from the working tree', async () => {
    const cwd = await makeFiles({}); // empty dir
    const diffText = [
      '--- a/gone.js',
      '+++ b/gone.js',
      '@@ -0,0 +1,1 @@',
      '+eval(x);',
    ].join('\n');
    const result = await scanDiff({ cwd, range: 'unused', diffText, mode: 'fast' });
    expect(result.findings).toEqual([]);
  });
});
