const express = require("express");
const router = express.Router();
const SalesController = require("../controllers/salesController");
const { requireRole } = require("../middleware/authMiddleware");

// Add sale details for a vehicle (only Admins, SuperAdmins)
router.post(
  "/:tenantId/:vehicleId/sale",
  requireRole(["Admin", "SuperAdmin"]),
  SalesController.addSale
);

// Get sale details for a vehicle (Admin, SuperAdmin)
router.get(
  "/:tenantId/:vehicleId/sale",
  requireRole(["Admin", "SuperAdmin"]),
  SalesController.getSaleDetails
);

// Update sale details (Admin, SuperAdmin)
router.patch(
  "/:tenantId/:saleId",
  requireRole(["Admin", "SuperAdmin"]),
  SalesController.updateSale
);

module.exports = router;
