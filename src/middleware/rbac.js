// backend/src/middleware/rbac.js
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};
// Optional scope middleware (if used)
exports.scopeData = (req, res, next) => {
  next();
};