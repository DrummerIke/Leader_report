import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages hosts this project under /Leader_report/, not at the domain root.
  base: '/Leader_report/',
  // The project can be deployed alongside existing Next.js applications,
  // where Supabase credentials commonly use the NEXT_PUBLIC_ prefix.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
})
