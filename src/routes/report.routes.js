const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getStockReport,
  getExpiryReport,
  getReturnReport,
  getSalesReport
} = require('../controllers/report.controller');

const router = express.Router();

router.use(protect);

router.get('/stock', getStockReport);
router.get('/expiry', getExpiryReport);
router.get('/returns', getReturnReport);
router.get('/sales', getSalesReport);

module.exports = router;