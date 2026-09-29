// Build-time emitter: writes every file emitAll() returns, relative to the repo root. `npm run emit` (and prebuild)
// runs it with tsx; the output is committed and `npm run check:emit` fails on any diff.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { emitAll } from './emitCore';

const root = path.resolve(__dirname, '..');
const { files } = emitAll();
for (const [rel, content] of Object.entries(files)) {
  const file = path.join(root, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}
console.log(`emit: wrote ${Object.keys(files).length} files`);
