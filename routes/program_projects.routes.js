const express = require('express')
const router = express.Router()
const program_projects_contoller = require('../controllers/program_projects.controllers')

router.get('/', program_projects_contoller.getProgramProjects);

module.exports = router