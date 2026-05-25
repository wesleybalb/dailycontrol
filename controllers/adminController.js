'use strict';

const usuarioModel = require('../models/usuarioModel');
const auditModel   = require('../models/auditModel');

// ─────────────────────────────────────────────────────────────
// GET /admin
// Renderiza o painel de gestão de usuários.
// ─────────────────────────────────────────────────────────────
async function showAdmin(req, res) {
  try {
    const usuarios = await usuarioModel.findAll();
    res.send(require('../views/admin')(req.usuario, usuarios));
  } catch (err) {
    console.error('[showAdmin]', err.message);
    res.status(500).send('<p>Erro ao carregar painel administrativo.</p>');
  }
}

// ─────────────────────────────────────────────────────────────
// POST /admin/usuario
// Cria um novo usuário (Auth + perfil em public.usuarios).
// ─────────────────────────────────────────────────────────────
async function criarUsuario(req, res) {
  const { nome, email, senha, role } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ ok: false, erro: 'Nome, e-mail e senha são obrigatórios.' });
  }

  if (senha.length < 8) {
    return res.status(400).json({ ok: false, erro: 'A senha deve ter pelo menos 8 caracteres.' });
  }

  const roleValido = ['admin', 'funcionario'].includes(role) ? role : 'funcionario';

  try {
    const usuario = await usuarioModel.create({ nome, email, senha, role: roleValido });

    await auditModel.log({
      usuarioId:       req.usuario.id,
      acao:            'usuario_criado',
      tabelaAlvo:      'usuarios',
      registroAlvoId:  usuario.id,
      payload:         { nome, email, role: roleValido },
      ip:              req.ip
    });

    res.status(201).json({ ok: true, usuario });

  } catch (err) {
    console.error('[criarUsuario]', err.message);
    const msg = err.message?.includes('already registered')
      ? 'Este e-mail já está cadastrado.'
      : 'Erro ao criar usuário.';
    res.status(400).json({ ok: false, erro: msg });
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH /admin/usuario/:id/ativo
// Ativa ou desativa um usuário.
// Admin não pode desativar a si mesmo.
// ─────────────────────────────────────────────────────────────
async function toggleAtivo(req, res) {
  const { id } = req.params;
  const { ativo } = req.body;

  if (id === req.usuario.id) {
    return res.status(400).json({ ok: false, erro: 'Você não pode desativar sua própria conta.' });
  }

  try {
    const atualizado = await usuarioModel.setAtivo(id, Boolean(ativo));

    await auditModel.log({
      usuarioId:       req.usuario.id,
      acao:            ativo ? 'usuario_ativado' : 'usuario_desativado',
      tabelaAlvo:      'usuarios',
      registroAlvoId:  id,
      ip:              req.ip
    });

    res.json({ ok: true, usuario: atualizado });

  } catch (err) {
    console.error('[toggleAtivo]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao atualizar status do usuário.' });
  }
}

// ─────────────────────────────────────────────────────────────
// POST /admin/usuario/:id/reset-senha
// Dispara e-mail de redefinição de senha via Supabase Auth.
// ─────────────────────────────────────────────────────────────
async function resetSenha(req, res) {
  const { id } = req.params;

  try {
    const usuario = await usuarioModel.findById(id);
    if (!usuario) return res.status(404).json({ ok: false, erro: 'Usuário não encontrado.' });

    await usuarioModel.sendPasswordReset(usuario.email);

    await auditModel.log({
      usuarioId:       req.usuario.id,
      acao:            'senha_reset_solicitado',
      tabelaAlvo:      'usuarios',
      registroAlvoId:  id,
      ip:              req.ip
    });

    res.json({ ok: true, mensagem: `E-mail de redefinição enviado para ${usuario.email}.` });

  } catch (err) {
    console.error('[resetSenha]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao enviar e-mail de redefinição.' });
  }
}

module.exports = { showAdmin, criarUsuario, toggleAtivo, resetSenha };
