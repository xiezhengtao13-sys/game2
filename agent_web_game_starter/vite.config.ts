import { defineConfig } from "vite";

export default defineConfig({
  build: {
    assetsInlineLimit: 120000
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    cors: true,
    watch: {
      /**
       * Ignore editor temp files.
       *
       * Some editors write an edit by creating a temporary directory next to the
       * target file and renaming it into place. Vite's watcher picks those up,
       * and on Windows it hits EBUSY on the locked temp file and takes the whole
       * dev server down with it. Ignoring the pattern costs nothing and stops
       * the server dying mid-edit.
       */
      ignored: ["**/.*.tmpdir/**", "**/*.tmpdir/**", "**/.*.tmp"]
    }
  }
});
