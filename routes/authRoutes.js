'use strict';

// routes/authRoutes.js
const express = require('express');
const router  = express.Router();
const authCtrl = require('../controllers/authController');

router.get ('/login',  authCtrl.showLogin);
router.post('/login',  authCtrl.doLogin);
router.get ('/logout', authCtrl.doLogout);

module.exports = router;
