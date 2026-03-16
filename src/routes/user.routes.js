const express = require('express');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/rbac');
const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/user.controller');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAllUsers)
  .post(restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN'), createUser);

router.route('/:id')
  .put(restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN'), updateUser)
  .delete(restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN'), deleteUser);

module.exports = router;