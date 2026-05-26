'use strict';

const express    = require('express');
const router     = express.Router();
const adminCtrl  = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middlewares/authMiddleware');

const guard = [requireAuth, requireAdmin];

router.get  ('/admin',                         ...guard, adminCtrl.showAdmin);
router.post ('/admin/usuario',                 ...guard, adminCtrl.criarUsuario);
router.patch('/admin/usuario/:id/ativo',       ...guard, adminCtrl.toggleAtivo);
router.post ('/admin/usuario/:id/reset-senha', ...guard, adminCtrl.resetSenha);
router.get  ('/admin/usuario/:id/template',    ...guard, adminCtrl.getTemplate);
router.put  ('/admin/usuario/:id/template',    ...guard, adminCtrl.salvarTemplate);

module.exports = router;