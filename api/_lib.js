"use strict";

const crypto = require("node:crypto");

const COOKIE = "eq_session";
const DIA_MS = 24 * 60 * 60 * 1000;
let _sql = null;

function db() {
  if (!_sql) {
    if (process.env.DATABASE_URL) {
      // Vercel: Neon Postgres (driver HTTP, funciona em serverless)
      const { neon } = require("@neondatabase/serverless");
      _sql = neon(process.env.DATABASE_URL);
    } else {
      // Local: SQLite nativo do Node, com a mesma interface de template tag
      const fs = require("node:fs");
      const path = require("node:path");
      const { DatabaseSync } = require("node:sqlite");
      const arquivo = path.join(__dirname, "..", "data", "usuarios.sqlite");
      fs.mkdirSync(path.dirname(arquivo), { recursive: true });
      const local = new DatabaseSync(arquivo);
      local.exec(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE COLLATE NOCASE,
          senha_hash TEXT NOT NULL,
          criado_em TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS sessoes (
          token_hash TEXT PRIMARY KEY,
          usuario_id INTEGER NOT NULL,
          expira_em INTEGER NOT NULL
        );
      `);
      _sql = (strings, ...valores) => local.prepare(strings.join("?")).all(...valores);
    }
  }
  return _sql;
}

// ---------- senha: hash scrypt com salt (nunca texto puro) ----------
function hashSenha(senha) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(senha, salt, 64);
  return salt.toString("hex") + ":" + hash.toString("hex");
}

function senhaConfere(senha, armazenado) {
  const partes = String(armazenado).split(":");
  if (partes.length !== 2) return false;
  const salt = Buffer.from(partes[0], "hex");
  const esperado = Buffer.from(partes[1], "hex");
  const atual = crypto.scryptSync(senha, salt, esperado.length);
  return atual.length === esperado.length && crypto.timingSafeEqual(atual, esperado);
}

// ---------- sessões ----------
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function lerCookie(req, nome) {
  for (const parte of (req.headers.cookie || "").split(";")) {
    const i = parte.indexOf("=");
    if (i < 0) continue;
    if (parte.slice(0, i).trim() === nome) return parte.slice(i + 1).trim();
  }
  return null;
}

function seguro() {
  return process.env.VERCEL || process.env.NODE_ENV === "production" ? "; Secure" : "";
}

function definirCookie(res, token, maxAge) {
  const partes = [
    `${COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax" + seguro()
  ];
  if (maxAge) partes.push(`Max-Age=${maxAge}`);
  res.setHeader("Set-Cookie", partes.join("; "));
}

async function criarSessao(usuarioId, lembrar) {
  const token = crypto.randomBytes(32).toString("hex");
  const maxAge = lembrar ? 30 * 86400 : null; // 30 dias ou cookie de sessão
  const expiraEm = Date.now() + (maxAge ? maxAge * 1000 : DIA_MS);
  await db()`INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (${hashToken(token)}, ${usuarioId}, ${expiraEm})`;
  return { token, maxAge };
}

async function usuarioDaRequisicao(req) {
  const token = lerCookie(req, COOKIE);
  if (!token) return null;
  const linhas = await db()`
    SELECT u.id, u.email, s.expira_em
    FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
    WHERE s.token_hash = ${hashToken(token)}
  `;
  const linha = linhas[0];
  if (!linha || Number(linha.expira_em) < Date.now()) return null;
  return { id: linha.id, email: linha.email };
}

// ---------- helpers ----------
function json(res, status, obj) {
  const corpo = JSON.stringify(obj);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.statusCode = status;
  res.end(corpo);
}

function lerJson(req) {
  return new Promise((resolve, reject) => {
    let corpo = "";
    req.on("data", pedaco => {
      corpo += pedaco;
      if (corpo.length > 10000) reject(new Error("Corpo muito grande"));
    });
    req.on("end", () => {
      try { resolve(JSON.parse(corpo || "{}")); }
      catch { reject(new Error("JSON inválido")); }
    });
    req.on("error", reject);
  });
}

function emailValido(email) {
  return typeof email === "string" && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function erroServidor(res, e) {
  console.error(e);
  json(res, 500, { erro: "Não foi possível concluir agora. Tente novamente em instantes." });
}

module.exports = {
  db, hashSenha, senhaConfere, hashToken, lerCookie, definirCookie,
  criarSessao, usuarioDaRequisicao, json, lerJson, emailValido,
  erroServidor, COOKIE
};
