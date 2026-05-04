const express = require('express')
const router = express.Router()
const status_contoller = require('../controllers/status.controllers')

router.get('/', status_contoller.getStatus);
module.exports = router