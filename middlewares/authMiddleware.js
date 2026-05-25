'use strict';

const { supabase }   = require('../config/supabase');
const usuarioModel   = require('../models/usuarioModel');

// ─────────────────────────────────────────────────────────────
// requireAuth
// Verifica sessão. Injeta req.usuario.
// Redireciona para /login se não autenticado.
// ─────────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  try {
    const token = req.session?.access_token;

    if (!token) {
      return res.redirect('/login');
    }

    // Valida o token com o Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      req.session.destroy(() => {});
      return res.redirect('/login?erro=sessao_expirada');
    }

    // Busca perfil na tabela pública
    const perfil = await usuarioModel.findByAuthId(user.id);

    if (!perfil) {
      req.session.destroy(() => {});
      return res.redirect('/login');
    }

    if (!perfil.ativo) {
      req.session.destroy(() => {});
      return res.redirect('/login?erro=conta_inativa');
    }

    req.usuario = perfil;
    next();

  } catch (err) {
    console.error('[requireAuth]', err.message);
    res.redirect('/login');
  }
}

// ─────────────────────────────────────────────────────────────
// requireAdmin
// Usado APÓS requireAuth. Redireciona com 403 para não-admins.
// Retorna JSON para rotas de API, HTML redirect para rotas de página.
// ─────────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.usuario?.role !== 'admin') {
    // Detecta se é uma requisição de API (Accept: application/json ou /api/)
    const isApi = req.path.startsWith('/api/') ||
                  req.headers['content-type']?.includes('application/json') ||
                  req.xhr;
    if (isApi) {
      return res.status(403).json({ ok: false, erro: 'Acesso restrito a administradores.' });
    }
    // Para páginas HTML, redireciona para home com mensagem
    return res.redirect('/?erro=acesso_negado');
  }
  next();
}

// ─────────────────────────────────────────────────────────────
// requireRegistroEditavel
// Verifica ownership + editabilidade do registro.
// ─────────────────────────────────────────────────────────────
const registroModel = require('../models/registroModel');

async function requireRegistroEditavel(req, res, next) {
  try {
    const registroId = req.params.id || req.body.registro_id;
    const registro   = await registroModel.findById(registroId);

    if (!registro) {
      return res.status(404).json({ ok: false, erro: 'Registro não encontrado.' });
    }

    if (registro.usuario_id !== req.usuario.id) {
      return res.status(403).json({ ok: false, erro: 'Acesso negado a este registro.' });
    }

    if (!registro.editavel) {
      return res.status(403).json({
        ok: false,
        erro: 'Este registro não pode ser editado. Ele está fechado, bloqueado ou é de outro dia.'
      });
    }

    req.registro = registro;
    next();

  } catch (err) {
    console.error('[requireRegistroEditavel]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao verificar permissão do registro.' });
  }
}

module.exports = { requireAuth, requireAdmin, requireRegistroEditavel };
