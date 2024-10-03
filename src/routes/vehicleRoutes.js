const express = require("express");
const router = express.Router();
const VehicleController = require("../controllers/vehicleController");
const requireRole = require("../middleware/authMiddleware"); // Middleware to verify roles
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Add a new vehicle (only Admins and SuperAdmins)
router.post(
  "/:tenantId",
  requireRole(["Admin", "SuperAdmin"]),
  VehicleController.addVehicle
);

// Get all vehicles for a tenant (Admin, SuperAdmin, Mechanic, Viewer)
router.get(
  "/:tenantId",
  VehicleController.getAllVehicles
);

// Get details for a specific vehicle (Admin, Mechanic, Viewer, User)
router.get(
  "/:tenantId/:vehicleId",
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

// Soft delete a vehicle (only Admins and SuperAdmins)
router.delete(
  "/:tenantId/:vehicleId/soft-delete",
  requireRole(["Admin", "SuperAdmin"]),
  VehicleController.softDeleteVehicle
);

// Extract and decode VIN from image
router.post(
  "/:tenantId/extract-and-decode-vin",
  upload.array("images"),
  requireRole(["Admin", "SuperAdmin"]),
  VehicleController.extractAndDecodeVIN
);

// Decode VIN manually entered by user
router.post("/:tenantId/decode-vin", VehicleController.decodeVIN);



module.exports = router;
