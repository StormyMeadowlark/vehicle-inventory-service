const Vehicle = require("../models/vehicle");

// Add a new vehicle
exports.addVehicle = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { VIN, make, model, year, mileage, color } = req.body;

    const newVehicle = new Vehicle({
      VIN,
      make,
      model,
      year,
      mileage,
      exteriorColor: color,
      tenant: tenantId, // Assuming the vehicle is associated with the tenant
    });

    await newVehicle.save();
    res
      .status(201)
      .json({ message: "Vehicle added successfully", vehicle: newVehicle });
  } catch (error) {
    res.status(500).json({ message: "Error adding vehicle", error });
  }
};

// Get all vehicles for a tenant
exports.getAllVehicles = async (req, res) => {
  try {
    const { tenantId } = req.params;

    const vehicles = await Vehicle.find({ tenant: tenantId }); // Find vehicles for this tenant
    res.status(200).json({ vehicles });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving vehicles", error });
  }
};

// Get details for a specific vehicle
exports.getVehicleById = async (req, res) => {
  try {
    const { tenantId, vehicleId } = req.params;

    const vehicle = await Vehicle.findOne({ _id: vehicleId, tenant: tenantId }); // Ensure tenant ownership
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    res.status(200).json({ vehicle });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving vehicle details", error });
  }
};

// Update a vehicle
exports.updateVehicle = async (req, res) => {
  try {
    const { tenantId, vehicleId } = req.params;
    const updatedData = req.body;

    const updatedVehicle = await Vehicle.findOneAndUpdate(
      { _id: vehicleId, tenant: tenantId }, // Ensure tenant ownership
      updatedData,
      { new: true }
    );

    if (!updatedVehicle)
      return res.status(404).json({ message: "Vehicle not found" });

    res
      .status(200)
      .json({
        message: "Vehicle updated successfully",
        vehicle: updatedVehicle,
      });
  } catch (error) {
    res.status(500).json({ message: "Error updating vehicle", error });
  }
};

// Delete a vehicle
exports.deleteVehicle = async (req, res) => {
  try {
    const { tenantId, vehicleId } = req.params;

    const deletedVehicle = await Vehicle.findOneAndDelete({
      _id: vehicleId,
      tenant: tenantId,
    });
    if (!deletedVehicle)
      return res.status(404).json({ message: "Vehicle not found" });

    res.status(200).json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting vehicle", error });
  }
};
