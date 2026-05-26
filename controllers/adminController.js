'use strict';

const { supabaseAdmin } = require('../config/supabase');
const usuarioModel      = require('../models/usuarioModel');
const auditModel        = require('../models/auditModel');

// ─────────────────────────────────────────────────────────────
// GET /admin
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
      usuarioId:      req.usuario.id,
      acao:           'usuario_criado',
      tabelaAlvo:     'usuarios',
      registroAlvoId: usuario.id,
      payload:        { nome, email, role: roleValido },
      ip:             req.ip
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
// ─────────────────────────────────────────────────────────────
async function toggleAtivo(req, res) {
  const { id }   = req.params;
  const { ativo } = req.body;

  if (id === req.usuario.id) {
    return res.status(400).json({ ok: false, erro: 'Você não pode desativar sua própria conta.' });
  }

  try {
    const atualizado = await usuarioModel.setAtivo(id, Boolean(ativo));

    await auditModel.log({
      usuarioId:      req.usuario.id,
      acao:           ativo ? 'usuario_ativado' : 'usuario_desativado',
      tabelaAlvo:     'usuarios',
      registroAlvoId: id,
      ip:             req.ip
    });

    res.json({ ok: true, usuario: atualizado });

  } catch (err) {
    console.error('[toggleAtivo]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao atualizar status do usuário.' });
  }
}

// ─────────────────────────────────────────────────────────────
// POST /admin/usuario/:id/reset-senha
// ─────────────────────────────────────────────────────────────
async function resetSenha(req, res) {
  const { id } = req.params;

  try {
    const usuario = await usuarioModel.findById(id);
    if (!usuario) return res.status(404).json({ ok: false, erro: 'Usuário não encontrado.' });

    await usuarioModel.sendPasswordReset(usuario.email);

    await auditModel.log({
      usuarioId:      req.usuario.id,
      acao:           'senha_reset_solicitado',
      tabelaAlvo:     'usuarios',
      registroAlvoId: id,
      ip:             req.ip
    });

    res.json({ ok: true, mensagem: `E-mail de redefinição enviado para ${usuario.email}.` });

  } catch (err) {
    console.error('[resetSenha]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao enviar e-mail de redefinição.' });
  }
}

// ─────────────────────────────────────────────────────────────
// GET /admin/usuario/:id/template
// Retorna os itens do checklist template de um usuário.
// ─────────────────────────────────────────────────────────────
async function getTemplate(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('checklist_template')
      .select('id, bloco, ordem, tarefa')
      .eq('usuario_id', req.params.id)
      .order('bloco')
      .order('ordem');

    if (error) return res.status(500).json({ ok: false, erro: error.message });

    res.json({ ok: true, template: data });

  } catch (err) {
    console.error('[getTemplate]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao carregar template.' });
  }
}

// ─────────────────────────────────────────────────────────────
// PUT /admin/usuario/:id/template
// Salva as alterações do checklist template de um usuário.
// ─────────────────────────────────────────────────────────────
async function salvarTemplate(req, res) {
  try {
    const { itens } = req.body; // [{ id, tarefa }, ...]

    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ ok: false, erro: 'Nenhum item enviado.' });
    }

    const updates = itens.map(item =>
      supabaseAdmin
        .from('checklist_template')
        .update({ tarefa: item.tarefa.trim() })
        .eq('id', item.id)
        .eq('usuario_id', req.params.id)  // garante que o item pertence ao usuário
    );

    await Promise.all(updates);

    await auditModel.log({
      usuarioId:      req.usuario.id,
      acao:           'template_editado',
      tabelaAlvo:     'checklist_template',
      registroAlvoId: req.params.id,
      ip:             req.ip
    });

    res.json({ ok: true });

  } catch (err) {
    console.error('[salvarTemplate]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao salvar template.' });
  }
}

module.exports = {
  showAdmin,
  criarUsuario,
  toggleAtivo,
  resetSenha,
  getTemplate,
  salvarTemplate
};