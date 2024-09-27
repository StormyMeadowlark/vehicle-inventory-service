const mongoose = require("mongoose");

const AcquisitionSchema = new mongoose.Schema({
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vehicle",
    required: true,
  },
  acquisitionType: {
    type: String,
    enum: ["auction", "trade-in", "third_party_purchase"],
    required: true,
  },
  acquisitionPrice: { type: Number },
  acquiredFrom: { type: String }, // Seller or auction house
  acquisitionDate: { type: Date, default: Date.now },
  tradeInDetails: {
    tradeInVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
    tradeInValue: { type: Number },
    tradeInCustomerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
  },
});

module.exports = mongoose.model("Acquisition", AcquisitionSchema);
