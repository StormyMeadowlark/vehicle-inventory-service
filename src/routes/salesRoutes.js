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
  SalesController.getAllSales
);

// Filter sales by status (available, sold, pending_sale) (Admin, SuperAdmin, SalesRep)
router.get(
  "/:tenantId/status/:status",
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

// Inventory report
router.get(
  "/:tenantId/inventory-report",
  requireRole(["Admin", "SuperAdmin"]),
  SalesController.getInventoryReport
);

// Sales performance report
router.get(
  "/:tenantId/sales-performance-report",
  requireRole(["Admin", "SuperAdmin"]),
  SalesController.getSalesPerformanceReport
);

// General report
router.get(
  "/:tenantId/general-report",
  requireRole(["Admin", "SuperAdmin"]),
  SalesController.getGeneralReport
);

// Export inventory report as CSV
router.get(
  "/:tenantId/inventory-report-csv",
  requireRole(["Admin", "SuperAdmin"]),
  SalesController.getInventoryReportCSV
);

// Export inventory report as PDF
router.get(
  "/:tenantId/inventory-report-pdf",
  requireRole(["Admin", "SuperAdmin"]),
  SalesController.getInventoryReportPDF
);

// Export inventory report as Excel
router.get(
  "/:tenantId/inventory-report-excel",
  requireRole(["Admin", "SuperAdmin"]),
  SalesController.getInventoryReportExcel
);

module.exports = router;
