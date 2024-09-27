const mongoose = require("mongoose");

const SalesSchema = new mongoose.Schema({
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vehicle",
    required: true,
  },
  status: {
    type: String,
    enum: ["available", "sold", "pending_sale", "reserved"],
    default: "available",
  },
  salePrice: { type: Number },
  listedOn: { type: Date },
  soldOn: { type: Date },
  marketingChannels: [{ type: String }], // e.g., Autotrader, Cars.com
  description: { type: String }, // Marketing description for the vehicle
});

module.exports = mongoose.model("Sales", SalesSchema);
