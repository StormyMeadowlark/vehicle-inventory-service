const mongoose = require("mongoose");

const MediaSchema = new mongoose.Schema({
  tenantId: {
    type: String, // To associate media with a tenant
    required: true,
  },
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vehicle",
  },
  photos: [{ type: String }], // URLs for vehicle images or generic tenant images
  documents: [{ type: String }], // URLs for vehicle documents or tenant-level documents
  createdAt: { type: Date, default: Date.now }, // When media was uploaded
});

module.exports = mongoose.model("Media", MediaSchema);
