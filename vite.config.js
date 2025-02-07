import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: "/",  // Ensure correct base URL
  build: {
    outDir: "dist",  // Ensure correct output folder
  },
})
