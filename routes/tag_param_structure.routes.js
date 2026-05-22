const express = require('express')
const router = express.Router()
const tagParamStructuresControllers = require('../controllers/tag_param_structure.controllers')

router.get('/', tagParamStructuresControllers.getTagParamStructures);
module.exports = router