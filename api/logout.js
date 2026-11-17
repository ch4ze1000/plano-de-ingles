"use strict";

const { db, lerCookie, hashToken, json, definirCookie, COOKIE, erroServidor } = require("./_lib");

module.exports = async function (req, res) {
  if (req.method !== "POST") return json(res, 405, { erro: "Método não permitido." });
  try {
    const token = lerCookie(req, COOKIE);
    if (token) await db()`DELETE FROM sessoes WHERE token_hash = ${hashToken(token)}`;
    const secure = process.env.VERCEL || process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=0`);
    return json(res, 200, { ok: true });
  } catch (e) {
    return erroServidor(res, e);
  }
};
