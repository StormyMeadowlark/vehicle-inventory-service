const express = require("express");
const router = express.Router();
const multer = require("multer");
const MediaController = require("../controllers/mediaController");
const  requireRole  = require("../middleware/authMiddleware");

// Set up Multer for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload photos/documents for a vehicle (Admin, Mechanic)
router.post(
  "/:tenantId/:vehicleId",
  requireRole(["Admin", "SuperAdmin", "Mechanic"]),
  upload.array("media", 40), // Make sure "media" matches the field name in your form-data
  MediaController.addMedia
);

// Get all photos/documents for a vehicle (Admin, Mechanic, Viewer)
router.get(
  "/:tenantId/:vehicleId",
  requireRole(["Admin", "SuperAdmin", "Mechanic", "Viewer"]),
  MediaController.getMedia
);

// Delete a photo/document (only Admins)
router.delete(
  "/:tenantId/:mediaId",
  requireRole(["Admin", "SuperAdmin"]),
  MediaController.deleteMedia
);
// Get all media for a tenant (Admin, SuperAdmin)
router.get(
  "/:tenantId",
  requireRole(["Admin", "SuperAdmin"]),
  MediaController.getTenantMedia
);

// Assign media to a vehicle (Admin, SuperAdmin)


router.post(
  "/:tenantId",
  requireRole(["Admin", "SuperAdmin"]),
  upload.array("media", 10), // Accept multiple files with the field name "media"
  MediaController.addTenantMedia
);

router.put(
  "/:tenantId/assign/:vehicleId",
  requireRole(["Admin", "SuperAdmin"]),
  MediaController.bulkAssignMediaToVehicle
);
module.exports = router;
