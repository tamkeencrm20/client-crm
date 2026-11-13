/**
 * Vite resolves nothing at build time, so a component used without being
 * imported builds cleanly and throws only when that branch happens to render.
 * This walks every JSX file and reports shared components used but not in scope.
 *
 *   node scan-imports.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SHARED = [
  'Avatar', 'Badge', 'Button', 'Card', 'CardHeader', 'EmptyState', 'ErrorState',
  'Field', 'Input', 'LoadingBlock', 'Modal', 'Pagination', 'Select', 'Spinner',
  'Switch', 'Tabs', 'Textarea',
  'StatusBadge', 'PlatformBadge', 'FollowUpTag', 'ContactActions', 'LeadRow',
];

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** Names bound by every import statement in the file. */
function importedNames(src) {
  const names = new Set();
  const re = /import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    for (const part of m[1].replace(/[{}]/g, ',').split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop().trim();
      if (name && name !== '*') names.add(name);
    }
  }
  return names;
}

const files = walk('src').filter((f) => f.endsWith('.jsx'));
let problems = 0;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const imported = importedNames(src);

  for (const name of SHARED) {
    // Used as a JSX tag anywhere in the file.
    if (!new RegExp(`<${name}[\\s/>\\n]`).test(src)) continue;
    // Or declared right here, which several small helpers are.
    if (new RegExp(`(function|const)\\s+${name}\\b`).test(src)) continue;
    if (imported.has(name)) continue;

    console.log(`  MISSING  ${name}  in  ${file}`);
    problems += 1;
  }
}

console.log(problems === 0 ? '✓ every shared component used is in scope' : `${problems} missing import(s)`);
process.exit(problems === 0 ? 0 : 1);
