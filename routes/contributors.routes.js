const express = require('express')
const router = express.Router()
const contributorsControllers = require('../controllers/contributors.controllers')
const { authenticated } = require('../middlewares/authenticated.middleware')

router.use(authenticated)

router.get('/', contributorsControllers.getContributors);
module.exports = router