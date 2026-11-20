import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  return {
    base: '/myproject/', // <-- GitHub Pages үшін осы жолды қосу міндетті
    plugins: [react()],  // <-- React плагинін қостық
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  }
})
