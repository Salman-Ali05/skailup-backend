const express = require('express')
const router = express.Router()
const optionsSetController = require('../controllers/OS_tags/options_set.controller')
const osTagContributorsControllers = require('../controllers/OS_tags/os_tag_contrib.controllers')
const osTagProjectsControllers = require('../controllers/OS_tags/os_tag_project.controllers')
const osTypeUsersControllers = require('../controllers/OS_tags/os_type_users.controllers')
const osStatusControllers = require('../controllers/OS_tags/os_status.controllers')
const osActivityDurationControllers = require('../controllers/OS_tags/os_activity_duration.controller')
const osActivityAreaControllers = require('../controllers/OS_tags/os_activity_area.controller')

router.get('/', optionsSetController.getAllOptionsSets);
router.get('/tag_contributors', osTagContributorsControllers.getOsTagContributors);
router.get('/tag_projects', osTagProjectsControllers.getOsTagProject);
router.get('/os_type_users', osTypeUsersControllers.getOS_type_users);
router.get('/os_status', osStatusControllers.getStatus);
router.get('/os_activity_duration', osActivityDurationControllers.getOSActivityDuration);
router.get('/os_activity_area', osActivityAreaControllers.getOSActivityArea);

module.exports = router
