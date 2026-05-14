import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(
  projectRoot,
  'node_modules',
  'pdfjs-dist',
  'build',
  'pdf.worker.min.mjs'
);
const target = join(projectRoot, 'public', 'pdf.worker.min.mjs');

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log('Copied PDF.js worker to public/pdf.worker.min.mjs');
