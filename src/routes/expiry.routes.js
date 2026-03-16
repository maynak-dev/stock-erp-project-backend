const express = require('express');
const { protect } = require('../middleware/auth');
const { getExpiringStock } = require('../controllers/expiry.controller');

const router = express.Router();

router.use(protect);
router.get('/', getExpiringStock);

module.exports = router;