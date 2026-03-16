const express = require('express');
const { protect } = require('../middleware/auth');
const { restrictTo, scopeData } = require('../middleware/rbac');
const {
  getAllLocations,
  createLocation,
  updateLocation,
  deleteLocation
} = require('../controllers/location.controller');

const router = express.Router();

// All location routes require authentication
router.use(protect);

router.route('/')
  .get(getAllLocations)
  .post(restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN'), createLocation);

router.route('/:id')
  .put(restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN'), updateLocation)
  .delete(restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN'), deleteLocation);

module.exports = router;