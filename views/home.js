'use strict';

const layout = require('./layout');

function fmtData(d) {
  if (!d) return '—';
  const [,m,dia] = d.split('-');
  return `${dia}/${m}`;
}

function fmtTs(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  const p = n => String(n).padStart(2,'0');
  return `${p(d.getDate())}/${p(d.getMonth()+1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function statusPill(status) {
  return status === 'fechado'
    ? `<span class="badge badge-success"><i class="ti ti-check" aria-hidden="true"></i> Fechado</span>`
    : `<span class="badge badge-draft"><i class="ti ti-pencil" aria-hidden="true"></i> Rascunho</span>`;
}

function progressBar(pct) {
  return `<div class="prog-wrap">
    <div class="prog-bar"><div class="${pct===100?'prog-fill full':'prog-fill'}" style="width:${pct}%"></div></div>
    <span class="prog-pct">${pct}%</span>
  </div>`;
}

function renderRows(registros, logadoId, tabId) {
  const hoje = new Date().toISOString().split('T')[0];
  if (!registros.length) {
    return `<tr><td colspan="5" class="empty-state">Nenhum registro encontrado.</td></tr>`;
  }
  return registros.map(r => {
    const ehHoje   = r.data_registro === hoje;
    const editavel = r.editavel && tabId === logadoId;
    const botao = tabId === logadoId
      ? (r.status === 'rascunho' && editavel
          ? `<button class="btn btn-sm btn-secondary" onclick="abrirRegistro('${r.id}')">Continuar</button>`
          : `<button class="btn btn-sm btn-ghost" onclick="verRegistro('${r.id}')">Ver</button>`)
      : `<button class="btn btn-sm btn-ghost" onclick="verRegistro('${r.id}')">Ver</button>`;

    return `<tr class="${ehHoje?'today':''}">
      <td class="cell">${fmtData(r.data_registro)}${ehHoje?` <span class="today-tag">hoje</span>`:''}</td>
      <td class="cell">${progressBar(r.percentual)}</td>
      <td class="cell">${statusPill(r.status)}</td>
      <td class="cell cell-muted">${fmtTs(r.fechado_em)}</td>
      <td class="cell">${botao}</td>
    </tr>`;
  }).join('');
}

function btnNovoHtml(registroHoje) {
  if (!registroHoje) {
    return `<button class="btn btn-primary" onclick="novoRegistro()">
              <i class="ti ti-plus" aria-hidden="true"></i> Novo registro
            </button>`;
  }
  if (registroHoje.status === 'rascunho' && registroHoje.editavel) {
    return `<button class="btn btn-primary" onclick="abrirRegistro('${registroHoje.id}')">
              <i class="ti ti-pencil" aria-hidden="true"></i> Continuar registro
            </button>`;
  }
  return `<button class="btn btn-secondary" onclick="verRegistro('${registroHoje.id}')">
            <i class="ti ti-eye" aria-hidden="true"></i> Ver registro de hoje
          </button>`;
}

module.exports = function homeView(usuario, usuarios, registros, registroHoje, stats, erroAcesso) {
  const mes = new Date().toLocaleDateString('pt-BR', { month: 'long' });
  const ano = new Date().getFullYear();

  const tabs = usuarios.map(u => {
    const ini   = u.nome.split(' ').map(n=>n[0]).slice(0,2).join('');
    const ativo = u.id === usuario.id;
    // Escapar o nome para uso seguro no atributo onclick
    const nomeEscaped = u.nome.replace(/'/g, "\\'");
    return `<button class="tab${ativo?' active':''}" role="tab" aria-selected="${ativo}"
      data-uid="${u.id}" onclick="selectTab(this,'${u.id}','${nomeEscaped}')">
      <div class="tab-av">${ini}</div>
      ${u.nome.split(' ')[0]}
    </button>`;
  }).join('');

  const body = `
${erroAcesso ? `<div class="alert-banner alert-banner-error"><i class="ti ti-lock"></i> ${erroAcesso}</div>` : ''}

<div class="tabs-bar" role="tablist" aria-label="Colaboradores">${tabs}</div>

<div class="content">

  <div class="toolbar">
    <div class="toolbar-left">
      <span class="section-title" id="tab-title">${usuario.nome.split(' ')[0]} ${usuario.nome.split(' ').slice(1,2).join('')}</span>
      <span class="section-sub" id="tab-sub">· últimos 10 registros</span>
    </div>
    <div class="toolbar-right">
      <i class="ti ti-calendar" style="font-size:15px;color:var(--text2);" aria-hidden="true"></i>
      <input class="date-input" type="date" id="filtro-inicio" aria-label="Data inicial"/>
      <span class="sep">até</span>
      <input class="date-input" type="date" id="filtro-fim" aria-label="Data final"/>
      <button class="btn btn-secondary" onclick="buscarPeriodo()">
        <i class="ti ti-search" aria-hidden="true"></i> Buscar
      </button>
      <div id="btn-novo-wrap">${btnNovoHtml(registroHoje)}</div>
    </div>
  </div>

  <div class="stats-row">
    <div class="stat-card">
      <div class="stat-label">Registros no mês</div>
      <div class="stat-value gold" id="stat-count">${stats.registrosNoMes}</div>
      <div class="stat-sub" id="stat-mes">${mes.charAt(0).toUpperCase()+mes.slice(1)} / ${ano}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Taxa de conclusão</div>
      <div class="stat-value" id="stat-rate">${stats.taxaConclusao}%</div>
      <div class="stat-sub">média dos itens no mês</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Registro de hoje</div>
      <div class="stat-value" id="stat-today" style="font-size:15px;padding-top:4px;">
        ${registroHoje ? (registroHoje.status==='fechado' ? 'Fechado' : 'Em rascunho') : 'Sem registro'}
      </div>
      <span class="stat-accent" id="stat-prog">
        ${registroHoje
          ? `${registroHoje.itens_concluidos} / ${registroHoje.total_itens} concluído`
          : 'Nenhum registro hoje'}
      </span>
    </div>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr class="t-head">
          <th>Data</th><th>Progresso</th><th>Status</th><th>Fechado em</th><th></th>
        </tr>
      </thead>
      <tbody id="tabela-registros">
        ${renderRows(registros, usuario.id, usuario.id)}
      </tbody>
    </table>
  </div>

</div>

<!-- Modal do checklist -->
<div id="modal-overlay" class="modal-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="modal-title-el">
  <div id="modal-registro" class="modal-card"></div>
</div>

<script>
  // Complementa o objeto CEA com dados da tab inicial
  window.CEA.tabUsuarioId   = '${usuario.id}';
  window.CEA.tabUsuarioNome = ${JSON.stringify(usuario.nome)};
  window.CEA.registroHojeId = ${registroHoje ? `'${registroHoje.id}'` : 'null'};
</script>`;

  return layout('Painel', usuario, body);
};
