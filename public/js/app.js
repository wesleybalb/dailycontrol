/* ============================================================
   Coelho & Araújo — Daily Control  |  app.js (client-side)
   ============================================================ */
'use strict';

// ── Toast ─────────────────────────────────────────────────
let _toastTimer = null;

function showToast(msg, tipo) {
  const el   = document.getElementById('toast');
  const icon = document.getElementById('toast-icon');
  if (!el) return;
  document.getElementById('toast-msg').textContent = msg;
  el.classList.remove('error', 'show');
  icon.className = tipo === 'error'
    ? 'ti ti-alert-circle toast-icon'
    : 'ti ti-check toast-icon';
  if (tipo === 'error') el.classList.add('error');
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3400);
}

// ── API helpers ───────────────────────────────────────────
async function api(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`);
  return data;
}

async function apiUpload(url, formData) {
  const res  = await fetch(url, { method: 'POST', body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`);
  return data;
}

// ── Utilitários ───────────────────────────────────────────
function fmtTs(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth()+1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fmtData(str) {
  if (!str) return '—';
  const [,m,d] = str.split('-');
  return `${d}/${m}`;
}

// ── Tabs ──────────────────────────────────────────────────
async function selectTab(el, usuarioId, nomeCompleto) {
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  el.classList.add('active');
  el.setAttribute('aria-selected', 'true');

  window.CEA.tabUsuarioId   = usuarioId;
  window.CEA.tabUsuarioNome = nomeCompleto;

  document.getElementById('tab-title').textContent = nomeCompleto;
  document.getElementById('tab-sub').textContent   = '· carregando...';

  const ehMeu = usuarioId === window.CEA.usuarioId;
  _atualizarBtnNovo(ehMeu, null);

  document.getElementById('tabela-registros').innerHTML =
    `<tr class="loading-row"><td colspan="5"><i class="ti ti-loader-2 spin"></i> Carregando...</td></tr>`;

  try {
    const { registros, stats } = await api('GET', `/api/tab/${usuarioId}`);
    _renderTabela(registros, usuarioId);
    _renderStats(stats);
    document.getElementById('tab-sub').textContent = `· últimos 10 registros`;

    if (ehMeu) {
      const hoje = new Date().toISOString().split('T')[0];
      const regHoje = registros.find(r => r.data_registro === hoje) || null;
      _atualizarBtnNovo(true, regHoje);
    }
  } catch (err) {
    document.getElementById('tabela-registros').innerHTML =
      `<tr><td colspan="5" class="empty-state">Erro ao carregar dados.</td></tr>`;
    document.getElementById('tab-sub').textContent = '';
    showToast(err.message, 'error');
  }
}

function _renderTabela(registros, tabUsuarioId) {
  const hoje  = new Date().toISOString().split('T')[0];
  const tbody = document.getElementById('tabela-registros');
  const ehMeu = tabUsuarioId === window.CEA.usuarioId;

  if (!registros.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhum registro encontrado.</td></tr>';
    return;
  }

  tbody.innerHTML = registros.map(r => {
    const ehHoje   = r.data_registro === hoje;
    const editavel = r.editavel && ehMeu;
    const pct      = r.percentual || 0;
    const progBar  = `<div class="prog-wrap">
      <div class="prog-bar"><div class="${pct===100?'prog-fill full':'prog-fill'}" style="width:${pct}%"></div></div>
      <span class="prog-pct">${pct}%</span>
    </div>`;
    const pill = r.status === 'fechado'
      ? `<span class="badge badge-success"><i class="ti ti-check" aria-hidden="true"></i> Fechado</span>`
      : `<span class="badge badge-draft"><i class="ti ti-pencil" aria-hidden="true"></i> Rascunho</span>`;
    const botao = ehMeu
      ? (r.status === 'rascunho' && editavel
          ? `<button class="btn btn-sm btn-secondary" onclick="abrirRegistro('${r.id}')">Continuar</button>`
          : `<button class="btn btn-sm btn-ghost" onclick="verRegistro('${r.id}')">Ver</button>`)
      : `<button class="btn btn-sm btn-ghost" onclick="verRegistro('${r.id}')">Ver</button>`;

    return `<tr class="${ehHoje?'today':''}">
      <td class="cell">${fmtData(r.data_registro)}${ehHoje?` <span class="today-tag">hoje</span>`:''}</td>
      <td class="cell">${progBar}</td>
      <td class="cell">${pill}</td>
      <td class="cell cell-muted">${fmtTs(r.fechado_em)}</td>
      <td class="cell">${botao}</td>
    </tr>`;
  }).join('');
}

function _renderStats(stats) {
  const el = document.getElementById('stat-count');
  const rt = document.getElementById('stat-rate');
  if (el) el.textContent = stats.registrosNoMes;
  if (rt) rt.textContent = stats.taxaConclusao + '%';
}

function _atualizarBtnNovo(ehMeu, regHoje) {
  const wrap = document.getElementById('btn-novo-wrap');
  if (!wrap) return;
  if (!ehMeu) { wrap.innerHTML = ''; return; }

  if (!regHoje) {
    wrap.innerHTML = `<button class="btn btn-primary" onclick="novoRegistro()">
      <i class="ti ti-plus" aria-hidden="true"></i> Novo registro
    </button>`;
  } else if (regHoje.status === 'rascunho' && regHoje.editavel) {
    wrap.innerHTML = `<button class="btn btn-primary" onclick="abrirRegistro('${regHoje.id}')">
      <i class="ti ti-pencil" aria-hidden="true"></i> Continuar registro
    </button>`;
  } else {
    wrap.innerHTML = `<button class="btn btn-secondary" onclick="verRegistro('${regHoje.id}')">
      <i class="ti ti-eye" aria-hidden="true"></i> Ver registro de hoje
    </button>`;
  }
}

// ── Busca por período ─────────────────────────────────────
async function buscarPeriodo() {
  const inicio = document.getElementById('filtro-inicio').value;
  const fim    = document.getElementById('filtro-fim').value;

  if (!inicio || !fim) { showToast('Selecione as duas datas para filtrar.', 'error'); return; }
  if (inicio > fim)    { showToast('A data inicial deve ser anterior à data final.', 'error'); return; }

  document.getElementById('tab-sub').textContent = '· buscando...';
  document.getElementById('tabela-registros').innerHTML =
    `<tr class="loading-row"><td colspan="5"><i class="ti ti-loader-2 spin"></i> Buscando...</td></tr>`;

  try {
    const { registros } = await api('GET', `/api/tab/${window.CEA.tabUsuarioId}?inicio=${inicio}&fim=${fim}`);
    _renderTabela(registros, window.CEA.tabUsuarioId);
    document.getElementById('tab-sub').textContent =
      `· ${registros.length} registro${registros.length!==1?'s':''} encontrado${registros.length!==1?'s':''}`;
  } catch (err) {
    showToast(err.message, 'error');
    document.getElementById('tab-sub').textContent = '';
  }
}

// ── Criar novo registro ───────────────────────────────────
async function novoRegistro() {
  const btn = document.querySelector('#btn-novo-wrap .btn');
  if (btn) { btn.disabled = true; btn.innerHTML = `<i class="ti ti-loader-2 spin"></i> Criando...`; }
  try {
    const { registro } = await api('POST', '/registro/novo');
    window.CEA.registroHojeId = registro.id;
    _atualizarBtnNovo(true, registro);
    await abrirRegistro(registro.id);
  } catch (err) {
    if (err.message.includes('Já existe')) {
      showToast('Já existe um registro para hoje. Abrindo...', 'error');
      if (window.CEA.registroHojeId) await abrirRegistro(window.CEA.registroHojeId);
    } else {
      showToast(err.message, 'error');
    }
    _atualizarBtnNovo(true, null);
  }
}

// ── Modal ─────────────────────────────────────────────────
async function abrirRegistro(id) {
  _showModalLoading();
  try {
    const { registro } = await api('GET', `/registro/${id}`);
    _renderModal(registro);
  } catch (err) { _hideModal(); showToast(err.message, 'error'); }
}

async function verRegistro(id) {
  _showModalLoading();
  try {
    const { registro } = await api('GET', `/registro/${id}`);
    registro._forcarLeitura = true;
    _renderModal(registro);
  } catch (err) { _hideModal(); showToast(err.message, 'error'); }
}

function _showModalLoading() {
  document.getElementById('modal-registro').innerHTML =
    `<div style="padding:60px;text-align:center;color:var(--text2);">
      <i class="ti ti-loader-2 spin" style="font-size:24px;"></i>
    </div>`;
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function _hideModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

function fecharModal() {
  _hideModal();
  const tabAtiva = document.querySelector('.tab.active');
  if (tabAtiva && window.CEA.tabUsuarioId)
    selectTab(tabAtiva, window.CEA.tabUsuarioId, window.CEA.tabUsuarioNome || window.CEA.tabUsuarioId);
}

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) fecharModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const ov = document.getElementById('modal-overlay');
      if (ov && !ov.classList.contains('hidden')) fecharModal();
    }
  });
});

