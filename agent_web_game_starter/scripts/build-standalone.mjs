import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const distDir = join(root, "dist");
const assetsDir = join(distDir, "assets");
const indexPath = join(distDir, "index.html");
const outPath = join(distDir, "yuanwang_game.html");

if (!existsSync(indexPath)) {
  throw new Error(`Missing ${indexPath}. Run "npm run build" first.`);
}

// Verify all image assets (sprites + portraits) were inlined by Vite.
if (existsSync(assetsDir)) {
  const strayImages = readdirSync(assetsDir).filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f));
  if (strayImages.length > 0) {
    throw new Error(
      `Expected all sprites & portraits to be base64-inlined into bundle, but found uninlined images: ${strayImages.join(", ")}`
    );
  }
}

let html = readFileSync(indexPath, "utf8");

// Inline linked CSS stylesheets
html = html.replace(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi, (_m, href) => {
  const rel = href.replace(/^\//, "");
  const file = join(distDir, rel);
  const css = readFileSync(file, "utf8").replace(/<\/style>/gi, "<\\/style>");
  return `<style>\n${css}\n</style>`;
});

// Inline module JS scripts
html = html.replace(/<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["'][^>]*><\/script>/gi, (_m, src) => {
  const rel = src.replace(/^\//, "");
  const file = join(distDir, rel);
  const js = readFileSync(file, "utf8").replace(/<\/script>/gi, "<\\/script>");
  return `<script type="module">\n${js}\n</script>`;
});

writeFileSync(outPath, html, "utf8");
console.log(`Built self-contained standalone bundle: ${outPath} (${(html.length / 1024).toFixed(1)} KB)`);
