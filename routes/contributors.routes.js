const express = require('express')
const router = express.Router()
const contributors_contoller = require('../controllers/contributors.controllers')

router.get('/', contributors_contoller.getContributors);
module.exports = router