const mongoose = require("mongoose");

const MediaSchema = new mongoose.Schema({
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vehicle",
    required: true,
  },
  photos: [{ type: String }], // URLs for vehicle images
  documents: [{ type: String }], // URLs for vehicle documents (e.g., title, registration)
});

module.exports = mongoose.model("Media", MediaSchema);
