const express = require('express')
const router = express.Router()
const osTagContributorsControllers = require('../controllers/OS_tags/os_tag_contrib.controllers')
const osTagProjectsControllers = require('../controllers/OS_tags/os_tag_project.controllers')
const osTypeUsersControllers = require('../controllers/OS_tags/os_type_users.controllers')
const osStatusControllers = require('../controllers/OS_tags/os_status.controllers')
const osActivityDurationControllers = require('../controllers/OS_tags/os_activity_duration')


router.get('/tag_contributors', osTagContributorsControllers.getOsTagContributors)
router.get('/tag_projects', osTagProjectsControllers.getOsTagProject)
router.get('/os_type_users', osTypeUsersControllers.getOS_type_users);
router.get('/os_status', osStatusControllers.getStatus);
router.get('/os_activity_duration', osActivityDurationControllers.getOSActivityDuration);

module.exports = router
