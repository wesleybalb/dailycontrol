'use strict';

const express    = require('express');
const router     = express.Router();
const homeCtrl   = require('../controllers/homeController');
const { requireAuth } = require('../middlewares/authMiddleware');

router.get('/',                    requireAuth, homeCtrl.showHome);
router.get('/api/tab/:usuarioId',  requireAuth, homeCtrl.getTabData);

module.exports = router;
