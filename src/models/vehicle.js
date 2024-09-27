const mongoose = require("mongoose");

const VehicleSchema = new mongoose.Schema({
  VIN: { type: String, required: true, unique: true },
  make: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number, required: true },
  trim: { type: String },
  engine: { type: String },
  transmission: { type: String },
  drivetrain: { type: String },
  fuelType: { type: String },
  bodyType: { type: String },
  exteriorColor: { type: String },
  interiorColor: { type: String },
  mileage: { type: Number, required: true },
  condition: {
    type: String,
    enum: ["new", "used", "certified_preowned"],
    default: "used",
  },
  previousOwners: { type: Number, default: 0 },
  isCertified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Vehicle", VehicleSchema);
