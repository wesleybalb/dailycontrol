'use strict';

const { supabaseAdmin } = require('../config/supabase');

// ─────────────────────────────────────────────────────────────
// Grava uma entrada de auditoria. Nunca lança exceção —
// falha silenciosamente para não interromper o fluxo principal.
// ─────────────────────────────────────────────────────────────
async function log({ usuarioId, acao, tabelaAlvo, registroAlvoId, payload, ip }) {
  try {
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        usuario_id:       usuarioId   || null,
        acao,
        tabela_alvo:      tabelaAlvo  || null,
        registro_alvo_id: registroAlvoId || null,
        payload:          payload     || null,
        ip:               ip          || null
      });
  } catch (err) {
    console.error('[audit_log] Falha ao gravar log:', err.message);
  }
}

module.exports = { log };
