const express = require('express')
const router = express.Router()
const tag_param_structure_controller = require('../controllers/tag_param_structure.controllers')

router.get('/', tag_param_structure_controller.getTagParamStructures);
module.exports = router