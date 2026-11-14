import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';

if (!existsSync('assets/react/index.html')) {
  console.error('assets/react/index.html is missing: run npm run build first.');
  process.exit(1);
}

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
cpSync('assets/react', 'dist/assets/react', { recursive: true });
cpSync('assets/react/index.html', 'dist/index.html');
cpSync('assets/png', 'dist/assets/png', { recursive: true });
cpSync('cloudflare/_headers', 'dist/_headers');
