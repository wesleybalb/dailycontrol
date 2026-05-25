'use strict';

const layout = require('./layout');

module.exports = function adminView(usuario, usuarios) {
  // Só admins chegam aqui (garantido pela rota), mas renderizamos defensivamente
  const rows = usuarios.map(u => {
    const ini    = u.nome.split(' ').map(n=>n[0]).slice(0,2).join('');
    const ehVoce = u.id === usuario.id;
    // Escapar nome para uso em onclick
    const nomeEscaped = u.nome.replace(/'/g, "\\'");

    const rolePill = u.role === 'admin'
      ? `<span class="badge badge-admin">Admin</span>`
      : `<span class="badge badge-user">Usuário</span>`;

    const statusPill = u.ativo
      ? `<span class="badge badge-success">Ativo</span>`
      : `<span class="badge badge-danger">Inativo</span>`;

    const acoes = ehVoce
      ? `<span class="cell-muted" style="font-size:11px;" title="Você não pode editar sua própria conta aqui">—</span>`
      : `<div class="actions">
          <button class="act-btn" title="Editar"
            onclick="editarUsuario('${u.id}','${nomeEscaped}','${u.email}','${u.role}')">
            <i class="ti ti-edit" aria-hidden="true"></i>
          </button>
          <button class="act-btn" title="${u.ativo?'Desativar':'Reativar'}"
            onclick="toggleAtivo('${u.id}',${!u.ativo})">
            <i class="ti ti-${u.ativo?'user-off':'user-check'}" aria-hidden="true"></i>
          </button>
          <button class="act-btn" title="Redefinir senha"
            onclick="resetSenha('${u.id}','${nomeEscaped}')">
            <i class="ti ti-key" aria-hidden="true"></i>
          </button>
        </div>`;

    return `<tr class="${!u.ativo?'row-inativo':''}">
      <td class="cell">
        <div class="user-cell">
          <div class="avatar sm">${ini}</div>
          <span>${u.nome}</span>
          ${ehVoce?`<span class="you-tag">(você)</span>`:''}
        </div>
      </td>
      <td class="cell cell-muted">${u.email}</td>
      <td class="cell">${rolePill}</td>
      <td class="cell">${statusPill}</td>
      <td class="cell">${acoes}</td>
    </tr>`;
  }).join('');

  const body = `
<div class="content">
  <div class="toolbar">
    <div class="toolbar-left">
      <span class="section-title">Gestão de usuários</span>
      <span class="section-sub">· ${usuarios.length} colaborador${usuarios.length!==1?'es':''}</span>
    </div>
    <a href="/" class="btn btn-secondary">
      <i class="ti ti-arrow-left" aria-hidden="true"></i> Voltar ao painel
    </a>
  </div>

  <div class="table-wrap" style="margin-bottom:20px;">
    <table>
      <thead>
        <tr class="t-head">
          <th>Colaborador</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Ações</th>
        </tr>
      </thead>
      <tbody id="tabela-usuarios">${rows}</tbody>
    </table>
  </div>

  <!-- Formulário de criação / edição -->
  <div class="admin-form-card" id="admin-form-card">
    <div class="admin-form-title">
      <i class="ti ti-user-plus" style="color:var(--gold);" aria-hidden="true"></i>
      <span id="form-card-titulo">Adicionar novo colaborador</span>
    </div>
    <input type="hidden" id="edit-usuario-id" value=""/>
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label" for="new-nome">Nome completo</label>
        <input class="form-input" type="text" id="new-nome" placeholder="Nome Sobrenome" required/>
      </div>
      <div class="form-group">
        <label class="form-label" for="new-email">E-mail</label>
        <input class="form-input" type="email" id="new-email" placeholder="email@escritorio.adv.br" required/>
      </div>
      <div class="form-group">
        <label class="form-label" for="new-senha">
          Senha <span id="senha-hint" style="font-weight:400;color:var(--text3);">(mínimo 8 caracteres)</span>
        </label>
        <input class="form-input" type="password" id="new-senha" placeholder="Mínimo 8 caracteres"/>
      </div>
      <div class="form-group">
        <label class="form-label" for="new-role">Perfil de acesso</label>
        <select class="form-select" id="new-role">
          <option value="funcionario">Usuário</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <button class="btn btn-primary" onclick="salvarUsuario()">
        <i class="ti ti-check" aria-hidden="true"></i>
        <span id="btn-salvar-label">Criar usuário</span>
      </button>
      <button class="btn btn-secondary" id="btn-cancelar-edicao" style="display:none;" onclick="cancelarEdicao()">
        Cancelar
      </button>
    </div>
  </div>
</div>`;

  return layout('Gestão de usuários', usuario, body);
};
