import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],

  // La configuration Blackthorn autorise ces origines locales sur le port 4200.
  // strictPort évite qu’un autre port soit choisi lorsqu’elle est activée.
  server: {
    port: 4200,
    strictPort: true,
  },
  preview: {
    port: 4200,
    strictPort: true,
  },
})
