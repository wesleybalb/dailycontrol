'use strict';

const multer         = require('multer');
const { supabaseAdmin } = require('../config/supabase');
const checklistModel    = require('../models/checklistModel');
const auditModel        = require('../models/auditModel');

// ─────────────────────────────────────────────────────────────
// Multer — armazena o upload em memória (buffer).
// O arquivo é repassado ao Supabase Storage, não ao disco.
// ─────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 4 * 1024 * 1024 },  // 4 MB — limite Vercel
  fileFilter(_req, file, cb) {
    const permitidos = [
      'image/jpeg', 'image/png', 'image/webp',
      'image/gif',  'application/pdf'
    ];
    if (permitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use imagem ou PDF.'));
    }
  }
});

// Middleware de upload para usar nas rotas
const uploadMiddleware = upload.single('evidencia');

// ─────────────────────────────────────────────────────────────
// PATCH /checklist/:itemId/toggle
// Marca ou desmarca um item. Não lida com evidência aqui.
// ─────────────────────────────────────────────────────────────
async function toggleItem(req, res) {
  try {
    const { itemId }   = req.params;
    const { concluido } = req.body;

    // Valida que o item pertence a um registro editável do usuário
    const item = await checklistModel.findById(itemId);
    if (!item) return res.status(404).json({ ok: false, erro: 'Item não encontrado.' });

    const reg = item.registros;
    if (reg.usuario_id !== req.usuario.id) {
      return res.status(403).json({ ok: false, erro: 'Acesso negado.' });
    }

    const hoje = new Date().toISOString().split('T')[0];
    if (reg.status !== 'rascunho' || reg.bloqueado_em || reg.data_registro !== hoje) {
      return res.status(403).json({ ok: false, erro: 'Registro não está editável.' });
    }

    const atualizado = await checklistModel.toggleItem(itemId, Boolean(concluido));
    res.json({ ok: true, item: atualizado });

  } catch (err) {
    console.error('[toggleItem]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao atualizar item.' });
  }
}

// ─────────────────────────────────────────────────────────────
// POST /checklist/:itemId/evidencia
// Faz upload de um arquivo para o Supabase Storage e vincula
// a URL ao item do checklist.
// Path no Storage: evidencias/{usuario_id}/{registro_id}/{uuid}.ext
// ─────────────────────────────────────────────────────────────
async function uploadEvidencia(req, res) {
  try {
    const { itemId } = req.params;

    if (!req.file) {
      return res.status(400).json({ ok: false, erro: 'Nenhum arquivo enviado.' });
    }

    // Valida ownership e editabilidade
    const item = await checklistModel.findById(itemId);
    if (!item) return res.status(404).json({ ok: false, erro: 'Item não encontrado.' });

    const reg  = item.registros;
    const hoje = new Date().toISOString().split('T')[0];

    if (reg.usuario_id !== req.usuario.id) {
      return res.status(403).json({ ok: false, erro: 'Acesso negado.' });
    }

    if (reg.status !== 'rascunho' || reg.bloqueado_em || reg.data_registro !== hoje) {
      return res.status(403).json({ ok: false, erro: 'Registro não está editável.' });
    }

    // Monta o path único no Storage
    const ext      = req.file.originalname.split('.').pop().toLowerCase();
    const filename = `${Date.now()}-${itemId}.${ext}`;
    const path     = `${req.usuario.id}/${item.registro_id}/${filename}`;

    // Upload para o bucket 'evidencias'
    const { error: uploadError } = await supabaseAdmin.storage
      .from('evidencias')
      .upload(path, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert:      false
      });

    if (uploadError) throw uploadError;

    // Gera URL assinada (válida por 1 ano — revisitar conforme política)
    const { data: signedData, error: signError } = await supabaseAdmin.storage
      .from('evidencias')
      .createSignedUrl(path, 60 * 60 * 24 * 365);

    if (signError) throw signError;

    // Persiste a URL no item do checklist
    const atualizado = await checklistModel.setEvidencia(itemId, {
      evidencia_url:  signedData.signedUrl,
      evidencia_nome: req.file.originalname
    });

    await auditModel.log({
      usuarioId:       req.usuario.id,
      acao:            'evidencia_uploaded',
      tabelaAlvo:      'checklist_itens',
      registroAlvoId:  itemId,
      payload:         { path, nome: req.file.originalname },
      ip:              req.ip
    });

    res.json({ ok: true, item: atualizado });

  } catch (err) {
    console.error('[uploadEvidencia]', err.message);
    res.status(500).json({ ok: false, erro: err.message || 'Erro no upload.' });
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /checklist/:itemId/evidencia
// Remove o arquivo do Storage e desmarca o item.
// ─────────────────────────────────────────────────────────────
async function removeEvidencia(req, res) {
  try {
    const { itemId } = req.params;
    const item = await checklistModel.findById(itemId);

    if (!item) return res.status(404).json({ ok: false, erro: 'Item não encontrado.' });

    const reg  = item.registros;
    const hoje = new Date().toISOString().split('T')[0];

    if (reg.usuario_id !== req.usuario.id) {
      return res.status(403).json({ ok: false, erro: 'Acesso negado.' });
    }

    if (reg.status !== 'rascunho' || reg.bloqueado_em || reg.data_registro !== hoje) {
      return res.status(403).json({ ok: false, erro: 'Registro não está editável.' });
    }

    // Remove do Storage (extrai o path da URL assinada)
    if (item.evidencia_url) {
      try {
        const url      = new URL(item.evidencia_url);
        const pathPart = url.pathname.split('/object/sign/evidencias/')[1]?.split('?')[0];
        if (pathPart) {
          await supabaseAdmin.storage.from('evidencias').remove([decodeURIComponent(pathPart)]);
        }
      } catch (_) {}
    }

    const atualizado = await checklistModel.removeEvidencia(itemId);
    res.json({ ok: true, item: atualizado });

  } catch (err) {
    console.error('[removeEvidencia]', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao remover evidência.' });
  }
}

module.exports = { uploadMiddleware, toggleItem, uploadEvidencia, removeEvidencia };
