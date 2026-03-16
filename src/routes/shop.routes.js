const express = require('express');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/rbac');
const {
  getAllShops,
  createShop,
  updateShop,
  deleteShop
} = require('../controllers/shop.controller');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAllShops)
  .post(restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN', 'LOCATION_MANAGER'), createShop);

router.route('/:id')
  .put(restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN', 'LOCATION_MANAGER'), updateShop)
  .delete(restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN', 'LOCATION_MANAGER'), deleteShop);

module.exports = router;