const express = require('express')
const router = express.Router()
const structures_controller = require('../controllers/structures.controllers')

router.get('/', structures_controller.getStructures)

module.exports = router
