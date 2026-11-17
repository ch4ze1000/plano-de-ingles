"use strict";

const { usuarioDaRequisicao, json, erroServidor } = require("./_lib");

module.exports = async function (req, res) {
  if (req.method !== "GET") return json(res, 405, { erro: "Método não permitido." });
  try {
    const usuario = await usuarioDaRequisicao(req);
    return json(res, 200, {
      autenticado: !!usuario,
      email: usuario ? usuario.email : null
    });
  } catch (e) {
    return erroServidor(res, e);
  }
};
