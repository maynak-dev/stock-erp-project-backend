const express = require('express');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/rbac');
const {
  addStock,
  transferStock,
  getStock
} = require('../controllers/stock.controller');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getStock)
  .post(restrictTo('COMPANY_ADMIN', 'LOCATION_MANAGER', 'SHOP_OWNER'), addStock);

router.post('/transfer', restrictTo('COMPANY_ADMIN', 'LOCATION_MANAGER', 'SHOP_OWNER'), transferStock);

module.exports = router;