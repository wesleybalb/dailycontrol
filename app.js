'use strict';

require('dotenv').config();

const express      = require('express');
const cookieSession = require('cookie-session');
const helmet       = require('helmet');
const path         = require('path');

// ── Validate env ──────────────────────────────────────────
const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY', 'SESSION_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[app] Variável obrigatória ausente: ${key}`);
    process.exit(1);
  }
}

const app = express();

// ── Security headers ──────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
      imgSrc:      ["'self'", 'data:', 'https://*.supabase.co'],
      connectSrc:  ["'self'", process.env.SUPABASE_URL],
    }
  }
}));

// ── Body parsers ──────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Sessão stateless via cookie assinado ──────────────────
// Funciona em ambientes serverless (Vercel) pois não precisa
// de armazenamento externo — o estado fica no cookie do cliente.
app.use(cookieSession({
  name:   'cea.sid',
  keys:   [process.env.SESSION_SECRET],
  maxAge: 8 * 60 * 60 * 1000,  // 8 horas
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  httpOnly: true,
}));

// Compatibilidade: cookie-session não tem .destroy() —
// adicionamos um shim para que o código existente funcione.
app.use((req, _res, next) => {
  if (!req.session.destroy) {
    req.session.destroy = (cb) => {
      req.session = null;
      if (cb) cb();
    };
  }
  next();
});

// ── Trust proxy (Vercel usa proxy reverso) ────────────────
app.set('trust proxy', 1);

// ── Static files ──────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ────────────────────────────────────────────────
app.use('/', require('./routes/authRoutes'));
app.use('/', require('./routes/homeRoutes'));
app.use('/', require('./routes/registroRoutes'));
app.use('/', require('./routes/checklistRoutes'));
app.use('/', require('./routes/adminRoutes'));

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).send(`
    <html><body style="font-family:sans-serif;padding:40px;text-align:center;">
      <h2>Página não encontrada</h2><a href="/">Voltar ao painel</a>
    </body></html>`);
});

// ── Error handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[app error]', err.stack);
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(400).json({ ok: false, erro: 'Arquivo muito grande. Máximo: 4 MB.' });
  if (err.message?.includes('Tipo de arquivo'))
    return res.status(400).json({ ok: false, erro: err.message });
  res.status(500).json({ ok: false, erro: 'Erro interno do servidor.' });
});

// ── Exporta para Vercel (serverless) E roda localmente ───
// No Vercel: api/index.js importa este módulo e o expõe.
// Localmente: node app.js ou npm run dev sobe o servidor.
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n🏛  Coelho & Araújo — Daily Control`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}\n`);

    // Cron local: bloqueia rascunhos expirados à meia-noite
    const registroModel = require('./models/registroModel');
    (function agendar() {
      const agora  = new Date();
      const amanha = new Date(agora);
      amanha.setDate(amanha.getDate() + 1);
      amanha.setHours(0, 1, 0, 0);
      setTimeout(async () => {
        try {
          await registroModel.bloquearExpirados();
          console.log('[cron] Rascunhos expirados bloqueados.');
        } catch (e) {
          console.error('[cron]', e.message);
        }
        agendar();
      }, amanha - agora);
    })();
  });
}

module.exports = app;
