'use strict';

const layout = require('./layout');

module.exports = function adminView(usuario, usuarios) {
  const rows = usuarios.map(u => {
    const ini         = u.nome.split(' ').map(n => n[0]).slice(0, 2).join('');
    const ehVoce      = u.id === usuario.id;
    const nomeEscaped = u.nome.replace(/'/g, "\\'");

    const rolePill = u.role === 'admin'
      ? `<span class="badge badge-admin">Admin</span>`
      : `<span class="badge badge-user">Usuário</span>`;

    const statusPill = u.ativo
      ? `<span class="badge badge-success">Ativo</span>`
      : `<span class="badge badge-danger">Inativo</span>`;

    // Botão de checklist aparece para TODOS, inclusive o próprio admin
    const btnChecklist = `
      <button class="act-btn" title="Editar checklist"
        onclick="abrirEditorTemplate('${u.id}','${nomeEscaped}')">
        <i class="ti ti-list-check" aria-hidden="true"></i>
      </button>`;

    const btnToggle = ehVoce ? '' : `
      <button class="act-btn" title="${u.ativo ? 'Desativar' : 'Reativar'}"
        onclick="toggleAtivo('${u.id}',${!u.ativo})">
        <i class="ti ti-${u.ativo ? 'user-off' : 'user-check'}" aria-hidden="true"></i>
      </button>`;

    const btnReset = ehVoce ? '' : `
      <button class="act-btn" title="Redefinir senha"
        onclick="resetSenha('${u.id}','${nomeEscaped}')">
        <i class="ti ti-key" aria-hidden="true"></i>
      </button>`;

    return `<tr class="${!u.ativo ? 'row-inativo' : ''}">
      <td class="cell">
        <div class="user-cell">
          <div class="avatar sm">${ini}</div>
          <span>${u.nome}</span>
          ${ehVoce ? `<span class="you-tag">(você)</span>` : ''}
        </div>
      </td>
      <td class="cell cell-muted">${u.email}</td>
      <td class="cell">${rolePill}</td>
      <td class="cell">${statusPill}</td>
      <td class="cell">
        <div class="actions">
          ${btnChecklist}${btnToggle}${btnReset}
        </div>
      </td>
    </tr>`;
  }).join('');

  const body = `
<div class="content">
  <div class="toolbar">
    <div class="toolbar-left">
      <span class="section-title">Gestão de usuários</span>
      <span class="section-sub">· ${usuarios.length} colaborador${usuarios.length !== 1 ? 'es' : ''}</span>
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

  <!-- Editor de template do checklist -->
  <div class="admin-form-card" id="editor-template" style="display:none;margin-bottom:20px;">
    <div class="admin-form-title">
      <i class="ti ti-list-check" style="color:var(--gold);" aria-hidden="true"></i>
      <span id="editor-template-titulo">Checklist de —</span>
    </div>
    <p style="font-size:12px;color:var(--text2);margin-bottom:14px;">
      Edite, adicione ou remova tarefas. As alterações valem para os próximos registros criados por este colaborador.
    </p>

    <div id="editor-blocos"></div>

    <div style="display:flex;gap:8px;margin-top:16px;">
      <button class="btn btn-primary" onclick="salvarTemplate()">
        <i class="ti ti-check" aria-hidden="true"></i> Salvar checklist
      </button>
      <button class="btn btn-secondary" onclick="fecharEditorTemplate()">
        Cancelar
      </button>
    </div>
  </div>

  <!-- Formulário de criação de usuário -->
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
      <button class="btn btn-secondary" id="btn-cancelar-edicao"
        style="display:none;" onclick="cancelarEdicao()">
        Cancelar
      </button>
    </div>
  </div>
</div>`;

  return layout('Gestão de usuários', usuario, body);
};