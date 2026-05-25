'use strict';

const express   = require('express');
const router    = express.Router();
const ctrl      = require('../controllers/checklistController');
const { requireAuth } = require('../middlewares/authMiddleware');

router.patch ('/checklist/:itemId/toggle',    requireAuth, ctrl.toggleItem);
router.post  ('/checklist/:itemId/evidencia', requireAuth, ctrl.uploadMiddleware, ctrl.uploadEvidencia);
router.delete('/checklist/:itemId/evidencia', requireAuth, ctrl.removeEvidencia);

module.exports = router;
