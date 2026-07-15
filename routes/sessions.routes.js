const express = require("express");

const sessionsController = require("../controllers/sessions.controllers");
const { authenticated } = require("../middlewares/authenticated.middleware");

const router = express.Router();

router.use(authenticated);

router.get("/:activityId", sessionsController.getSessionsByActivity);
router.post("/:activityId", sessionsController.createSessions);

module.exports = router;