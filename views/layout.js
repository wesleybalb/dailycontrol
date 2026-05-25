'use strict';

function layout(title, usuario, bodyHtml) {
  const initials = usuario.nome.split(' ').map(n => n[0]).slice(0, 2).join('');
  const isAdmin  = usuario.role === 'admin';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title} — Coelho &amp; Araújo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"/>
  <link rel="stylesheet" href="/css/main.css"/>
</head>
<body>

<header class="app-header">
  <a href="/" class="logo">
    <div class="logo-mark">C&amp;A</div>
    <div class="logo-text-wrap">
      <div class="logo-name">Coelho &amp; Araújo</div>
      <div class="logo-tagline">assessoria e consultoria jurídica</div>
    </div>
  </a>
  <div class="header-right">
    <div class="user-chip">
      <div class="avatar">${initials}</div>
      <span class="user-name">${usuario.nome.split(' ')[0]}</span>
      ${isAdmin ? `<span class="badge badge-admin">Admin</span>` : ''}
    </div>
    ${isAdmin
      ? `<a href="/admin" class="btn-icon" title="Painel administrativo" aria-label="Painel administrativo">
           <i class="ti ti-settings" aria-hidden="true"></i>
         </a>`
      : ''}
    <a href="/logout" class="btn-icon" title="Sair" aria-label="Sair do sistema">
      <i class="ti ti-logout" aria-hidden="true"></i>
    </a>
  </div>
</header>

<main>
  ${bodyHtml}
</main>

<div id="toast" class="toast" role="status" aria-live="polite">
  <i class="ti ti-check toast-icon" id="toast-icon" aria-hidden="true"></i>
  <span id="toast-msg"></span>
</div>

<script>
  // Dados do usuário logado, disponíveis globalmente para app.js
  window.CEA = {
    usuarioId:   '${usuario.id}',
    usuarioNome: ${JSON.stringify(usuario.nome)},
    usuarioRole: '${usuario.role}',
    isAdmin:     ${isAdmin}
  };
</script>
<script src="/js/app.js"></script>
</body>
</html>`;
}

module.exports = layout;