function _renderModal(registro) {
  const soLeitura  = !registro.editavel || registro._forcarLeitura;
  const pct        = registro.percentual || 0;
  const concluidos = registro.itens_concluidos || 0;
  const total      = registro.total_itens || 0;

  const blocos = { inicio: [], meio: [], final: [] };
  (registro.checklist_itens || []).forEach(i => { if (blocos[i.bloco]) blocos[i.bloco].push(i); });

  const metaBlocos = {
    inicio: { label: 'Início do expediente', icon: 'ti-sun-rise' },
    meio:   { label: 'Meio do dia',           icon: 'ti-sun'      },
    final:  { label: 'Final do expediente',   icon: 'ti-sun-off'  }
  };

  const blocosHtml = Object.entries(blocos).map(([bloco, itens]) => {
    if (!itens.length) return '';
    const meta = metaBlocos[bloco];
    return `<div class="checklist-block">
      <div class="block-label"><i class="ti ${meta.icon}" aria-hidden="true"></i> ${meta.label}</div>
      ${itens.map(item => _renderItem(item, soLeitura)).join('')}
    </div>`;
  }).join('');

  const dataFmt = new Date(registro.data_registro + 'T12:00:00')
    .toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });

  const footer = soLeitura
    ? `<span class="cell-muted" style="font-size:11px;">
         <i class="ti ti-lock" style="font-size:12px;" aria-hidden="true"></i>
         Registro ${registro.status === 'fechado' ? 'fechado' : 'bloqueado'} — somente leitura
       </span>
       <button class="btn btn-secondary" onclick="fecharModal()">Fechar</button>`
    : `<button class="btn btn-secondary" onclick="salvarRascunho('${registro.id}')">
         <i class="ti ti-device-floppy" aria-hidden="true"></i> Salvar rascunho
       </button>
       <button class="btn btn-primary" onclick="confirmarFechar('${registro.id}')">
         <i class="ti ti-lock" aria-hidden="true"></i> Fechar registro
       </button>`;

  document.getElementById('modal-registro').innerHTML = `
    <div class="modal-header">
      <div>
        <div class="modal-title" id="modal-title-el">Registro diário — ${registro.usuario_nome || ''}</div>
        <div class="modal-meta">${dataFmt} &nbsp;·&nbsp; ${registro.status === 'fechado' ? 'Fechado' : 'Em andamento'}</div>
      </div>
      <button class="modal-close" onclick="fecharModal()" aria-label="Fechar">
        <i class="ti ti-x" aria-hidden="true"></i>
      </button>
    </div>
    <div class="prog-header">
      <span style="font-size:11px;color:var(--text2);">Progresso:</span>
      <div class="prog-global">
        <div class="prog-global-fill" id="modal-prog-fill" style="width:${pct}%"></div>
      </div>
      <span class="prog-count" id="modal-prog-count">${concluidos} / ${total} concluído</span>
    </div>
    <div class="modal-body">${blocosHtml}</div>
    <div class="obs-section">
      <div class="obs-label">Observações gerais</div>
      <textarea class="obs-textarea" id="modal-obs" ${soLeitura?'readonly':''}
        placeholder="Registre aqui observações relevantes do dia...">${registro.observacoes || ''}</textarea>
    </div>
    <div class="modal-footer" id="modal-footer">${footer}</div>`;

  window._regAtual = registro;
}

