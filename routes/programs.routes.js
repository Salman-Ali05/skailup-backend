const express = require('express')
const router = express.Router()
const programs_contoller = require('../controllers/programs.controllers')

router.get('/', programs_contoller.getPrograms);
router.post('/', programs_contoller.createProgram);
router.put('/:id', programs_contoller.updateProgram);
module.exports = router