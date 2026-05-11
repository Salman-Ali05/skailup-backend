const express = require('express')
const router = express.Router()
const programs_contoller = require('../controllers/programs.controllers')

router.get('/', programs_contoller.getPrograms);
router.get('/count/by-status', programs_contoller.getProgramsStatusCounts);
router.post('/', programs_contoller.createProgram);
router.put('/:id', programs_contoller.updateProgram);
module.exports = router