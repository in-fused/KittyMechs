import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],server:{watch:{ignored:['**/.sites-runtime/**','**/assets/source/**','**/tools/overhaul-architecture/dist/**']},port:5173,strictPort:true,proxy:{'/arena':{target:'ws://127.0.0.1:8787',ws:true},'/health':'http://127.0.0.1:8787'}},build:{chunkSizeWarningLimit:1600,rollupOptions:{output:{manualChunks:{three:['three','@react-three/fiber','@react-three/drei'],physics:['@react-three/rapier','@dimforge/rapier3d-compat']}}}}});
