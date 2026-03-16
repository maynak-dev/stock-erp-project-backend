const express = require('express');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/rbac');
const {
  getAllCompanies,
  createCompany,
  updateCompany,
  deleteCompany
} = require('../controllers/company.controller');

const router = express.Router();

router.use(protect);
router.route('/')
  .get(getAllCompanies)
  .post(restrictTo('SUPER_ADMIN'), createCompany);

router.route('/:id')
  .put(restrictTo('SUPER_ADMIN'), updateCompany)
  .delete(restrictTo('SUPER_ADMIN'), deleteCompany);

module.exports = router;