const mongoose = require("mongoose");

const MediaSchema = new mongoose.Schema({
  tenantId: {
    type: String, // To associate media with a tenant
    required: true,
  },
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vehicle", // Reference to the Vehicle model
  },
  media: [
    {
      mediaType: {
        type: String,
        enum: [
          // Images
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",

          // Videos
          "video/mp4",
          "video/webm",
          "video/ogg",

          // Documents
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
          "application/vnd.ms-excel", // XLS
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
        ],
        required: true,
      },
      mediaUrl: {
        type: String,
        required: true,
      },
      alt: {
        type: String,
        required: false, // Optional alt text for accessibility
      },
      description: {
        type: String,
      }, // Optional description of the media
      tags: [{ type: String }],
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

module.exports = mongoose.model("Media", MediaSchema);
