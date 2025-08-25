import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true, // Uygulama başladığında tarayıcıyı otomatik açar
    proxy: {
      '/api': 'http://localhost:5001'
    }
  }
})
