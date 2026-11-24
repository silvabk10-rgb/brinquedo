import { cp, mkdir, rm } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const destination = new URL('dist/', root);
await rm(destination, { recursive: true, force: true });
await mkdir(destination);
for (const path of ['index.html', 'assets', 'src', 'public']) {
  await cp(new URL(path, root), new URL(path, destination), { recursive: true });
}
