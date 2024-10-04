const mongoose = require("mongoose");

const MediaSchema = new mongoose.Schema({
  tenantId: {
    type: String, // To associate media with a tenant
    required: true,
  },
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vehicle", // Reference to the Vehicle model // Media is associated with a vehicle
  },
  mediaType: {
    type: String,
    enum: ["photo", "document", "video", "image/jpeg", "image/png"], // Type of media (photo, document, video)
    required: true,
  },
  mediaUrl: {
    type: String,
    required: true,
  }, // URL or path to the media file (image, document, video)
  description: {
    type: String,
  }, // Optional description of the media
  tags: [{ type: String }], // Optional tags to describe or categorize media
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }, // When the media was uploaded
  updatedAt: {
    type: Date,
    default: Date.now,
  }, // Last time media was updated
});

module.exports = mongoose.model("Media", MediaSchema);