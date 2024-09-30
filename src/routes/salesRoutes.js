const express = require("express");
const router = express.Router();
const SalesController = require("../controllers/salesController");
const requireRole  = require("../middleware/authMiddleware");


// Ensure tenant validation middleware


// Add sale details for a vehicle (Admin, SuperAdmin, SalesRep)
router.post(
  "/:tenantId",
  requireRole(["Admin", "SuperAdmin"]),
  SalesController.addSale
);

// Get sale details for a specific vehicle (Admin, SuperAdmin, SalesRep)
router.get(
  "/:tenantId/:vehicleId",
  requireRole(["Admin", "SuperAdmin"]),
  SalesController.getSaleDetails
);

// Update sale details (Admin, SuperAdmin)
router.patch(
  "/:tenantId/:vehicleId/:saleId",
  requireRole(["Admin", "SuperAdmin"]),
  SalesController.updateSale
);

// Delete a sale record (Admin, SuperAdmin)
router.delete(
  "/:tenantId/:vehicleId/:saleId",
  requireRole(["Admin", "SuperAdmin"]),
  SalesController.deleteSale
);

// Get all sales for a tenant (Admin, SuperAdmin, SalesRep)
router.get(
  "/:tenantId",
  requireRole(["Admin", "SuperAdmin"]),
  SalesController.getAllSales
);

// Filter sales by status (available, sold, pending_sale) (Admin, SuperAdmin, SalesRep)
router.get(
  "/:tenantId/status/:status",
  requireRole(["Admin", "SuperAdmin"]),
  SalesController.getSalesByStatus
);

// Get sales report (Admin, SuperAdmin) this route still needs to be tested 
router.get(
  "/:tenantId/report",
  requireRole(["Admin", "SuperAdmin"]),
  SalesController.getSalesReport
);

// Search sales by various parameters (Admin, SuperAdmin)
router.get(
  "/:tenantId/search",
  requireRole(["Admin", "SuperAdmin"]),
  SalesController.searchSales
);

module.exports = router;
