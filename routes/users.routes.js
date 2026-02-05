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
// Get own data
router.get('/me', authenticated, usersControllers.getSelfUser)
// Update own data
router.put('/me', authenticated, usersControllers.updateSelfUser)
// Update a user by ID
// router.patch('/:id', authenticated, usersControllers.updateUserById)
// // Delete a user by ID
// router.delete('/:id', usersControllers.deleteUserById)

module.exports = router
