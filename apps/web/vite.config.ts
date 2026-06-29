import path from "path";
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../../packages/ui/src"),
    },
  },
  server: {
    proxy: {
      '/v4': 'http://localhost:1337',
    },
  },
})
