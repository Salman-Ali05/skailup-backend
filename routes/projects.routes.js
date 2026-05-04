const express = require('express')
const router = express.Router()
const projects_controller = require('../controllers/projects.controllers')

router.get('/', projects_controller.getProjects);
module.exports = router