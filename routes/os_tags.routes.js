const express = require('express')
const router = express.Router()
const osTagContributor = require('../controllers/OS_tags/os_tag_contrib.controllers')

router.get('/tag_contributors', osTagContributor.getOsTagContributors)

module.exports = router
