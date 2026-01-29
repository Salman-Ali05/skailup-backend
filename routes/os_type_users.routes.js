const express = require('express')
const router = express.Router()
const ostypeuser_contoller = require('../controllers/os_type_users.controllers')

router.get('/', ostypeuser_contoller.getOS_type_users);
module.exports = router
