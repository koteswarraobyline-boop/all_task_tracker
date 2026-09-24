import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5004',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('xlsx')) return 'vendor-xlsx'
          if (id.includes('jspdf')) return 'vendor-jspdf'
          if (id.includes('html2canvas')) return 'vendor-jspdf'
          if (id.includes('@fullcalendar')) return 'vendor-fullcalendar'
          if (id.includes('@svar-ui/react-gantt')) return 'vendor-gantt'
          if (id.includes('recharts')) return 'vendor-recharts'
          if (id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('primereact') || id.includes('primeicons')) return 'vendor-prime'
          if (id.includes('@mui/icons-material')) return 'vendor-mui-icons'
          if (id.includes('@mui/material') || id.includes('@mui/system')) return 'vendor-mui'
          if (id.includes('@emotion')) return 'vendor-emotion'
          if (id.includes('react-dom') || id.includes('react-router')) return 'vendor-react'

          return undefined
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
})
