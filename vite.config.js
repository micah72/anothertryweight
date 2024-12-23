import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Expose to all network interfaces
    port: 5173, // Default port
    https: false // Set to true if you need HTTPS
  }
})