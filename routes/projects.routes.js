const express = require('express')
const router = express.Router()
const projectsControllers = require('../controllers/projects.controllers')
const { authenticated } = require('../middlewares/authenticated.middleware')


router.use(authenticated)

router.get('/', projectsControllers.getProjects);
module.exports = router