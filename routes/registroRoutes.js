'use strict';

const express      = require('express');
const router       = express.Router();
const regCtrl      = require('../controllers/registroController');
const { requireAuth, requireRegistroEditavel } = require('../middlewares/authMiddleware');

router.post  ('/registro/novo',           requireAuth,                              regCtrl.criar);
router.get   ('/registro/:id',            requireAuth,                              regCtrl.buscar);
router.patch ('/registro/:id/rascunho',   requireAuth, requireRegistroEditavel,     regCtrl.salvarRascunho);
router.patch ('/registro/:id/fechar',     requireAuth, requireRegistroEditavel,     regCtrl.fechar);

module.exports = router;
