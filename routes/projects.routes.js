const express = require('express')
const router = express.Router()
const projects_controller = require('../controllers/projects.controllers')
const { authenticated } = require('../middlewares/authenticated.middleware')


router.use(authenticated)

router.get('/', projects_controller.getProjects);
module.exports = router