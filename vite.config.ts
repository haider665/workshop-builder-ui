import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendUrl = process.env.VITE_DEV_API_PROXY_TARGET ?? 'https://cw.dotech.biz'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        secure: true,
      },
    },
  },
  optimizeDeps: {
    include: ['tslib', 'echarts', 'echarts-for-react'],
  },
})
