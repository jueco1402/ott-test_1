import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { liveApiPlugin } from './server/vite-live-plugin.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    liveApiPlugin(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss()
  ],
})
