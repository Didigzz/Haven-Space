import { describe, expect, it } from 'bun:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const repoRoot = join(import.meta.dir, '..', '..', '..');
const skippedDirs = new Set(['.git', 'dist', 'node_modules', '.wrangler']);
const scannedRoots = [
  'apps/web/src',
  'workers/api/src',
  'workers/api/test',
  'workers/api/README.md',
  'workers/api/.dev.vars.example',
  'AGENTS.md',
  'Readme.md',
  'README.md',
];
const scannedExtensions = new Set(['.ts', '.html', '.md', '.json', '.example']);

function extensionFor(path: string): string {
  if (path.endsWith('.dev.vars.example')) {
    return '.example';
  }

  const dot = path.lastIndexOf('.');
  return dot === -1 ? '' : path.slice(dot);
}

function walk(path: string): string[] {
  if (!existsSync(path)) {
    return [];
  }

  const entries = readdirSync(path, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const child = join(path, entry.name);

    if (entry.isDirectory()) {
      if (!skippedDirs.has(entry.name)) {
        files.push(...walk(child));
      }
      continue;
    }

    if (entry.isFile() && scannedExtensions.has(extensionFor(child))) {
      files.push(child);
    }
  }

  return files;
}

function scannedFiles(): string[] {
  return scannedRoots.flatMap(root => {
    const path = join(repoRoot, root);
    return existsSync(path) && !root.includes('.') ? walk(path) : existsSync(path) ? [path] : [];
  });
}

describe('source references', () => {
  it('does not use legacy PHP endpoint extensions in source or tests', () => {
    const legacyExtension = `.${'ph'}p`;
    const offenders = scannedFiles().filter(file =>
      readFileSync(file, 'utf8').includes(legacyExtension)
    );

    expect(offenders.map(file => relative(repoRoot, file).replace(/\\/g, '/'))).toEqual([]);
  });

  it('uses .ts for local client source references', () => {
    const legacyExtension = `.${'js'}`;
    const escapedLegacyExtension = legacyExtension.replace('.', '\\.');
    const localJsPath = new RegExp(
      '(?:\\.\\.?/)+js/[^"\'`\\s<>]+' +
        escapedLegacyExtension +
        '\\b|client/js/[^"\'`\\s<>]+' +
        escapedLegacyExtension +
        '\\b'
    );
    const localJsImport = new RegExp(
      '(?:from\\s+|import\\(\\s*)["\']\\.{1,2}/[^"\']+' + escapedLegacyExtension + '["\']'
    );
    const offenders = scannedFiles().filter(file => {
      const relativePath = relative(repoRoot, file).replace(/\\/g, '/');
      const content = readFileSync(file, 'utf8');

      if (relativePath.startsWith('client/js/') && relativePath.endsWith('.ts')) {
        return localJsImport.test(content);
      }

      return localJsPath.test(content);
    });

    expect(offenders.map(file => relative(repoRoot, file).replace(/\\/g, '/'))).toEqual([]);
  });
});
