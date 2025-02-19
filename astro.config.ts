import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import tailwind from '@astrojs/tailwind'
import icon from 'astro-icon'
import { defineConfig } from 'astro/config'
import glsl from 'vite-plugin-glsl'

// https://astro.build/config
export default defineConfig({
  site: 'https://playground.shiftbrain.com/',
  base: '/post/particle-clock',
  server: {
    open: '/post/particle-clock/',
  },
  prefetch: true,
  integrations: [
    mdx(),
    tailwind({
      nesting: true,
    }),
    icon(),
    react(),
  ],
  vite: {
    plugins: [glsl()],
    define: {
      'import.meta.vitest': 'undefined',
    },
  },
})
