'use strict';

const registroModel = require('../models/registroModel');
const auditModel    = require('../models/auditModel');

// ─────────────────────────────────────────────────────────────
// POST /registro/novo
// Cria um novo registro para hoje (com os 16 itens do template).
// Retorna erro se já existir registro para o dia.
// ─────────────────────────────────────────────────────────────
async function criar(req, res) {
  try {
    const existente = await registroModel.findHoje(req.usuario.id);

    if (existente) {
      return res.status(409).json({
        ok:    false,
        erro:  'Já existe um registro para hoje.',
        id:    existente.id,
        status: existente.status
      });
    }

    const registro = await registroModel.create(req.usuario.id);

    await auditModel.log({
      usuarioId:       req.usuario.id,
      acao:            'registro_criado',
      tabelaAlvo:      'registros',
      registroAlvoId:  registro.id,
      ip:              req.ip
    });

    res.status(201).json({ ok: true, registro });

  } catch (err) {
    console.error('[criar registro]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao criar registro.' });
  }
}

// ─────────────────────────────────────────────────────────────
// GET /registro/:id
// Retorna o registro completo com todos os itens do checklist.
// ─────────────────────────────────────────────────────────────
async function buscar(req, res) {
  try {
    const registro = await registroModel.findById(req.params.id);

    if (!registro) {
      return res.status(404).json({ ok: false, erro: 'Registro não encontrado.' });
    }

    res.json({ ok: true, registro });

  } catch (err) {
    console.error('[buscar registro]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao buscar registro.' });
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH /registro/:id/rascunho
// Salva observações sem fechar o registro.
// requireRegistroEditavel já validou ownership e editabilidade.
// ─────────────────────────────────────────────────────────────
async function salvarRascunho(req, res) {
  try {
    const { observacoes } = req.body;
    const atualizado = await registroModel.saveRascunho(req.params.id, observacoes || '');

    res.json({ ok: true, registro: atualizado });

  } catch (err) {
    console.error('[salvarRascunho]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao salvar rascunho.' });
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH /registro/:id/fechar
// Fecha o registro (status → 'fechado'). Irreversível.
// ─────────────────────────────────────────────────────────────
async function fechar(req, res) {
  try {
    const { observacoes } = req.body;
    const fechado = await registroModel.fechar(req.params.id, observacoes || '');

    await auditModel.log({
      usuarioId:       req.usuario.id,
      acao:            'registro_fechado',
      tabelaAlvo:      'registros',
      registroAlvoId:  req.params.id,
      payload:         { fechado_em: fechado.fechado_em },
      ip:              req.ip
    });

    res.json({ ok: true, registro: fechado });

  } catch (err) {
    console.error('[fechar registro]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao fechar registro.' });
  }
}

module.exports = { criar, buscar, salvarRascunho, fechar };
