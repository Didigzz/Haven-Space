#!/usr/bin/env bun

/**
 * Build script for production deployment
 * Automatically scans all files under client/ and copies them to dist/
 * with a flat structure suitable for Cloudflare Pages root deployment.
 * Now supports TypeScript transpilation using Bun.
 */

import {
  copyFileSync,
  mkdirSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from 'fs';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'client');
const DIST = join(ROOT, 'dist');

// Base path for Cloudflare Pages deployment. Keep '/' for the production project.
// Can be set via environment variable: BASE_PATH=/preview/ bun run build
const BASE_PATH = process.env.BASE_PATH || '/';

// --- Helpers ---

/**
 * Recursively scan a directory and return all files matching the given extensions.
 * Returns array of paths relative to the base directory.
 */
function scanDirectory(baseDir, extensions) {
  const results = [];

  function walk(dir) {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = '.' + entry.name.split('.').pop().toLowerCase();
        if (extensions.includes(ext)) {
          results.push(relative(baseDir, fullPath));
        }
      }
    }
  }

  walk(baseDir);
  // Normalize all paths to forward slashes for consistent processing
  return results.map(p => p.replace(/\\/g, '/')).sort();
}

/**
 * Copy a file from src relative path to dest relative path.
 */
function copyFile(srcRelative, destRelative, srcBase, distBase) {
  const srcPath = join(srcBase, srcRelative);
  const destPath = join(distBase, destRelative);

  if (!existsSync(srcPath)) {
    console.warn(`⚠ Warning: ${srcPath} not found, skipping...`);
    return;
  }

  mkdirSync(dirname(destPath), { recursive: true });
  copyFileSync(srcPath, destPath);
}

/**
 * Fix relative paths in HTML content for deployment.
 * `depth` = how many levels up from the file to the root (for ../ prefix).
 */
