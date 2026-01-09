const express = require('express')
const router = express.Router()

const usersControllers = require('../controllers/users.controllers')

// POST /users
router.post('/', usersControllers.createUser)

module.exports = router
