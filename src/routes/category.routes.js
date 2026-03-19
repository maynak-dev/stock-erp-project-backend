const express = require('express');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/rbac');
const { getAllCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/category.controller');

const router = express.Router();
router.use(protect);

router.route('/')
  .get(getAllCategories)
  .post(restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN'), createCategory);

router.route('/:id')
  .put(restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN'), updateCategory)
  .delete(restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN'), deleteCategory);

module.exports = router;
