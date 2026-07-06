const express = require('express')
const router = express.Router()
const activitiesController = require('../controllers/activities.controller')
const { authenticated } = require('../middlewares/authenticated.middleware')

router.use(authenticated)

router.get("/:programId", activitiesController.getActivities);
router.post("/:programId", activitiesController.createActivity);
router.put("/:programId/:activityId", activitiesController.updateActivity);
module.exports = router