const express = require("express");
const router = express.Router();
const MediaController = require("../controllers/mediaController");
const { requireRole } = require("../middleware/authMiddleware");

// Upload photos/documents for a vehicle (Admin, Mechanic)
router.post(
  "/:tenantId/:vehicleId/media",
  requireRole(["Admin", "SuperAdmin", "Mechanic"]),
  MediaController.addMedia
);

// Get all photos/documents for a vehicle (Admin, Mechanic, Viewer)
router.get(
  "/:tenantId/:vehicleId/media",
  requireRole(["Admin", "SuperAdmin", "Mechanic", "Viewer"]),
  MediaController.getMedia
);

// Delete a photo/document (only Admins)
router.delete(
  "/:tenantId/:mediaId",
  requireRole(["Admin", "SuperAdmin"]),
  MediaController.deleteMedia
);

module.exports = router;
