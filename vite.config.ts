import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base works on GitHub Pages under a repo subpath
export default defineConfig({
  base: './',
  plugins: [react()],
})
