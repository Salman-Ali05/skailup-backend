const express = require('express')
const router = express.Router()
const usersControllers = require('../controllers/users.controllers')
const { authenticated } = require('../middlewares/authenticated.middleware')
const { isAdmin } = require('../middlewares/isAdmin.middleware')

// Create a new user
router.post('/', usersControllers.createUser)

router.use(authenticated);

// Get all users
router.get('/', isAdmin, usersControllers.getAllUsers)
// // Get a user by ID
// router.get('/:id', usersControllers.getUserById)
// Get own data
router.get('/me', usersControllers.getSelfUser)
// Update own data
router.put('/me', usersControllers.updateSelfUser)
// Update a user by ID
// router.patch('/:id', usersControllers.updateUserById)
// // Delete a user by ID
// router.delete('/:id', usersControllers.deleteUserById)
// Invite contributor and create its user
router.post('/contributor', usersControllers.inviteContributor)
// Invite project and create its members
router.post('/project', usersControllers.inviteProject)

module.exports = router
