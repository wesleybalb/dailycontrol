'use strict';

const usuarioModel  = require('../models/usuarioModel');
const registroModel = require('../models/registroModel');

// ─────────────────────────────────────────────────────────────
// GET /
// ─────────────────────────────────────────────────────────────
async function showHome(req, res) {
  try {
    const [usuarios, registros, stats] = await Promise.all([
      usuarioModel.findAll(),
      registroModel.findByUsuario(req.usuario.id, 10),
      registroModel.getEstatisticas(req.usuario.id)
    ]);

    const hoje = new Date().toISOString().split('T')[0];
    const registroHoje = registros.find(r => r.data_registro === hoje) || null;

    // Mensagem de erro de acesso (ex: não-admin tentou /admin)
    const erroAcesso = req.query.erro === 'acesso_negado'
      ? 'Você não tem permissão para acessar esta página.'
      : null;

    res.send(require('../views/home')(
      req.usuario,
      usuarios.filter(u => u.ativo),
      registros,
      registroHoje,
      stats,
      erroAcesso
    ));

  } catch (err) {
    console.error('[showHome]', err.message);
    res.status(500).send(`
      <html><body style="font-family:sans-serif;padding:40px;text-align:center;">
        <h3>Erro ao carregar o painel.</h3>
        <a href="/">Tentar novamente</a>
      </body></html>
    `);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/tab/:usuarioId
// Dados de uma tab (JSON) para carregamento dinâmico.
// ─────────────────────────────────────────────────────────────
async function getTabData(req, res) {
  try {
    const { usuarioId } = req.params;
    const { inicio, fim } = req.query;

    const [registros, stats] = await Promise.all([
      inicio && fim
        ? registroModel.findByPeriodo(usuarioId, inicio, fim)
        : registroModel.findByUsuario(usuarioId, 10),
      registroModel.getEstatisticas(usuarioId)
    ]);

    res.json({ ok: true, registros, stats });

  } catch (err) {
    console.error('[getTabData]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao carregar dados.' });
  }
}

module.exports = { showHome, getTabData };
