// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  // mestjs — fixed port for the products micro-frontend.
  devServer: { port: 4202 },
})
