import {build} from 'vite';
import {resolve} from 'node:path';
// Isolated worker dependency compile only: no production app/public copy/freeze.
await build({configFile:false,publicDir:false,build:{outDir:resolve('tools/overhaul-training-worker-145/worker-compile'),emptyOutDir:true,minify:false,rollupOptions:{input:resolve('src/game/training.worker.ts'),output:{format:'es',entryFileNames:'training-worker.js'}}}});
