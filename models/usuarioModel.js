'use strict';

const { supabaseAdmin } = require('../config/supabase');

// ─────────────────────────────────────────────────────────────
// Busca todos os usuários ativos ordenados por nome.
// Usado para montar as tabs na home.
// ─────────────────────────────────────────────────────────────
async function findAll() {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('id, nome, email, role, ativo, created_at')
    .order('nome');

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// Busca um usuário pelo auth_user_id (UUID do Supabase Auth).
// Usado nos middlewares de autenticação e autorização.
// ─────────────────────────────────────────────────────────────
async function findByAuthId(authUserId) {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('id, nome, email, role, ativo')
    .eq('auth_user_id', authUserId)
    .single();

  if (error) return null;
  return data;
}

// ─────────────────────────────────────────────────────────────
// Busca um usuário pelo ID interno (UUID da tabela usuarios).
// ─────────────────────────────────────────────────────────────
async function findById(id) {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('id, nome, email, role, ativo, created_at')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

// ─────────────────────────────────────────────────────────────
// Cria uma conta no Supabase Auth e o perfil em public.usuarios.
// Usado pelo painel admin ao cadastrar um novo colaborador.
// ─────────────────────────────────────────────────────────────
async function create({ nome, email, senha, role = 'funcionario' }) {
  // 1. Cria a conta de autenticação
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true   // confirma o e-mail automaticamente
    });

  if (authError) throw authError;

  // 2. Cria o perfil na tabela public.usuarios
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .insert({
      auth_user_id: authData.user.id,
      nome,
      email,
      role
    })
    .select('id, nome, email, role, ativo')
    .single();

  if (error) {
    // Rollback: remove o usuário do Auth se o insert falhar
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    throw error;
  }

  return data;
}

// ─────────────────────────────────────────────────────────────
// Ativa ou desativa um usuário (soft delete).
// O bloqueio real acontece no middleware de autenticação,
// que verifica o campo `ativo` antes de liberar o acesso.
// ─────────────────────────────────────────────────────────────
async function setAtivo(id, ativo) {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .update({ ativo })
    .eq('id', id)
    .select('id, nome, ativo')
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// Envia e-mail de redefinição de senha via Supabase Auth.
// ─────────────────────────────────────────────────────────────
async function sendPasswordReset(email) {
  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

module.exports = { findAll, findByAuthId, findById, create, setAtivo, sendPasswordReset };
