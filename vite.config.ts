import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'url';

// FIX: `__dirname` is not available in ES modules. This defines it for the current module's scope.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/Sxentrie-RAG/',
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
