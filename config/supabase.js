'use strict';

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY    = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    '[config/supabase] Variáveis SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_KEY são obrigatórias.'
  );
}

// ── Client anônimo ────────────────────────────────────────────
// Usado para autenticação de usuários (login/logout).
// Respeita as políticas RLS definidas no banco.
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

// ── Client de serviço (admin) ─────────────────────────────────
// Usado APENAS no backend para operações privilegiadas:
// criar usuários, gravar audit_logs, consultas cross-user.
// NUNCA exponha este client ou sua chave ao frontend.
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

module.exports = { supabase, supabaseAdmin };
