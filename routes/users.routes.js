const express = require('express')
const router = express.Router()
const usersControllers = require('../controllers/users.controllers')
const { authenticated } = require('../middlewares/authenticated.middleware')
const { isAdmin } = require('../middlewares/isAdmin.middleware')

// Create a new user
router.post('/', usersControllers.createUser)
// Get all users
router.get('/', authenticated, isAdmin, usersControllers.getAllUsers)
// // Get a user by ID
// router.get('/:id', usersControllers.getUserById)
// // Update a user by ID
// router.put('/:id', usersControllers.updateUserById)
// // Delete a user by ID
// router.delete('/:id', usersControllers.deleteUserById)

module.exports = router
