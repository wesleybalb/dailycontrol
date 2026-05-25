'use strict';

const { supabaseAdmin } = require('../config/supabase');

// ─────────────────────────────────────────────────────────────
// Marca ou desmarca um item do checklist.
// A trigger no banco cuida de preencher/limpar concluido_em.
// ─────────────────────────────────────────────────────────────
async function toggleItem(itemId, concluido) {
  const update = { concluido };

  // Se estiver desmarcando, remove também a evidência
  if (!concluido) {
    update.evidencia_url  = null;
    update.evidencia_nome = null;
  }

  const { data, error } = await supabaseAdmin
    .from('checklist_itens')
    .update(update)
    .eq('id', itemId)
    .select('id, concluido, evidencia_url, evidencia_nome, concluido_em')
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// Salva a URL e o nome do arquivo de evidência em um item.
// Chamado pelo checklistController após o upload no Storage.
// ─────────────────────────────────────────────────────────────
async function setEvidencia(itemId, { evidencia_url, evidencia_nome }) {
  const { data, error } = await supabaseAdmin
    .from('checklist_itens')
    .update({
      concluido:     true,
      evidencia_url,
      evidencia_nome
    })
    .eq('id', itemId)
    .select('id, concluido, evidencia_url, evidencia_nome')
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// Remove a evidência de um item e desmarca o checkbox.
// O arquivo no Storage é deletado pelo controller antes desta call.
// ─────────────────────────────────────────────────────────────
async function removeEvidencia(itemId) {
  const { data, error } = await supabaseAdmin
    .from('checklist_itens')
    .update({
      concluido:     false,
      evidencia_url:  null,
      evidencia_nome: null,
      concluido_em:   null
    })
    .eq('id', itemId)
    .select('id, concluido')
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// Busca um item pelo ID (para validar ownership no controller).
// ─────────────────────────────────────────────────────────────
async function findById(itemId) {
  const { data, error } = await supabaseAdmin
    .from('checklist_itens')
    .select(`
      id, bloco, ordem, tarefa,
      concluido, evidencia_url, evidencia_nome, concluido_em,
      registro_id,
      registros ( usuario_id, status, data_registro, bloqueado_em )
    `)
    .eq('id', itemId)
    .single();

  if (error) return null;
  return data;
}

module.exports = { toggleItem, setEvidencia, removeEvidencia, findById };
