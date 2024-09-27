const express = require("express");
const router = express.Router();
const AcquisitionController = require("../controllers/acquisitionController");
const { requireRole } = require("../middleware/authMiddleware");

// Add acquisition details for a vehicle (only Admins, SuperAdmins)
router.post(
  "/:tenantId/:vehicleId/acquisition",
  requireRole(["Admin", "SuperAdmin"]),
  AcquisitionController.addAcquisition
);

// Get acquisition details for a vehicle (Admin, SuperAdmin)
router.get(
  "/:tenantId/:vehicleId/acquisition",
  requireRole(["Admin", "SuperAdmin"]),
  AcquisitionController.getAcquisitionDetails
);

// Update acquisition details (Admin, SuperAdmin)
router.patch(
  "/:tenantId/:acquisitionId",
  requireRole(["Admin", "SuperAdmin"]),
  AcquisitionController.updateAcquisition
);

module.exports = router;
