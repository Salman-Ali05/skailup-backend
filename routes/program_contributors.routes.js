const express = require('express')
const router = express.Router()
const program_contributors_contoller = require('../controllers/program_contributors.controllers')

router.get('/', program_contributors_contoller.getProgramContributors);

module.exports = router