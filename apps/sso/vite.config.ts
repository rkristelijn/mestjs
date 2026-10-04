import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// mestjs — INTENTIONALLY INSECURE SSO provider on a fixed port.
export default defineConfig({
  server: { port: 4000, host: "localhost" },
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
});
