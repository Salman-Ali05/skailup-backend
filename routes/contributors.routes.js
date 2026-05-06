const express = require('express')
const router = express.Router()
const { authenticated } = require('../middlewares/authenticated.middleware')
const contributorsControllers = require('../controllers/contributors.controllers')

router.get('/', authenticated, contributorsControllers.getContributors)
// router.get('/:id', contributorsControllers.getContributorById)
// router.get('/me', authenticated, contributorsControllers.getSelfContributor)
// router.patch('/:id', authenticated, contributorsControllers.updateContributorById)
// router.delete('/:id', contributorsControllers.deleteContributorById)
module.exports = router