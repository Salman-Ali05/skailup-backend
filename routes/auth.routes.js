const express = require('express')
const router = express.Router()
const { authenticated } = require('../middlewares/authenticated.middleware')
const auth = require('../controllers/auth.controllers')

router.post('/login', auth.login)
router.post('/logout', authenticated, auth.logout)

module.exports = router
