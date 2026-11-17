"use strict";

const {
  db, senhaConfere, definirCookie, criarSessao,
  json, lerJson, erroServidor
} = require("./_lib");

module.exports = async function (req, res) {
  if (req.method !== "POST") return json(res, 405, { erro: "Método não permitido." });

  let dados;
  try { dados = await lerJson(req); }
  catch { return json(res, 400, { erro: "Requisição inválida." }); }

  const email = String(dados.email || "").trim().toLowerCase();
  const senha = typeof dados.senha === "string" ? dados.senha : "";
  if (!email || !senha) return json(res, 400, { erro: "Informe e-mail e senha." });

  try {
    const linhas = await db()`SELECT id, email, senha_hash FROM usuarios WHERE email = ${email}`;
    const usuario = linhas[0];
    if (!usuario || !senhaConfere(senha, usuario.senha_hash)) {
      return json(res, 401, { erro: "E-mail ou senha incorretos." });
    }
    const sessao = await criarSessao(usuario.id, !!dados.lembrar);
    definirCookie(res, sessao.token, sessao.maxAge);
    return json(res, 200, { ok: true, email: usuario.email });
  } catch (e) {
    return erroServidor(res, e);
  }
};
