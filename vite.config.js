import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Expose to all network interfaces
    port: 5173, // Default port
    https: false // Set to true if you need HTTPS
  },
  build: {
    chunkSizeWarningLimit: 1000, // Increased from default 500kb to 1000kb (1MB)
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries (React, Firebase, etc.) into separate chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'vendor-ui': ['lucide-react', 'tailwindcss'],
          // Add more manual chunks as needed
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})