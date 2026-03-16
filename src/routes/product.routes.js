const express = require('express');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/rbac');
const {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/product.controller');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAllProducts)
  .post(restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN'), createProduct);

router.route('/:id')
  .put(restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN'), updateProduct)
  .delete(restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN'), deleteProduct);

module.exports = router;