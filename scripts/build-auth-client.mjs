import { build } from "vite";

await build({
  configFile: false,
  publicDir: false,
  // Bibliotecas usam esta constante no cliente; o navegador não fornece `process`.
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: "public",
    emptyOutDir: false,
    lib: {
      entry: "auth/client.ts",
      formats: ["iife"],
      name: "MandalariaAuth",
      fileName: () => "auth-client.js",
    },
  },
});
