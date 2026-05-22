const express = require('express')
const router = express.Router()
const programsControllers = require('../controllers/programs.controllers')
const { authenticated } = require('../middlewares/authenticated.middleware')

router.use(authenticated)

router.get('/', programsControllers.getPrograms);
router.get('/count/by-status', programsControllers.getProgramsStatusCounts);
router.post('/', programsControllers.createProgram);
router.put('/:id', programsControllers.updateProgram);
module.exports = router