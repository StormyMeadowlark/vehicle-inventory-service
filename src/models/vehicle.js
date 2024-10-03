const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

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
  tenant: { type: String, required: true }, // Tenant is required
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" }, // Users array is optional
  features: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  softDelete: { type: Boolean, default: false},
});

// Add pagination plugin
VehicleSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Vehicle", VehicleSchema);