function _renderItem(item, soLeitura) {
  const done       = item.concluido;
  const checkAttr  = soLeitura
    ? `aria-checked="${done}" tabindex="-1"`
    : `onclick="toggleItem('${item.id}',${!done})" role="checkbox" aria-checked="${done}" tabindex="0"`;
  const checkClass = `check-box${done?' checked':''}${soLeitura?' readonly-check':''}`;
  const labelClass = `check-label${done?' done':''}`;

  let evidEl = '';
  if (done && item.evidencia_url) {
    evidEl = soLeitura
      ? `<a class="evidence-ok" href="${item.evidencia_url}" target="_blank" rel="noopener">
           <i class="ti ti-paperclip" aria-hidden="true"></i> ver evidência
         </a>`
      : `<span class="evidence-ok" onclick="verEvidencia('${item.evidencia_url}')">
           <i class="ti ti-paperclip" aria-hidden="true"></i> evidência
         </span>
         <button class="evidence-btn" style="margin-left:4px;" onclick="removerEvidencia('${item.id}')">
           <i class="ti ti-trash" style="font-size:9px;" aria-hidden="true"></i>
         </button>`;
  } else if (!soLeitura) {
    evidEl = `<button class="evidence-btn" onclick="uploadEvidencia('${item.id}')">
      <i class="ti ti-upload" style="font-size:10px;" aria-hidden="true"></i> anexar
    </button>`;
  }

  return `<div class="check-item" id="item-${item.id}">
    <div class="${checkClass}" ${checkAttr}></div>
    <span class="${labelClass}">${item.tarefa}</span>
    ${evidEl}
  </div>`;
}

