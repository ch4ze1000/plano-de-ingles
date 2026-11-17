"use strict";

const {
  db, hashSenha, definirCookie, criarSessao,
  json, lerJson, emailValido, erroServidor
} = require("./_lib");

module.exports = async function (req, res) {
  if (req.method !== "POST") return json(res, 405, { erro: "Método não permitido." });

  let dados;
  try { dados = await lerJson(req); }
  catch { return json(res, 400, { erro: "Requisição inválida." }); }

  const email = String(dados.email || "").trim().toLowerCase();
  const senha = typeof dados.senha === "string" ? dados.senha : "";

  if (!emailValido(email)) return json(res, 400, { erro: "Informe um e-mail válido." });
  if (senha.length < 8 || senha.length > 128) {
    return json(res, 400, { erro: "A senha deve ter entre 8 e 128 caracteres." });
  }

  try {
    const existe = await db()`SELECT 1 FROM usuarios WHERE email = ${email}`;
    if (existe.length) return json(res, 409, { erro: "Este e-mail já está cadastrado." });

    const linhas = await db()`
      INSERT INTO usuarios (email, senha_hash) VALUES (${email}, ${hashSenha(senha)})
      RETURNING id
    `;
    const sessao = await criarSessao(linhas[0].id, !!dados.lembrar);
    definirCookie(res, sessao.token, sessao.maxAge);
    return json(res, 201, { ok: true, email });
  } catch (e) {
    if (String(e.message).includes("unique")) {
      return json(res, 409, { erro: "Este e-mail já está cadastrado." });
    }
    return erroServidor(res, e);
  }
};
