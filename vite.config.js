import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  test: {
    // Stub Supabase env zodat modules die de client importeren laadbaar zijn
    // in de testomgeving (vitest laadt VITE_*-vars niet automatisch).
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_KEY: 'test-anon-key',
    },
  },
})
