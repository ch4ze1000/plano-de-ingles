# Publicar no Vercel (com login funcionando)

## 1. O que subir

A pasta inteira: `C:\Users\berve\plano-ingles`

O arquivo `.vercelignore` já exclui o que é só desenvolvimento local (`server.js`, `build.js`, `dev/`, `node_modules`, o SQLite local). O que sobe é:

- `index.html`, `auth.js`, `plano-ingles.html`
- `data/semana-*.js` (8 arquivos de conteúdo)
- `api/_lib.js`, `api/me.js`, `api/register.js`, `api/login.js`, `api/logout.js`
- `package.json`, `package-lock.json`

---

## 2. Criar o banco (Neon — gratuito)

1. Acesse **https://neon.tech** e crie uma conta.
2. Crie um projeto (pode ser o plano Free; região próxima do Brasil, ex.: `us-east-1`).
3. Em **Connection Details**, copie a **Connection string** (a que termina com `?sslmode=require`). Exemplo:
   ```
   postgresql://usuario:senha@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Abra o **SQL Editor** do Neon, cole o conteúdo de `dev/setup-neon.sql` e execute (**Run**). Só precisa fazer isso uma vez.

---

## 3. Publicar na Vercel

### Pela interface
1. Acesse **https://vercel.com/new** e importe a pasta/repositório.
2. Antes de dar deploy, em **Environment Variables** adicione:
   - **Name:** `DATABASE_URL`
   - **Value:** a connection string copiada do Neon
   - Marque **Production**, **Preview** e **Development**
3. Clique em **Deploy**. Não precisa configurar build command.

### Pela CLI (opcional)
```powershell
cd C:\Users\berve\plano-ingles
npm i -g vercel
vercel
vercel env add DATABASE_URL
vercel --prod
```

---

## 4. Testar

1. Abra a URL da Vercel.
2. Clique em **Não tem conta? Cadastre-se** e crie um usuário.
3. Recarregue a página: deve continuar logado.
4. Teste **Lembrar de mim**: feche e reabra o navegador — a sessão dura 30 dias.
5. Teste **Sair** e tente entrar de novo.

---

## Como está implementado

- Cada rota (`/api/me`, `/api/register`, `/api/login`, `/api/logout`) é uma função serverless em `api/`.
- As senhas são salvas como **hash scrypt com salt** — nunca em texto puro.
- As sessões ficam numa tabela do Postgres, com o token hasheado; o navegador recebe só um cookie `HttpOnly` + `SameSite=Lax` (+ `Secure` em produção).
- Não é necessário nenhum servidor rodando: a Vercel chama as funções sob demanda.

## Rodando localmente (sem Vercel)

```powershell
cd C:\Users\berve\plano-ingles
npm start
```
Abre em `http://localhost:3000`. Sem `DATABASE_URL`, o mesmo código usa SQLite local em `data/usuarios.sqlite`. Se você definir `DATABASE_URL`, o local passa a usar o Neon também — útil para testar antes de publicar.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Tela de login aparece, mas dá erro 500 | `DATABASE_URL` não configurada na Vercel, ou tabelas não criadas (rode `dev/setup-neon.sql`) |
| "Este e-mail já está cadastrado" | Usuário já existe no Neon (é bom sinal: o banco está conectado) |
| Login funciona, mas ao recarregar sai | Cookie bloqueado — confirme que a URL é HTTPS e que o domínio é o mesmo |

> Observação: o progresso dos dias concluídos continua salvo no `localStorage` do navegador, igual antes. O banco guarda apenas credenciais e sessões, como você pediu.
