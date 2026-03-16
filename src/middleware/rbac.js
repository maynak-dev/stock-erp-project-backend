exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

// Data scope middleware (attach to routes that need filtering)
exports.scopeData = (req, res, next) => {
  // For list endpoints, we'll handle filtering in controller based on req.user
  // This just marks that scoping is needed
  next();
};