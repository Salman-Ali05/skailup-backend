const express = require('express')
const router = express.Router()
const projects_controller = require('../controllers/projects.controllers')

router.get('/', projects_controller.getProjects);
router.post('/', projects_controller.createProject);
router.post('/project-users', projects_controller.createProjectUser);
module.exports = router