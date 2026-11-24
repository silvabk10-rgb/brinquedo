import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname, resolve, sep } from 'node:path';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const publicFiles = /^(?:index\.html|(?:assets|src|public)\/[^\\]+)$/;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const port = Number(process.env.PORT || 4173);

createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).slice(1) || 'index.html';
    const file = resolve(root, path);
    if (!publicFiles.test(path) || !file.startsWith(root + sep) || !types[extname(file)]) {
      response.writeHead(404).end('Página não encontrada');
      return;
    }

    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)], 'X-Content-Type-Options': 'nosniff' }).end(body);
  } catch {
    response.writeHead(404).end('Página não encontrada');
  }
}).listen(port, '127.0.0.1', () => console.log(`Modo Lenda disponível em http://127.0.0.1:${port}/`));
