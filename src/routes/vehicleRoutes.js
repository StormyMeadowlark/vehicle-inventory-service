const express = require("express");
const router = express.Router();
const VehicleController = require("../controllers/vehicleController");
const requireRole  = require("../middleware/authMiddleware"); // Middleware to verify roles

// Add a new vehicle (only Admins and SuperAdmins)
router.post(
  "/:tenantId",
  requireRole(["Admin", "SuperAdmin"]),
  VehicleController.addVehicle
);

// Get all vehicles for a tenant (Admin, SuperAdmin, Mechanic, Viewer)
router.get(
  "/:tenantId",
  requireRole(["Admin", "SuperAdmin", "Mechanic", "Viewer"]),
  VehicleController.getAllVehicles
);

// Get details for a specific vehicle (Admin, Mechanic, Viewer, User)
router.get(
  "/:tenantId/:vehicleId",
  requireRole(["Admin", "SuperAdmin", "Mechanic", "Viewer", "User"]),
  VehicleController.getVehicleById
);

// Update a vehicle (only Admins, SuperAdmins, and Mechanics)
router.patch(
  "/:tenantId/:vehicleId",
  requireRole(["Admin", "SuperAdmin", "Mechanic"]),
  VehicleController.updateVehicle
);

// Delete a vehicle (only Admins and SuperAdmins)
router.delete(
  "/:tenantId/:vehicleId",
  requireRole(["Admin", "SuperAdmin"]),
  VehicleController.deleteVehicle
);

router.delete("/:tenantId/:vehicleId/soft-delete",
  requireRole(["Admin", "SuperAdmin"]),
  VehicleController.softDeleteVehicle
)


module.exports = router;
