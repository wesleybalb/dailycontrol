'use strict';

const { supabaseAdmin } = require('../config/supabase');

// ─────────────────────────────────────────────────────────────
// Retorna os N registros mais recentes de um usuário.
// Inclui contagem de itens e de itens concluídos (via join).
// ─────────────────────────────────────────────────────────────
async function findByUsuario(usuarioId, limit = 10) {
  const { data, error } = await supabaseAdmin
    .from('registros')
    .select(`
      id,
      data_registro,
      status,
      observacoes,
      created_at,
      fechado_em,
      bloqueado_em,
      checklist_itens ( id, concluido )
    `)
    .eq('usuario_id', usuarioId)
    .order('data_registro', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map(enrich);
}

// ─────────────────────────────────────────────────────────────
// Busca registros de um usuário em um intervalo de datas.
// ─────────────────────────────────────────────────────────────
async function findByPeriodo(usuarioId, dataInicio, dataFim) {
  const { data, error } = await supabaseAdmin
    .from('registros')
    .select(`
      id,
      data_registro,
      status,
      observacoes,
      created_at,
      fechado_em,
      bloqueado_em,
      checklist_itens ( id, concluido )
    `)
    .eq('usuario_id', usuarioId)
    .gte('data_registro', dataInicio)
    .lte('data_registro', dataFim)
    .order('data_registro', { ascending: false });

  if (error) throw error;
  return (data || []).map(enrich);
}

// ─────────────────────────────────────────────────────────────
// Busca um registro específico com todos os seus itens.
// ─────────────────────────────────────────────────────────────
async function findById(id) {
  const { data, error } = await supabaseAdmin
    .from('registros')
    .select(`
      id,
      usuario_id,
      data_registro,
      status,
      observacoes,
      created_at,
      fechado_em,
      bloqueado_em,
      usuarios ( nome ),
      checklist_itens (
        id, bloco, ordem, tarefa,
        concluido, evidencia_url, evidencia_nome, concluido_em
      )
    `)
    .eq('id', id)
    .single();

  if (error) return null;

  // Flatten usuario nome into registro
  data.usuario_nome = data.usuarios?.nome || '';

  // Ordena os itens por bloco e ordem
  if (data.checklist_itens) {
    const ordemBlocos = { inicio: 1, meio: 2, final: 3 };
    data.checklist_itens.sort((a, b) => {
      const blocoOrd = ordemBlocos[a.bloco] - ordemBlocos[b.bloco];
      return blocoOrd !== 0 ? blocoOrd : a.ordem - b.ordem;
    });
  }

  return enrich(data);
}

// ─────────────────────────────────────────────────────────────
// Busca o registro de hoje de um usuário (se existir).
// ─────────────────────────────────────────────────────────────
async function findHoje(usuarioId) {
  const hoje = new Date().toISOString().split('T')[0];

  const { data, error } = await supabaseAdmin
    .from('registros')
    .select(`
      id, usuario_id, data_registro, status,
      observacoes, created_at, fechado_em, bloqueado_em,
      checklist_itens (
        id, bloco, ordem, tarefa,
        concluido, evidencia_url, evidencia_nome, concluido_em
      )
    `)
    .eq('usuario_id', usuarioId)
    .eq('data_registro', hoje)
    .single();

  if (error) return null;

  if (data?.checklist_itens) {
    const ordemBlocos = { inicio: 1, meio: 2, final: 3 };
    data.checklist_itens.sort((a, b) => {
      const blocoOrd = ordemBlocos[a.bloco] - ordemBlocos[b.bloco];
      return blocoOrd !== 0 ? blocoOrd : a.ordem - b.ordem;
    });
  }

  return enrich(data);
}

// ─────────────────────────────────────────────────────────────
// Cria um novo registro para hoje e popula os 16 itens
// a partir do checklist_template.
// ─────────────────────────────────────────────────────────────
async function create(usuarioId) {
  const hoje = new Date().toISOString().split('T')[0];

  // 1. Cria o registro
  const { data: registro, error: regError } = await supabaseAdmin
    .from('registros')
    .insert({ usuario_id: usuarioId, data_registro: hoje })
    .select('id, usuario_id, data_registro, status, created_at')
    .single();

  if (regError) throw regError;

  // 2. Busca o template dos 16 itens
  const { data: template, error: tplError } = await supabaseAdmin
    .from('checklist_template')
    .select('bloco, ordem, tarefa')
    .order('bloco')
    .order('ordem');

  if (tplError) throw tplError;

  // 3. Insere os itens vinculados ao registro
  const itens = template.map(t => ({
    registro_id: registro.id,
    bloco:       t.bloco,
    ordem:       t.ordem,
    tarefa:      t.tarefa,
    concluido:   false
  }));

  const { error: itensError } = await supabaseAdmin
    .from('checklist_itens')
    .insert(itens);

  if (itensError) throw itensError;

  return findById(registro.id);
}

// ─────────────────────────────────────────────────────────────
// Salva as observações (rascunho — não fecha o registro).
// ─────────────────────────────────────────────────────────────
async function saveRascunho(id, observacoes) {
  const { data, error } = await supabaseAdmin
    .from('registros')
    .update({ observacoes })
    .eq('id', id)
    .eq('status', 'rascunho')
    .select('id, status, observacoes')
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// Fecha o registro. O trigger no banco preenche fechado_em.
// ─────────────────────────────────────────────────────────────
async function fechar(id, observacoes) {
  const { data, error } = await supabaseAdmin
    .from('registros')
    .update({ status: 'fechado', observacoes })
    .eq('id', id)
    .eq('status', 'rascunho')
    .select('id, status, fechado_em')
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// Bloqueia rascunhos de dias anteriores (chamada pelo cron).
// ─────────────────────────────────────────────────────────────
async function bloquearExpirados() {
  const hoje = new Date().toISOString().split('T')[0];

  const { error } = await supabaseAdmin
    .from('registros')
    .update({ bloqueado_em: new Date().toISOString() })
    .eq('status', 'rascunho')
    .lt('data_registro', hoje)
    .is('bloqueado_em', null);

  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────
// Estatísticas resumidas de um usuário no mês atual.
// ─────────────────────────────────────────────────────────────
async function getEstatisticas(usuarioId) {
  const hoje      = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
                      .toISOString().split('T')[0];
  const fimMes    = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
                      .toISOString().split('T')[0];

  const { data, error } = await supabaseAdmin
    .from('registros')
    .select('id, status, checklist_itens ( concluido )')
    .eq('usuario_id', usuarioId)
    .gte('data_registro', inicioMes)
    .lte('data_registro', fimMes);

  if (error) throw error;

  const total     = data.length;
  let   somaRate  = 0;

  for (const r of data) {
    const itens     = r.checklist_itens || [];
    const concluidos = itens.filter(i => i.concluido).length;
    somaRate += itens.length > 0 ? (concluidos / itens.length) * 100 : 0;
  }

  return {
    registrosNoMes: total,
    taxaConclusao:  total > 0 ? Math.round(somaRate / total) : 0
  };
}

// ─────────────────────────────────────────────────────────────
// Enriquece um registro com contagens calculadas.
// ─────────────────────────────────────────────────────────────
function enrich(registro) {
  if (!registro) return null;
  const itens      = registro.checklist_itens || [];
  const total      = itens.length;
  const concluidos = itens.filter(i => i.concluido).length;

  return {
    ...registro,
    total_itens:      total,
    itens_concluidos: concluidos,
    percentual:       total > 0 ? Math.round((concluidos / total) * 100) : 0,
    editavel:         registro.status === 'rascunho' &&
                      registro.bloqueado_em === null &&
                      registro.data_registro === new Date().toISOString().split('T')[0]
  };
}

module.exports = {
  findByUsuario,
  findByPeriodo,
  findById,
  findHoje,
  create,
  saveRascunho,
  fechar,
  bloquearExpirados,
  getEstatisticas
};
