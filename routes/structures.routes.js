const express = require('express')
const router = express.Router()
const structuresControllers = require('../controllers/structures.controllers')

router.get('/', structuresControllers.getStructures)

module.exports = router
