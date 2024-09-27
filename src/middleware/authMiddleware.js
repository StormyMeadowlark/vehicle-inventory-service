// middleware/authMiddleware.js

const requireRole = (roles) => {
  return (req, res, next) => {
    const userRole = req.user.role; // Assuming req.user is populated after authentication
    if (!roles.includes(userRole)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

module.exports = { requireRole };
