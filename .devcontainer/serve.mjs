import http from "node:http";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 8080);

const server = http.createServer((req, res) => {
  const urlPath = (req.url || "/").split("?")[0];
  const file = urlPath === "/game.html" ? "game.html" : "index.html";
  try {
    const html = readFileSync(resolve(rootDir, file), "utf8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
    res.end(html);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Failed to serve ${file}: ${String(err)}`);
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Echoes of Charon cloud preview listening on http://0.0.0.0:${port}`);
});
