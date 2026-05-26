'use strict';

const { supabaseAdmin } = require('../config/supabase');
const usuarioModel      = require('../models/usuarioModel');
const auditModel        = require('../models/auditModel');

async function showAdmin(req, res) {
  try {
    const usuarios = await usuarioModel.findAll();
    res.send(require('../views/admin')(req.usuario, usuarios));
  } catch (err) {
    console.error('[showAdmin]', err.message);
    res.status(500).send('<p>Erro ao carregar painel administrativo.</p>');
  }
}

async function criarUsuario(req, res) {
  const { nome, email, senha, role } = req.body;

  if (!nome || !email || !senha)
    return res.status(400).json({ ok: false, erro: 'Nome, e-mail e senha são obrigatórios.' });

  if (senha.length < 8)
    return res.status(400).json({ ok: false, erro: 'A senha deve ter pelo menos 8 caracteres.' });

  const roleValido = ['admin', 'funcionario'].includes(role) ? role : 'funcionario';

  try {
    const usuario = await usuarioModel.create({ nome, email, senha, role: roleValido });
    await auditModel.log({
      usuarioId: req.usuario.id, acao: 'usuario_criado',
      tabelaAlvo: 'usuarios', registroAlvoId: usuario.id,
      payload: { nome, email, role: roleValido }, ip: req.ip
    });
    res.status(201).json({ ok: true, usuario });
  } catch (err) {
    console.error('[criarUsuario]', err.message);
    const msg = err.message?.includes('already registered')
      ? 'Este e-mail já está cadastrado.' : 'Erro ao criar usuário.';
    res.status(400).json({ ok: false, erro: msg });
  }
}

async function toggleAtivo(req, res) {
  const { id } = req.params;
  const { ativo } = req.body;

  if (id === req.usuario.id)
    return res.status(400).json({ ok: false, erro: 'Você não pode desativar sua própria conta.' });

  try {
    const atualizado = await usuarioModel.setAtivo(id, Boolean(ativo));
    await auditModel.log({
      usuarioId: req.usuario.id,
      acao: ativo ? 'usuario_ativado' : 'usuario_desativado',
      tabelaAlvo: 'usuarios', registroAlvoId: id, ip: req.ip
    });
    res.json({ ok: true, usuario: atualizado });
  } catch (err) {
    console.error('[toggleAtivo]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao atualizar status do usuário.' });
  }
}

async function resetSenha(req, res) {
  const { id } = req.params;
  try {
    const usuario = await usuarioModel.findById(id);
    if (!usuario)
      return res.status(404).json({ ok: false, erro: 'Usuário não encontrado.' });
    await usuarioModel.sendPasswordReset(usuario.email);
    await auditModel.log({
      usuarioId: req.usuario.id, acao: 'senha_reset_solicitado',
      tabelaAlvo: 'usuarios', registroAlvoId: id, ip: req.ip
    });
    res.json({ ok: true, mensagem: `E-mail de redefinição enviado para ${usuario.email}.` });
  } catch (err) {
    console.error('[resetSenha]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao enviar e-mail de redefinição.' });
  }
}

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

async function salvarTemplate(req, res) {
  try {
    const { itens } = req.body;
    if (!Array.isArray(itens) || itens.length === 0)
      return res.status(400).json({ ok: false, erro: 'Nenhum item enviado.' });

    const updates = itens.map(item =>
      supabaseAdmin.from('checklist_template')
        .update({ tarefa: item.tarefa.trim() })
        .eq('id', item.id)
        .eq('usuario_id', req.params.id)
    );
    await Promise.all(updates);

    await auditModel.log({
      usuarioId: req.usuario.id, acao: 'template_editado',
      tabelaAlvo: 'checklist_template',
      registroAlvoId: req.params.id, ip: req.ip
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[salvarTemplate]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao salvar template.' });
  }
}

// POST /admin/usuario/:id/template/item
// Adiciona um novo item ao template do usuário no bloco especificado.
async function adicionarItemTemplate(req, res) {
  try {
    const { bloco, tarefa } = req.body;
    const usuarioId = req.params.id;

    if (!['inicio', 'meio', 'final'].includes(bloco))
      return res.status(400).json({ ok: false, erro: 'Bloco inválido.' });

    if (!tarefa?.trim())
      return res.status(400).json({ ok: false, erro: 'O texto da tarefa é obrigatório.' });

    // Descobre a próxima ordem disponível no bloco
    const { data: existentes } = await supabaseAdmin
      .from('checklist_template')
      .select('ordem')
      .eq('usuario_id', usuarioId)
      .eq('bloco', bloco)
      .order('ordem', { ascending: false })
      .limit(1);

    const proximaOrdem = existentes?.length > 0 ? existentes[0].ordem + 1 : 1;

    const { data, error } = await supabaseAdmin
      .from('checklist_template')
      .insert({ usuario_id: usuarioId, bloco, ordem: proximaOrdem, tarefa: tarefa.trim() })
      .select('id, bloco, ordem, tarefa')
      .single();

    if (error) return res.status(500).json({ ok: false, erro: error.message });

    await auditModel.log({
      usuarioId: req.usuario.id, acao: 'template_item_adicionado',
      tabelaAlvo: 'checklist_template',
      registroAlvoId: usuarioId, ip: req.ip
    });

    res.status(201).json({ ok: true, item: data });
  } catch (err) {
    console.error('[adicionarItemTemplate]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao adicionar item.' });
  }
}

// DELETE /admin/usuario/:id/template/item/:itemId
// Remove um item do template. Não permite remover se restar menos de 1 item no bloco.
async function removerItemTemplate(req, res) {
  try {
    const { id: usuarioId, itemId } = req.params;

    // Verifica quantos itens restam no bloco antes de remover
    const { data: item } = await supabaseAdmin
      .from('checklist_template')
      .select('bloco')
      .eq('id', itemId)
      .eq('usuario_id', usuarioId)
      .single();

    if (!item)
      return res.status(404).json({ ok: false, erro: 'Item não encontrado.' });

    const { count } = await supabaseAdmin
      .from('checklist_template')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', usuarioId)
      .eq('bloco', item.bloco);

    if (count <= 1)
      return res.status(400).json({ ok: false, erro: 'O bloco precisa ter pelo menos 1 item.' });

    const { error } = await supabaseAdmin
      .from('checklist_template')
      .delete()
      .eq('id', itemId)
      .eq('usuario_id', usuarioId);

    if (error) return res.status(500).json({ ok: false, erro: error.message });

    await auditModel.log({
      usuarioId: req.usuario.id, acao: 'template_item_removido',
      tabelaAlvo: 'checklist_template',
      registroAlvoId: usuarioId, ip: req.ip
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[removerItemTemplate]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao remover item.' });
  }
}

module.exports = {
  showAdmin,
  criarUsuario,
  toggleAtivo,
  resetSenha,
  getTemplate,
  salvarTemplate,
  adicionarItemTemplate,
  removerItemTemplate
};