'use strict';

const { supabase }  = require('../config/supabase');
const auditModel    = require('../models/auditModel');
const usuarioModel  = require('../models/usuarioModel');

// ─────────────────────────────────────────────────────────────
// GET /login
// Se já há sessão válida, redireciona direto para home.
// ─────────────────────────────────────────────────────────────
async function showLogin(req, res) {
  // Usuário logado não vê login — valida o token antes de redirecionar
  if (req.session?.access_token) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(req.session.access_token);
      if (user && !error) return res.redirect('/');
    } catch (_) {}
    // Token inválido — deixa ver login
    req.session.destroy(() => {});
  }

  const erro = req.query.erro || null;
  const msgs = {
    conta_inativa:    'Sua conta está inativa. Contate o administrador.',
    sessao_expirada:  'Sua sessão expirou. Faça login novamente.',
  };

  res.send(renderLogin({ erro: msgs[erro] || null }));
}

// ─────────────────────────────────────────────────────────────
// POST /login
// ─────────────────────────────────────────────────────────────
async function doLogin(req, res) {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.send(renderLogin({ erro: 'Preencha e-mail e senha.' }));
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email:    email.trim().toLowerCase(),
      password: senha
    });

    if (error || !data?.session) {
      return res.send(renderLogin({ erro: 'E-mail ou senha incorretos.' }));
    }

    // Verifica perfil e status ativo
    const perfil = await usuarioModel.findByAuthId(data.user.id);

    if (!perfil) {
      return res.send(renderLogin({ erro: 'Usuário não encontrado no sistema.' }));
    }

    if (!perfil.ativo) {
      return res.redirect('/login?erro=conta_inativa');
    }

    // Salva sessão
    req.session.access_token  = data.session.access_token;
    req.session.refresh_token = data.session.refresh_token;
    req.session.usuario_id    = perfil.id;

    await auditModel.log({
      usuarioId: perfil.id,
      acao:      'login',
      ip:        req.ip
    });

    res.redirect('/');

  } catch (err) {
    console.error('[doLogin]', err.message);
    res.send(renderLogin({ erro: 'Erro interno. Tente novamente.' }));
  }
}

// ─────────────────────────────────────────────────────────────
// GET /logout
// ─────────────────────────────────────────────────────────────
async function doLogout(req, res) {
  try {
    if (req.session?.access_token) {
      await supabase.auth.signOut();
      await auditModel.log({
        usuarioId: req.session.usuario_id || null,
        acao:      'logout',
        ip:        req.ip
      });
    }
  } catch (_) {}

  req.session.destroy(() => res.redirect('/login'));
}

// ─────────────────────────────────────────────────────────────
// HTML da tela de login
// ─────────────────────────────────────────────────────────────
function renderLogin({ erro }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Login — Coelho &amp; Araújo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"/>
  <link rel="stylesheet" href="/css/main.css"/>
</head>
<body class="login-body">
  <div class="login-card">
    <div class="login-logo-wrap">
      <div class="login-logo-mark">C&amp;A</div>
      <div class="login-title">Coelho &amp; Araújo</div>
      <div class="login-sub">assessoria e consultoria jurídica</div>
    </div>
    <div class="divider-gold"></div>
    ${erro ? `<div class="alert alert-error"><i class="ti ti-alert-circle"></i> ${erro}</div>` : ''}
    <form method="POST" action="/login" autocomplete="off" id="login-form">
      <div class="form-group">
        <label class="form-label" for="email">E-mail</label>
        <input class="form-input" type="email" id="email" name="email"
               placeholder="seu@email.com.br" required autofocus/>
      </div>
      <div class="form-group">
        <label class="form-label" for="senha">Senha</label>
        <input class="form-input" type="password" id="senha" name="senha"
               placeholder="••••••••" required/>
      </div>
      <button class="btn-login-full" type="submit" id="btn-entrar">Entrar</button>
    </form>
    <p class="login-note">Acesso restrito a colaboradores cadastrados</p>
  </div>
  <script>
    // Feedback visual enquanto o formulário é submetido
    document.getElementById('login-form').addEventListener('submit', function() {
      const btn = document.getElementById('btn-entrar');
      btn.textContent = 'Entrando...';
      btn.disabled = true;
    });
  </script>
</body>
</html>`;
}

module.exports = { showLogin, doLogin, doLogout };
