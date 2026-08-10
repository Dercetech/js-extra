import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],

  // Le serveur de signalisation autorise les origines locales sur le port 4200.
  // strictPort empêche Vite de choisir un autre port qui serait refusé.
  server: {
    port: 4200,
    strictPort: true,
  },
  preview: {
    port: 4200,
    strictPort: true,
  },
})
