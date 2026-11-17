/* Tela de login/cadastro — integrada ao English Quest.
   Em modo offline (arquivo aberto direto, file://) a tela é ignorada. */
(function () {
  "use strict";

  var tela = document.getElementById("authScreen");
  if (!tela) return;

  var formLogin = document.getElementById("formLogin");
  var formCadastro = document.getElementById("formCadastro");
  var titulo = document.getElementById("authTitle");
  var subtitulo = document.getElementById("authSub");
  var erro = document.getElementById("authErro");
  var botaoTrocar = document.getElementById("authTrocar");
  var botaoSair = document.getElementById("logoutBtn");
  var usuarioLabel = document.getElementById("authUser");

  var modo = "login";

  function mostrarErro(msg) {
    erro.textContent = msg || "";
    erro.classList.toggle("hide", !msg);
  }

  function setModo(novo) {
    modo = novo;
    var cadastro = novo === "cadastro";
    formLogin.classList.toggle("hide", cadastro);
    formCadastro.classList.toggle("hide", !cadastro);
    titulo.textContent = cadastro ? "Criar conta" : "Entrar";
    subtitulo.textContent = cadastro
      ? "É rápido: só um e-mail e uma senha."
      : "Entre para continuar de onde parou.";
    botaoTrocar.textContent = cadastro
      ? "Já tenho conta — entrar"
      : "Não tem conta? Cadastre-se";
    mostrarErro("");
  }

  function abrir() {
    tela.classList.remove("hide");
    document.body.classList.add("auth-locked");
    setTimeout(function () {
      var campo = document.getElementById(modo === "login" ? "loginEmail" : "cadEmail");
      if (campo) campo.focus();
    }, 0);
  }

  function fechar(email) {
    tela.classList.add("hide");
    document.body.classList.remove("auth-locked");
    if (botaoSair) botaoSair.classList.remove("hide");
    if (usuarioLabel && email) {
      usuarioLabel.textContent = "👤 " + email;
      usuarioLabel.title = email;
      usuarioLabel.classList.remove("hide");
    }
  }

  function api(url, dados) {
    var opcoes = { method: "GET", credentials: "same-origin", headers: {} };
    if (dados) {
      opcoes.method = "POST";
      opcoes.headers["Content-Type"] = "application/json";
      opcoes.body = JSON.stringify(dados);
    }
    return fetch(url, opcoes).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (corpo) {
        if (!r.ok) throw new Error(corpo.erro || "Não foi possível concluir. Tente de novo.");
        return corpo;
      });
    });
  }

  function enviar(evento, form, url, ehCadastro) {
    evento.preventDefault();
    mostrarErro("");
    var email = form.querySelector("[type=email]").value.trim();
    var senha = form.querySelector("[type=password]").value;
    var lembrar = !ehCadastro ? document.getElementById("loginLembrar").checked : false;
    var botao = form.querySelector("button[type=submit]");
    botao.disabled = true;
    botao.textContent = "Aguarde...";
    api(url, { email: email, senha: senha, lembrar: lembrar })
      .then(function (r) {
        form.reset();
        fechar(r.email || email);
      })
      .catch(function (e) { mostrarErro(e.message); })
      .finally(function () {
        botao.disabled = false;
        botao.textContent = ehCadastro ? "Criar conta" : "Entrar";
      });
  }

  formLogin.addEventListener("submit", function (e) { enviar(e, formLogin, "/api/login", false); });
  formCadastro.addEventListener("submit", function (e) { enviar(e, formCadastro, "/api/register", true); });
  botaoTrocar.addEventListener("click", function () { setModo(modo === "login" ? "cadastro" : "login"); });

  if (botaoSair) {
    botaoSair.addEventListener("click", function () {
      api("/api/logout", {})
        .catch(function () {})
        .finally(function () { window.location.reload(); });
    });
  }

  // Exposto para o build/offline e para testes
  window.EnglishQuestAuth = { abrir: abrir, fechar: fechar, setModo: setModo };

  if (location.protocol === "file:") {
    //abrindo o HTML sozinho, sem servidor: segue offline, sem login
    fechar(null);
    if (botaoSair) botaoSair.classList.add("hide");
    return;
  }

  api("/api/me")
    .then(function (r) { r.autenticado ? fechar(r.email) : abrir(); })
    .catch(function () { abrir(); });
})();
