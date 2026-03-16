const express = require('express');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/rbac');
const {
  getAllReturns,
  createReturnRequest,
  approveReturn,
  rejectReturn
} = require('../controllers/return.controller');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAllReturns)
  .post(restrictTo('SHOP_OWNER', 'SHOP_EMPLOYEE'), createReturnRequest);

router.put('/:id/approve', restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN'), approveReturn);
router.put('/:id/reject', restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN'), rejectReturn);

module.exports = router;