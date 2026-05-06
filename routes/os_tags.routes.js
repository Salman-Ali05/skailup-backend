const express = require('express')
const router = express.Router()
const os_tag_contributor = require('../controllers/OS_tags/os_tag_contrib.controllers')
const os_tag_project = require('../controllers/OS_tags/os_tag_project.controllers')
const os_typeuser_contoller = require('../controllers/OS_tags/os_type_users.controllers')
const os_status_contoller = require('../controllers/OS_tags/os_status.controllers')


router.get('/tag_contributors', os_tag_contributor.getOsTagContributors)
router.get('/tag_projects', os_tag_project.getOsTagProject)
router.get('/os_type_users', os_typeuser_contoller.getOS_type_users);
router.get('/os_status', os_status_contoller.getStatus);

module.exports = router
