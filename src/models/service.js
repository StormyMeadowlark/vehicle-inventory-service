const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema({
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vehicle",
    required: true,
  },
  serviceType: {
    type: String,
    enum: ["repair", "maintenance", "reconditioning"],
    required: true,
  },
  date: { type: Date, default: Date.now },
  description: { type: String },
  cost: { type: Number },
  performedBy: { type: String },
  status: {
    type: String,
    enum: ["scheduled", "in_progress", "completed"],
    default: "scheduled",
  },
});

module.exports = mongoose.model("Service", ServiceSchema);