// ── Checklist: toggle, upload, evidência ──────────────────
async function toggleItem(itemId, concluido) {
  const box = document.querySelector(`#item-${itemId} .check-box`);
  if (box) { box.classList.add('loading'); box.onclick = null; }
  try {
    await api('PATCH', `/checklist/${itemId}/toggle`, { concluido });
    await _recarregarModal(window._regAtual.id);
  } catch (err) {
    showToast(err.message, 'error');
    if (box) { box.classList.remove('loading'); box.onclick = () => toggleItem(itemId, concluido); }
  }
}

function uploadEvidencia(itemId) {
  const input  = document.createElement('input');
  input.type   = 'file';
  input.accept = 'image/*,.pdf';
  input.onchange = async () => {
    if (!input.files[0]) return;
    if (input.files[0].size > 4 * 1024 * 1024) { showToast('Arquivo muito grande. Máximo 4 MB.', 'error'); return; }
    const fd = new FormData();
    fd.append('evidencia', input.files[0]);
    showToast('Enviando evidência...');
    try {
      await apiUpload(`/checklist/${itemId}/evidencia`, fd);
      await _recarregarModal(window._regAtual.id);
      showToast('Evidência anexada com sucesso!');
    } catch (err) { showToast(err.message, 'error'); }
  };
  input.click();
}

function verEvidencia(url) { window.open(url, '_blank', 'noopener'); }

async function removerEvidencia(itemId) {
  if (!confirm('Remover esta evidência e desmarcar o item?')) return;
  try {
    await api('DELETE', `/checklist/${itemId}/evidencia`);
    await _recarregarModal(window._regAtual.id);
    showToast('Evidência removida.');
  } catch (err) { showToast(err.message, 'error'); }
}

async function salvarRascunho(registroId) {
  const obs = document.getElementById('modal-obs')?.value || '';
  const btn = document.querySelector('#modal-footer .btn-secondary');
  if (btn) { btn.disabled = true; btn.innerHTML = `<i class="ti ti-loader-2 spin"></i> Salvando...`; }
  try {
    await api('PATCH', `/registro/${registroId}/rascunho`, { observacoes: obs });
    showToast('Rascunho salvo com sucesso!');
  } catch (err) { showToast(err.message, 'error'); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = `<i class="ti ti-device-floppy"></i> Salvar rascunho`; } }
}

function confirmarFechar(registroId) {
  const pendentes = (window._regAtual?.total_itens||0) - (window._regAtual?.itens_concluidos||0);
  const msg = pendentes > 0
    ? `Ainda há ${pendentes} item(ns) sem evidência. Fechar mesmo assim?\n\nEsta ação é irreversível.`
    : 'Fechar este registro? Esta ação é irreversível.';
  if (confirm(msg)) fecharRegistro(registroId);
}

async function fecharRegistro(registroId) {
  const obs = document.getElementById('modal-obs')?.value || '';
  const btn = document.querySelector('#modal-footer .btn-primary');
  if (btn) { btn.disabled = true; btn.innerHTML = `<i class="ti ti-loader-2 spin"></i> Fechando...`; }
  try {
    await api('PATCH', `/registro/${registroId}/fechar`, { observacoes: obs });
    showToast('Registro fechado com sucesso!');
    await _recarregarModal(registroId);
    const el = document.getElementById('stat-today');
    if (el) el.textContent = 'Fechado';
    _atualizarBtnNovo(true, { id: registroId, status: 'fechado', editavel: false });
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = `<i class="ti ti-lock"></i> Fechar registro`; }
  }
}