function fixPaths(htmlContent, depth) {
  // Normalize BASE_PATH to ensure it starts and ends with /
  let basePath = BASE_PATH;
  if (!basePath.startsWith('/')) basePath = '/' + basePath;
  if (!basePath.endsWith('/')) basePath = basePath + '/';
  if (basePath === '//') basePath = '/';

  // For root deployment, use relative paths
  // For subdirectory deployment, use absolute paths with base
  const prefix = basePath === '/' ? '../'.repeat(depth) : basePath;

  // Fix CSS paths - match any number of ../ followed by css/
  let fixed = htmlContent.replace(/(href=["'])(?:\.\.\/)+css\//g, `$1${prefix}css/`);

  // Fix JS paths - match any number of ../ followed by js/
  // Also swap .ts extensions for .js as browsers don't support .ts
  fixed = fixed.replace(/(src=["'])(?:\.\.\/)+js\/(.*?)\.ts/g, `$1${prefix}js/$2.js`);
  fixed = fixed.replace(/(src=["'])(?:\.\.\/)+js\/(.*?)\.js/g, `$1${prefix}js/$2.js`);

  // Fix inline script imports
  // Also swap .ts extensions for .js
  fixed = fixed.replace(
    /(import\s+[^"']*from\s+["'])(?:\.\.\/)+js\/(.*?)\.ts/g,
    `$1${prefix}js/$2.js`
  );
  fixed = fixed.replace(
    /(import\s+[^"']*from\s+["'])(?:\.\.\/)+js\/(.*?)\.js/g,
    `$1${prefix}js/$2.js`
  );

  // Fix image src paths - match any number of ../ followed by assets/
  fixed = fixed.replace(/(src=["'])(?:\.\.\/)+assets\//g, `$1${prefix}assets/`);

  // Fix asset href paths (favicon, etc)
  fixed = fixed.replace(/(href=["'])(?:\.\.\/)+assets\//g, `$1${prefix}assets/`);

  // Fix auth page links
  fixed = fixed.replace(/(href=["'])(?:\.\.\/)*auth\//g, `$1${prefix}auth/`);

  // Fix maps.html link
  fixed = fixed.replace(/(href=["'])maps\.html(["'])/g, `$1${prefix}maps.html$2`);

  // Fix role dashboard links (boarder/, landlord/, admin/)
  fixed = fixed.replace(/(href=["'])(?:\.\.\/)*boarder\//g, `$1${prefix}boarder/`);
  fixed = fixed.replace(/(href=["'])(?:\.\.\/)*landlord\//g, `$1${prefix}landlord/`);
  fixed = fixed.replace(/(href=["'])(?:\.\.\/)*admin\//g, `$1${prefix}admin/`);

  // Fix index.html root links
  fixed = fixed.replace(/(href=["'])(?:\.\.\/)+index\.html/g, `$1${prefix}index.html`);

  return fixed;
}

/**
 * Calculate the depth (number of ../ needed) from a file's position to the dist root.
 */
function depthToRoot(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const parts = normalizedPath.split('/');
  return parts.length - 1;
}

// --- Main Build ---

async function build() {
  console.log('Building for production with TypeScript transpilation...\n');

  // Clean dist folder
  if (existsSync(DIST)) {
    try {
      rmSync(DIST, { recursive: true, force: true });
    } catch (error) {
      console.warn(
        `⚠ Warning: Could not delete ${DIST}, will attempt to overwrite: ${error.message}`
      );
    }
  }
  mkdirSync(DIST, { recursive: true });

  // ===== 1. Scan all files =====

  const htmlFiles = scanDirectory(join(SRC, 'views'), ['.html']);
  const cssFiles = scanDirectory(join(SRC, 'css'), ['.css']);
  const tsFiles = scanDirectory(join(SRC, 'js'), ['.ts']);
  const imageFiles = scanDirectory(join(SRC, 'assets'), [
    '.png',
    '.jpg',
    '.jpeg',
    '.svg',
    '.webp',
    '.gif',
    '.ico',
    '.webm',
  ]);
  const componentFiles = scanDirectory(join(SRC, 'components'), ['.html']);

  console.log(`Found ${htmlFiles.length} HTML files`);
  console.log(`Found ${cssFiles.length} CSS files`);
  console.log(`Found ${tsFiles.length} TS files`);
  console.log(`Found ${imageFiles.length} image files`);
  console.log(`Found ${componentFiles.length} component HTML files`);
  console.log('');

  // ===== 2. Process HTML files with path fixing =====

  const roleFolders = ['admin', 'boarder', 'landlord', 'public'];

  htmlFiles.forEach(file => {
    const parts = file.split('/');
    const fileName = parts[parts.length - 1];
    const lastFolder = parts.length > 1 ? parts[parts.length - 2] : '';

    const srcPath = join(SRC, 'views', file);
    if (!existsSync(srcPath)) {
      console.warn(`⚠ Warning: ${srcPath} not found, skipping...`);
      return;
    }

    let destPath;
    let depth = 0;

    const role = parts[0];
    const isRoleFolder = roleFolders.includes(role);

    if (!isRoleFolder) {
      console.warn(`⚠ Warning: Unknown role folder "${role}" in ${file}, skipping...`);
      return;
    }

    if (role === 'public') {
      if (lastFolder === 'auth') {
        destPath = join(DIST, 'auth', fileName);
        depth = 1;
      } else {
        destPath = join(DIST, fileName);
        depth = 0;
      }
    } else {
      const subPath = parts.slice(1, -1).join('/');
      destPath = join(DIST, role, subPath, fileName);
      depth = depthToRoot(join(role, subPath, fileName));
    }

    let content = readFileSync(srcPath, 'utf8');
    content = fixPaths(content, depth);

    mkdirSync(dirname(destPath), { recursive: true });
    writeFileSync(destPath, content);

    const displayDest = relative(DIST, destPath);
    console.log(`✓ ${file} → ${displayDest}`);
  });

  console.log('');

  // ===== 3. Copy CSS files → dist/css/ =====

  cssFiles.forEach(file => {
    copyFile(file, `css/${file}`, join(SRC, 'css'), DIST);
    console.log(`✓ css/${file}`);
  });

  console.log('');

  // ===== 4. Transpile TS files → dist/js/ =====

  console.log('Transpiling TypeScript files...');
  const result = await Bun.build({
    entrypoints: tsFiles.map(file => join(SRC, 'js', file)),
    outdir: join(DIST, 'js'),
    naming: '[dir]/[name].js',
    root: join(SRC, 'js'),
    target: 'browser',
    format: 'esm',
  });

  if (!result.success) {
    console.error('Build failed');
    for (const message of result.logs) {
      console.error(message);
    }
    process.exit(1);
  }

  tsFiles.forEach(file => {
    const jsFile = file.replace(/\.ts$/, '.js');
    console.log(`✓ js/${jsFile} (transpiled)`);
  });

  console.log('');

  // ===== 5. Copy image files → dist/assets/ =====

  imageFiles.forEach(file => {
    copyFile(file, `assets/${file}`, join(SRC, 'assets'), DIST);
    console.log(`✓ assets/${file}`);
  });

  console.log('');

  // ===== 6. Copy component HTML files → dist/components/ =====

  componentFiles.forEach(file => {
    copyFile(file, `components/${file}`, join(SRC, 'components'), DIST);
    console.log(`✓ components/${file}`);
  });

  writeFileSync(
    join(DIST, '_headers'),
    `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
`
  );
  console.log('Cloudflare Pages _headers');

  console.log('\n✅ Build complete! Production files are in ./dist');
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
