const Vehicle = require("../models/vehicle");

// Add a new vehicle
exports.addVehicle = async (req, res) => {
  try {
    const tenantId = req.headers["x-tenant-id"];
    if (!tenantId) {
      return res.status(400).json({ message: "x-tenant-id header is missing" });
    }

    const {
      VIN,
      make,
      model,
      year,
      mileage,
      exteriorColor,
      interiorColor,
      users,
    } = req.body;

    // Optional: Users array (only included if provided)
    const userArray = Array.isArray(users) ? users : [];

    // Create a new vehicle associated with the tenant, and optionally with users
    const newVehicle = new Vehicle({
      VIN,
      make,
      model,
      year,
      mileage,
      exteriorColor,
      interiorColor,
      tenant: tenantId, // Assign the tenant ID from the request headers (required)
      users: userArray, // Optionally assign users if provided
    });

    await newVehicle.save();
    res
      .status(201)
      .json({ message: "Vehicle added successfully", vehicle: newVehicle });
  } catch (error) {
    console.error("[ERROR] Adding vehicle:", error);
    res.status(500).json({ message: "Error adding vehicle", error });
  }
};
// Get all vehicles for a tenant
exports.getAllVehicles = async (req, res) => {
  try {
    const tenantId = req.headers["x-tenant-id"];
    if (!tenantId) {
      return res.status(400).json({ message: "x-tenant-id header is missing" });
    }

    const {
      make,
      model,
      year,
      userIds,
      saleStatus, // Adding saleStatus as a query parameter
      sortBy,
      sortOrder = "asc",
      page = 1,
      limit = 10,
    } = req.query;

    // Build the query based on filters and tenant ID
    let query = { tenant: tenantId };

    if (make) query.make = make;
    if (model) query.model = model;
    if (year) query.year = year;

    // Optional: Filter by user IDs if provided
    if (userIds && Array.isArray(userIds)) {
      query.users = { $in: userIds };
    }

    // Filter by sale status (for sale, in negotiation, sold, etc.)
    if (saleStatus) {
      query.saleStatus = saleStatus; // Match the enum value in the schema (e.g., "forSale", "inNegotiation", etc.)
    }

    // Pagination setup
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { [sortBy || "createdAt"]: sortOrder === "desc" ? -1 : 1 }, // Sort by default or requested field
    };

    // Retrieve paginated and filtered vehicles for the tenant (organization)
    const vehicles = await Vehicle.paginate(query, options);

    res.status(200).json({ vehicles });
  } catch (error) {
    console.error("[ERROR] Retrieving vehicles:", error);
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
    console.log({vehicle})
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
