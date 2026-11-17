"use strict";

// Servidor ONLY para desenvolvimento local.
// Na Vercel, quem atende /api/* são os arquivos da pasta api/.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);

const ROTAS = {
  "/api/me": require("./api/me"),
  "/api/register": require("./api/register"),
  "/api/login": require("./api/login"),
  "/api/logout": require("./api/logout")
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function json(res, status, obj) {
  const corpo = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(corpo),
    "Cache-Control": "no-store"
  });
  res.end(corpo);
}

function servirArquivo(req, res, pathname) {
  let rel;
  try { rel = decodeURIComponent(pathname); } catch { return json(res, 400, { erro: "Caminho inválido." }); }
  if (rel === "/" || rel === "") rel = "/index.html";
  const arquivo = path.resolve(ROOT, "." + rel);
  if (!arquivo.startsWith(ROOT + path.sep)) return json(res, 403, { erro: "Acesso negado." });
  fs.stat(arquivo, (erro, stat) => {
    if (erro || !stat.isFile()) return json(res, 404, { erro: "Arquivo não encontrado." });
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(arquivo).toLowerCase()] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": "no-cache"
    });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(arquivo).pipe(res);
  });
}

const servidor = http.createServer((req, res) => {
  let rota;
  try { rota = new URL(req.url, "http://localhost").pathname; }
  catch { return json(res, 400, { erro: "URL inválida." }); }

  const handler = ROTAS[rota];
  if (handler) {
    Promise.resolve(handler(req, res)).catch(e => {
      console.error(e);
      if (!res.headersSent) json(res, 500, { erro: "Erro interno." });
    });
    return;
  }
  return servirArquivo(req, res, rota);
});

servidor.listen(PORT, () => {
  console.log(`Local: http://localhost:${PORT}`);
  console.log(process.env.DATABASE_URL
    ? "Banco: Neon (DATABASE_URL)"
    : "Banco: SQLite local em data/usuarios.sqlite");
});
