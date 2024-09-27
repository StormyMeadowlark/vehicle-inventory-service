const express = require("express");
const router = express.Router();
const ServiceController = require("../controllers/serviceController");
const { requireRole } = require("../middleware/authMiddleware");

// Add a new service (only Admins, SuperAdmins, Mechanics)
router.post(
  "/api/vehicles/:tenantId/:vehicleId/services",
  requireRole(["Admin", "SuperAdmin", "Mechanic"]),
  ServiceController.addService
);

// Get all services for a vehicle (Admin, SuperAdmin, Mechanic)
router.get(
  "/api/vehicles/:tenantId/:vehicleId/services",
  requireRole(["Admin", "SuperAdmin", "Mechanic"]),
  ServiceController.getAllServices
);

// Update a service (Admin, Mechanic)
router.patch(
  "/:tenantId/:serviceId",
  requireRole(["Admin", "SuperAdmin", "Mechanic"]),
  ServiceController.updateService
);

// Delete a service (only Admins and SuperAdmins)
router.delete(
  "/:tenantId/:serviceId",
  requireRole(["Admin", "SuperAdmin"]),
  ServiceController.deleteService
);

module.exports = router;
