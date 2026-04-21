const express = require('express')
const router = express.Router()
const programs_contoller = require('../controllers/programs.controllers')

router.get('/', programs_contoller.getPrograms);
module.exports = router