const express = require('express')
const router = express.Router()
const contributors_contoller = require('../controllers/contributors.controllers')
const { authenticated } = require('../middlewares/authenticated.middleware')

router.use(authenticated)

router.get('/', contributors_contoller.getContributors);
module.exports = router