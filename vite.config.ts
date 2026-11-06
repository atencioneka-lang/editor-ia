import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages sirve repositorios desde /nombre-repositorio/.
// En localhost o Tauri la ruta base sigue siendo /.
const repoName = (process.env.GITHUB_REPOSITORY || 'usuario/editor-ia').split('/').pop();
const isPagesBuild = process.env.EDITOR_IA_DEPLOY === 'github-pages';
export default defineConfig({
  plugins: [react()],
  base: isPagesBuild ? `/${repoName}/` : '/',
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: { target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13' },
});
