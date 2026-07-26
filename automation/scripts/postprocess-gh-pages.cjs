const fs = require('node:fs/promises');
const path = require('node:path');

const PROJECT_BASE = '/MyApp';
const ROOT = path.resolve(process.cwd(), 'dist');
const TEXT_EXTENSIONS = new Set(['.html', '.css', '.js', '.json', '.txt', '.xml', '.webmanifest']);

async function walk(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!TEXT_EXTENSIONS.has(ext)) {
      continue;
    }

    const original = await fs.readFile(fullPath, 'utf8');
    const rewritten = original.replace(/(["'])\/(?!\/|MyApp\/|https?:|data:|#)/g, `$1${PROJECT_BASE}/`);
    if (rewritten !== original) {
      await fs.writeFile(fullPath, rewritten, 'utf8');
    }
  }
}

async function main() {
  await walk(ROOT);
  console.log(`Post-processed GitHub Pages output under ${ROOT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
