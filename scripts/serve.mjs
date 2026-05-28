import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

function resolveRequest(url) {
  const pathname = decodeURIComponent(new URL(url, `http://localhost:${port}`).pathname);
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const requested = join(root, safePath === "/" ? "index.html" : safePath);
  return existsSync(requested) ? requested : join(root, "index.html");
}

createServer((request, response) => {
  const filePath = resolveRequest(request.url || "/");
  const type = contentTypes[extname(filePath)] || "application/octet-stream";

  response.writeHead(200, {
    "Content-Type": type,
    "X-Content-Type-Options": "nosniff"
  });

  createReadStream(filePath).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`blueprint-2-real running at http://127.0.0.1:${port}`);
});