async function _recarregarModal(registroId) {
  const { registro } = await api('GET', `/registro/${registroId}`);
  if (window._regAtual?._forcarLeitura) registro._forcarLeitura = true;
  window._regAtual = registro;
  _renderModal(registro);
}

// ── Admin: editor de template ─────────────────────────────
let _templateUsuarioId = null;

async function abrirEditorTemplate(usuarioId, nomeUsuario) {
  _templateUsuarioId = usuarioId;
  const editor = document.getElementById('editor-template');
  const blocos = document.getElementById('editor-blocos');

  document.getElementById('editor-template-titulo').textContent = `Checklist de ${nomeUsuario}`;
  blocos.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text2);">
    <i class="ti ti-loader-2 spin"></i> Carregando...
  </div>`;
  editor.style.display = 'block';
  editor.scrollIntoView({ behavior: 'smooth' });

  try {
    const { template } = await api('GET', `/admin/usuario/${usuarioId}/template`);
    _renderEditorBlocos(template);
  } catch (err) {
    blocos.innerHTML = `<p style="color:var(--red-text);font-size:13px;">Erro: ${err.message}</p>`;
    showToast(err.message, 'error');
  }
}

function _renderEditorBlocos(itens) {
  const blocos = { inicio: [], meio: [], final: [] };
  itens.forEach(i => { if (blocos[i.bloco]) blocos[i.bloco].push(i); });

  const nomes = {
    inicio: { label: 'Início do expediente', icon: 'ti-sun-rise' },
    meio:   { label: 'Meio do dia',           icon: 'ti-sun'      },
    final:  { label: 'Final do expediente',   icon: 'ti-sun-off'  }
  };

  const html = Object.entries(blocos).map(([bloco, items]) => {
    const meta = nomes[bloco];

    const linhas = items.map(item => `
      <div class="check-item" style="padding:6px 0;gap:6px;" data-item-id="${item.id}" data-bloco="${bloco}">
        <div style="width:6px;height:6px;border-radius:50%;background:var(--gold);flex-shrink:0;margin-top:8px;"></div>
        <input
          class="form-input"
          type="text"
          data-item-id="${item.id}"
          value="${item.tarefa.replace(/"/g, '&quot;')}"
          style="flex:1;font-size:12.5px;padding:6px 10px;"
        />
        <button
          class="act-btn"
          title="Remover item"
          style="flex-shrink:0;color:var(--red-text);border-color:#e8b4b4;"
          onclick="removerItemTemplate('${item.id}','${bloco}')">
          <i class="ti ti-x" aria-hidden="true"></i>
        </button>
      </div>`).join('');

    return `<div class="checklist-block" style="margin-bottom:16px;" id="bloco-${bloco}">
      <div class="block-label">
        <i class="ti ${meta.icon}" aria-hidden="true"></i> ${meta.label}
      </div>
      <div id="linhas-${bloco}">${linhas}</div>
      <button
        class="btn btn-ghost"
        style="margin-top:8px;font-size:11px;color:var(--gold-dark);border-color:var(--gold-light);"
        onclick="adicionarItemTemplate('${bloco}')">
        <i class="ti ti-plus" aria-hidden="true"></i> Adicionar tarefa
      </button>
    </div>`;
  }).join('');

  document.getElementById('editor-blocos').innerHTML = html;
}

// ── Adicionar item ao template ────────────────────────────
async function adicionarItemTemplate(bloco) {
  const novoTexto = prompt(`Nova tarefa no bloco "${bloco}":`);
  if (!novoTexto?.trim()) return;

  try {
    const { item } = await api(
      'POST',
      `/admin/usuario/${_templateUsuarioId}/template/item`,
      { bloco, tarefa: novoTexto.trim() }
    );

    // Insere a nova linha no DOM sem recarregar tudo
    const container = document.getElementById(`linhas-${bloco}`);
    const div = document.createElement('div');
    div.className = 'check-item';
    div.style.cssText = 'padding:6px 0;gap:6px;';
    div.dataset.itemId = item.id;
    div.dataset.bloco  = bloco;
    div.innerHTML = `
      <div style="width:6px;height:6px;border-radius:50%;background:var(--gold);flex-shrink:0;margin-top:8px;"></div>
      <input
        class="form-input"
        type="text"
        data-item-id="${item.id}"
        value="${item.tarefa.replace(/"/g, '&quot;')}"
        style="flex:1;font-size:12.5px;padding:6px 10px;"
      />
      <button
        class="act-btn"
        title="Remover item"
        style="flex-shrink:0;color:var(--red-text);border-color:#e8b4b4;"
        onclick="removerItemTemplate('${item.id}','${bloco}')">
        <i class="ti ti-x" aria-hidden="true"></i>
      </button>`;
    container.appendChild(div);
    showToast('Tarefa adicionada!');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Remover item do template ──────────────────────────────
async function removerItemTemplate(itemId, bloco) {
  if (!confirm('Remover esta tarefa do checklist?')) return;

  try {
    await api('DELETE', `/admin/usuario/${_templateUsuarioId}/template/item/${itemId}`);

    // Remove a linha do DOM
    const linha = document.querySelector(`[data-item-id="${itemId}"]`)?.closest('.check-item');
    if (linha) linha.remove();

    showToast('Tarefa removida.');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Salvar template (textos editados) ─────────────────────
async function salvarTemplate() {
  if (!_templateUsuarioId) return;

  const inputs = document.querySelectorAll('#editor-blocos input[data-item-id]');
  const itens  = Array.from(inputs).map(input => ({
    id:     input.dataset.itemId,
    tarefa: input.value.trim()
  }));

  if (itens.some(i => !i.tarefa)) {
    showToast('Nenhum item pode ficar em branco.', 'error');
    return;
  }

  const btn = document.querySelector('#editor-template .btn-primary');
  if (btn) { btn.disabled = true; btn.innerHTML = `<i class="ti ti-loader-2 spin"></i> Salvando...`; }

  try {
    await api('PUT', `/admin/usuario/${_templateUsuarioId}/template`, { itens });
    showToast('Checklist salvo com sucesso!');
    fecharEditorTemplate();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = `<i class="ti ti-check"></i> Salvar checklist`; }
  }
}

function fecharEditorTemplate() {
  const editor = document.getElementById('editor-template');
  if (editor) editor.style.display = 'none';
  _templateUsuarioId = null;
}

// ── Admin: criar usuário ──────────────────────────────────
async function salvarUsuario() {
  const nome  = document.getElementById('new-nome').value.trim();
  const email = document.getElementById('new-email').value.trim();
  const senha = document.getElementById('new-senha').value;
  const role  = document.getElementById('new-role').value;

  if (!nome || !email) { showToast('Nome e e-mail são obrigatórios.', 'error'); return; }
  if (!senha)          { showToast('Informe uma senha.', 'error'); return; }
  if (senha.length < 8){ showToast('A senha deve ter pelo menos 8 caracteres.', 'error'); return; }

  const btn = document.querySelector('#admin-form-card .btn-primary');
  if (btn) { btn.disabled = true; btn.innerHTML = `<i class="ti ti-loader-2 spin"></i> Salvando...`; }

  try {
    await api('POST', '/admin/usuario', { nome, email, senha, role });
    showToast(`Usuário ${nome} criado com sucesso!`);
    setTimeout(() => location.reload(), 1600);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = `<i class="ti ti-check"></i> <span id="btn-salvar-label">Criar usuário</span>`; }
  }
}

function cancelarEdicao() {
  ['new-nome','new-email','new-senha'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('new-role').value = 'funcionario';
  document.getElementById('new-senha').placeholder = 'Mínimo 8 caracteres';
  document.getElementById('form-card-titulo').textContent = 'Adicionar novo colaborador';
  document.getElementById('btn-salvar-label').textContent = 'Criar usuário';
  document.getElementById('btn-cancelar-edicao').style.display = 'none';
  document.getElementById('senha-hint').textContent = '(mínimo 8 caracteres)';
}

// ── Admin: toggle ativo / reset senha ────────────────────
async function toggleAtivo(usuarioId, novoAtivo) {
  if (!confirm(`Deseja ${novoAtivo?'reativar':'desativar'} este usuário?`)) return;
  try {
    await api('PATCH', `/admin/usuario/${usuarioId}/ativo`, { ativo: novoAtivo });
    showToast(`Usuário ${novoAtivo?'ativado':'desativado'} com sucesso!`);
    setTimeout(() => location.reload(), 1400);
  } catch (err) { showToast(err.message, 'error'); }
}

async function resetSenha(usuarioId, nome) {
  if (!confirm(`Enviar e-mail de redefinição de senha para ${nome}?`)) return;
  try {
    const { mensagem } = await api('POST', `/admin/usuario/${usuarioId}/reset-senha`);
    showToast(mensagem || 'E-mail enviado.');
  } catch (err) { showToast(err.message, 'error'); }
}