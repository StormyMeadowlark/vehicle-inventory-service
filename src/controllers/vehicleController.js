const Vehicle = require("../models/vehicle");
const axios = require("axios");
const vision = require("@google-cloud/vision");
const Media = require("../models/media");
const AWS = require("aws-sdk");
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
// Soft Delete a vehicle
exports.softDeleteVehicle = async (req, res) => {
  try {
    const { tenantId, vehicleId } = req.params;

    const softDeletedVehicle = await Vehicle.findOneAndUpdate(
      { _id: vehicleId, tenant: tenantId },
      { isDeleted: true }, // Set the isDeleted flag to true
      { new: true }
    );

    if (!softDeletedVehicle)
      return res.status(404).json({ message: "Vehicle not found" });

    res.status(200).json({ message: "Vehicle soft deleted successfully", vehicle: softDeletedVehicle });
  } catch (error) {
    res.status(500).json({ message: "Error soft deleting vehicle", error });
  }
};
// Configure AWS SDK for DigitalOcean Spaces
const spacesEndpoint = new AWS.Endpoint(process.env.DO_SPACES_ENDPOINT);
const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.DO_SPACES_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET,
});

// Extract VIN from Image, Decode Vehicle Info, and Save Media to DigitalOcean Spaces
exports.extractAndDecodeVIN = async (req, res) => {
  try {
    const tenantId = req.headers["x-tenant-id"];
    if (!tenantId) {
      return res.status(400).json({ message: "x-tenant-id header is missing" });
    }

    const { vehicleId } = req.params;

    // Ensure the vehicle exists (if provided)
    const vehicle = vehicleId
      ? await Vehicle.findOne({ _id: vehicleId, tenant: tenantId })
      : null;

    if (vehicleId && !vehicle) {
      return res
        .status(404)
        .json({ message: "Vehicle not found or access denied" });
    }

    const uploadedMediaUrls = [];

    // Upload each file to DigitalOcean Spaces
    for (const file of req.files) {
      const uploadParams = {
        Bucket: process.env.DO_SPACES_BUCKET,
        Key: `${tenantId}/${Date.now()}_${file.originalname}`,
        Body: file.buffer,
        ACL: "public-read",
        ContentType: file.mimetype,
      };

      const result = await s3.upload(uploadParams).promise();
      uploadedMediaUrls.push(result.Location); // Store the public URL of the uploaded file
    }

    // Save the uploaded images to the Media collection
    const media = new Media({
      tenantId,
      vehicleId: vehicleId || null, // If vehicleId is available, link it; otherwise, leave it null
      photos: uploadedMediaUrls,
    });

    await media.save();

    // Perform OCR to extract the VIN from the uploaded image
    const client = new vision.ImageAnnotatorClient();
    const [result] = await client.textDetection(uploadedMediaUrls[0]); // Use the first uploaded image for OCR
    const detections = result.textAnnotations;

    if (detections.length === 0) {
      return res.status(400).json({ message: "No text found in the image" });
    }

    // Extract the VIN from the OCR result
    const textFromImage = detections[0].description;
    const vinRegex = /\b[A-HJ-NPR-Z0-9]{17}\b/;
    const match = textFromImage.match(vinRegex);

    if (!match) {
      return res.status(400).json({ message: "No valid VIN found in the image" });
    }

    const vin = match[0];

    // Decode the VIN using NHTSA API
    const response = await axios.get(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`
    );
    const vehicleDetails = response.data.Results[0];

    if (vehicleDetails.ErrorCode !== "0") {
      return res.status(400).json({ message: "Unable to decode VIN" });
    }

    // Check if the vehicle exists in the database, and update or create
    let newVehicle = await Vehicle.findOne({ VIN: vin });
    if (!newVehicle) {
      newVehicle = new Vehicle({
        VIN,
        make: vehicleDetails.Make,
        model: vehicleDetails.Model,
        year: vehicleDetails.ModelYear,
        engine: vehicleDetails.EngineModel,
        bodyType: vehicleDetails.BodyClass,
        transmission: req.body.transmission || "Unknown", // User input
        drivetrain: req.body.drivetrain || "Unknown", // User input
        fuelType: req.body.fuelType || "Unknown", // User input
        exteriorColor: req.body.exteriorColor || "Unknown", // User input
        interiorColor: req.body.interiorColor || "Unknown", // User input
        mileage: req.body.mileage || 0, // User input
        features: req.body.features || [], // User input for features
        tenant: tenantId,
      });
    } else {
      // Update existing vehicle entry
      newVehicle.make = vehicleDetails.Make;
      newVehicle.model = vehicleDetails.Model;
      newVehicle.year = vehicleDetails.ModelYear;
      newVehicle.engine = vehicleDetails.EngineModel;
      newVehicle.bodyType = vehicleDetails.BodyClass;
    }

    await newVehicle.save();

    // Link the media entry to the new vehicle
    media.vehicleId = newVehicle._id;
    await media.save();

    // Return vehicle details along with media
    return res.status(200).json({
      message: "VIN extracted, vehicle details decoded, and media linked successfully",
      vehicle: newVehicle,
      media,
    });
  } catch (error) {
    console.error("[ERROR] Extracting and decoding VIN:", error);
    res.status(500).json({ message: "Error extracting and decoding VIN", error });
  }
};

// Decode VIN using NHTSA API (manual input)
exports.decodeVIN = async (req, res) => {
  try {
    const { vin } = req.body; // VIN manually entered by the user

    if (!vin || vin.length !== 17) {
      return res.status(400).json({ message: "Invalid VIN. It must be 17 characters." });
    }

    // Request to NHTSA API to decode VIN
    const response = await axios.get(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`);
    const vehicleDetails = response.data.Results[0];

    if (vehicleDetails.ErrorCode === "0") {
      return res.status(200).json({
        message: "VIN decoded successfully",
        data: vehicleDetails,
      });
    } else {
      return res.status(400).json({ message: "Unable to decode VIN" });
    }
  } catch (error) {
    console.error("[ERROR] Decoding VIN:", error);
    return res.status(500).json({ message: "Error decoding VIN", error });
  }
};