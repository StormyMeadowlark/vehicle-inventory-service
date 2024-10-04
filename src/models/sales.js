const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const SalesSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Tenant", // Assuming you have a Tenant model
  },
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
  condition: {
    type: String,
    enum: ["new", "used", "certified_preowned"],
    default: "used",
  },
  previousOwners: { type: Number, default: 0 },
  isCertified: { type: Boolean, default: false },
  isReconditioned: { type: Boolean, default: false },
  salePrice: { type: Number, required: true }, // Sale price of the vehicle
  soldPrice: { type: Number, required: false},
  listedOn: { type: Date, default: Date.now }, // When the vehicle was listed for sale
  soldOn: { type: Date }, // When the vehicle was sold (if applicable)
  marketingChannels: [{ type: String }], // Platforms where the vehicle is marketed
  description: { type: String }, // Marketing description for the vehicle
  listedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }, // User who listed the vehicle
  soldBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }, // User who sold the vehicle
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }, 
  notes: { type: String }// Buyer (user) who purchased the vehicle
  // Any additional notes regarding the transaction
});

SalesSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("Sales", SalesSchema);
