import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { handleApiRequest } from "../dist/server.mjs";
const config = JSON.parse(readFileSync("lib/site-config.json", "utf8"));
const port = config.role === "admin" ? 5174 : 5173;
createServer(async (incoming, outgoing) => {
  try {
    const chunks = []; let size = 0;
    for await (const chunk of incoming) {
      size += chunk.length;
      if (size > 10000) { outgoing.writeHead(413); outgoing.end("Request too large"); return; }
      chunks.push(chunk);
    }
    const method = incoming.method || "GET", url = new URL(incoming.url, `http://127.0.0.1:${port}`);
    const request = new Request(url, { method, headers: incoming.headers, ...(!["GET", "HEAD"].includes(method) ? { body: Buffer.concat(chunks) } : {}) });
    let response;
    if (url.pathname.startsWith("/api/")) response = await handleApiRequest(request);
    else if (!["GET","HEAD"].includes(method)) response = new Response("Method not allowed",{status:405});
    else {
      const file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      if (!/^(index\.html|app\.js|chunk-[A-Z0-9]+\.js|styles\.css|logo\.png|favicon\.png|apple-touch-icon\.png)$/.test(file)) response = new Response("Page not found",{status:404});
      else {
        try {
          const type = file.endsWith(".html") ? "text/html; charset=utf-8" : file.endsWith(".js") ? "text/javascript; charset=utf-8" : file.endsWith(".css") ? "text/css; charset=utf-8" : "image/png";
          response = new Response(method === "HEAD" ? null : readFileSync("dist/public/" + file),{headers:{"Content-Type":type}});
        } catch { response = new Response("Page not found",{status:404}); }
      }
    }
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { console.error(error); outgoing.writeHead(500); outgoing.end("Local preview unavailable"); }
}).listen(port, "127.0.0.1", () => console.log(`Local only: http://127.0.0.1:${port}`));
