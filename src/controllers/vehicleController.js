const Vehicle = require("../models/vehicle");
const axios = require("axios");
const vision = require("@google-cloud/vision");
const Media = require("../models/media");
const AWS = require("aws-sdk");


// Add a new vehicle
exports.addVehicle = async (req, res) => {
  try {
    const tenantId = req.headers["x-tenant-id"];
    const authHeader = req.headers["authorization"]; // Get the authorization header

    if (!tenantId) {
      return res.status(400).json({ message: "x-tenant-id header is missing" });
    }

    if (!authHeader) {
      return res
        .status(401)
        .json({ message: "Authorization header is required" }); // Check for authorization
    }

    const {
      VIN,
      make,
      model,
      year,
      trim,
      engine,
      transmission,
      drivetrain,
      fuelType,
      bodyType,
      mileage,
      exteriorColor,
      interiorColor,
      users,
      features,
      dynamicFieldsData, // New field for additional dynamic data
    } = req.body;

    // Optional: Users array (only included if provided)
    const userArray = Array.isArray(users) ? users : [];

    // Optional: Features array (only included if provided)
    const featuresArray = Array.isArray(features) ? features : [];

    // Populate dynamicFields based on the dynamicFieldsData or any other logic
    const dynamicFields = {
      ...dynamicFieldsData, // Use spread operator to include all properties from dynamicFieldsData
    };

    // Create a new vehicle associated with the tenant, and optionally with users and features
    const newVehicle = new Vehicle({
      VIN,
      make,
      model,
      year,
      trim: trim || "", // Optional
      engine: engine || "", // Optional
      transmission: transmission || "", // Optional
      drivetrain: drivetrain || "", // Optional
      fuelType: fuelType || "", // Optional
      bodyType: bodyType || "", // Optional
      mileage,
      exteriorColor: exteriorColor || "", // Optional
      interiorColor: interiorColor || "", // Optional
      tenant: tenantId, // Assign the tenant ID from the request headers (required)
      users: userArray, // Optionally assign users if provided
      features: featuresArray,
      dynamicFields: dynamicFields, // Assign dynamic fields
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
    const authHeader = req.headers["authorization"]; // Ensure authHeader is declared here

    if (!tenantId) {
      return res.status(400).json({ message: "x-tenant-id header is missing" });
    }

    if (!authHeader) {
      return res
        .status(401)
        .json({ message: "Authorization header is required" });
    }

    const {
      VIN,
      make,
      model,
      year,
      trim,
      engine,
      transmission,
      drivetrain,
      fuelType,
      bodyType,
      exteriorColor,
      interiorColor,
      features,
      mileage,
      saleStatus,
      userIds,
      sortBy = "createdAt",
      sortOrder = "asc",
      page = 1,
      limit = 10,
    } = req.query;

    // Build the query object based on provided filters and tenant ID
    let query = { tenant: tenantId };

    // Add filtering based on optional fields
    if (VIN) query.VIN = VIN;
    if (make) query.make = make;
    if (model) query.model = model;
    if (year) query.year = parseInt(year);
    if (trim) query.trim = trim;
    if (engine) query.engine = engine;
    if (transmission) query.transmission = transmission;
    if (drivetrain) query.drivetrain = drivetrain;
    if (fuelType) query.fuelType = fuelType;
    if (bodyType) query.bodyType = bodyType;
    if (exteriorColor) query.exteriorColor = exteriorColor;
    if (interiorColor) query.interiorColor = interiorColor;

    // If features are provided, match at least one of them
    if (features && Array.isArray(features)) {
      query.features = { $in: features };
    }

    // If mileage is provided, apply filtering
    if (mileage) {
      const [minMileage, maxMileage] = mileage.split("-");
      query.mileage = {
        ...(minMileage && { $gte: parseInt(minMileage) }),
        ...(maxMileage && { $lte: parseInt(maxMileage) }),
      };
    }

    // Optional: Filter by user IDs if provided
    if (userIds && Array.isArray(userIds)) {
      query.users = { $in: userIds };
    }

    // Fetch user data from USER_SERVICE_URL
    const userServiceUrl = process.env.USER_SERVICE_URL; // Accessing the environment variable

    // Make sure to pass the headers with the request
    const userResponse = await axios.get(`${userServiceUrl}/${tenantId}`, {
      headers: {
        Authorization: authHeader, // Pass the authorization header
        "x-tenant-id": tenantId, // Pass the tenant ID
      },
    });

    // Assume we don't care about users for now, so we can comment this out
    // const users = userResponse.data;

    // Pagination setup and sorting options
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 },
    };

    // Use Mongoose paginate method to retrieve paginated results
    const vehicles = await Vehicle.paginate(query, options);

    // Return paginated and filtered results
    res.status(200).json({ vehicles });
  } catch (error) {
    console.error("[ERROR] Retrieving vehicles:", error);
    res.status(500).json({ message: "Error retrieving vehicles", error });
  }
};
//Not Tested
// Get details for a specific vehicle
exports.getVehicleById = async (req, res) => {
  try {
    const { tenantId, vehicleId } = req.params;

    // Ensure tenant ownership while fetching the vehicle
    const vehicle = await Vehicle.findOne({ _id: vehicleId, tenant: tenantId });

    // Check if the vehicle was found
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    // Return the vehicle details as a JSON response
    res.status(200).json({ vehicle });

    // Log the vehicle details to the console for debugging purposes
    console.log({ vehicle });
  } catch (error) {
    // Handle any errors that occur during the database query
    res
      .status(500)
      .json({ message: "Error retrieving vehicle details", error });
  }
};
// Update a vehicle
exports.updateVehicle = async (req, res) => {
  try {
    const { tenantId, vehicleId } = req.params; // Extract tenantId and vehicleId from params
    const updatedData = req.body; // Get the updated data from request body

    // Destructure fields from updatedData
    const {
      VIN,
      make,
      model,
      year,
      trim,
      engine,
      transmission,
      drivetrain,
      fuelType,
      bodyType,
      exteriorColor,
      interiorColor,
      mileage,
      features,
      dynamicFields, // Include dynamicFields from request body
    } = updatedData;

    // Optional: Validate VIN uniqueness if updated
    if (VIN) {
      const existingVehicle = await Vehicle.findOne({
        VIN,
        tenant: tenantId,
        _id: { $ne: vehicleId }, // Exclude the current vehicle ID
      });
      if (existingVehicle) {
        return res.status(400).json({ message: "VIN must be unique" });
      }
    }

    // Prepare the update data object
    const updateData = {
      ...(VIN && { VIN }), // Include VIN only if provided
      ...(make && { make }),
      ...(model && { model }),
      ...(year && { year }),
      ...(trim && { trim }),
      ...(engine && { engine }),
      ...(transmission && { transmission }),
      ...(drivetrain && { drivetrain }),
      ...(fuelType && { fuelType }),
      ...(bodyType && { bodyType }),
      ...(exteriorColor && { exteriorColor }),
      ...(interiorColor && { interiorColor }),
      ...(mileage && { mileage }),
      ...(features && { features }),
      updatedAt: Date.now(), // Update the timestamp
    };

    // Update dynamicFields only if provided
    if (dynamicFields && typeof dynamicFields === "object") {
      updateData.dynamicFields = {
        ...updateData.dynamicFields, // Retain existing dynamic fields
        ...dynamicFields, // Merge new dynamic fields
      };
    }

    // Update vehicle data in the database
    const updatedVehicle = await Vehicle.findOneAndUpdate(
      { _id: vehicleId, tenant: tenantId }, // Ensure tenant ownership
      updateData,
      { new: true, runValidators: true } // Options to return the updated document and run validators
    );

    if (!updatedVehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    res.status(200).json({
      message: "Vehicle updated successfully",
      vehicle: updatedVehicle,
    });
  } catch (error) {
    console.error("[ERROR] Updating vehicle:", error); // Log the error for debugging
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
      { softDelete: true }, // Set the isDeleted flag to true
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

    // Ensure uploaded files exist
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
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
      vehicleId: null, // If vehicleId is available, link it; otherwise, leave it null
      photos: uploadedMediaUrls,
    });

    await media.save();

    // Perform OCR to extract the VIN from the uploaded image
    const client = new vision.ImageAnnotatorClient();
    const [result] = await client.textDetection({
      image: { source: { imageUri: uploadedMediaUrls[0] } }, // Use the URL directly for OCR
    });

    const detections = result.textAnnotations;

    if (detections.length === 0) {
      return res.status(400).json({ message: "No text found in the image" });
    }

    // Extract the VIN from the OCR result
    const textFromImage = detections[0].description;
    const vinRegex = /\b[A-HJ-NPR-Z0-9]{17}\b/;
    const match = textFromImage.match(vinRegex);

    if (!match) {
      return res
        .status(400)
        .json({ message: "No valid VIN found in the image" });
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

    // Populate vehicle data from the decoded VIN
    const vehicleData = {
      VIN: vin,
      make: vehicleDetails.Make || "Unknown",
      model: vehicleDetails.Model || "Unknown",
      year: vehicleDetails.ModelYear || "Unknown",
      engine: vehicleDetails.EngineModel || "Unknown",
      bodyType: vehicleDetails.BodyClass || "Unknown",
      transmission: req.body.transmission || "Unknown",
      drivetrain: req.body.drivetrain || "Unknown",
      fuelType: req.body.fuelType || "Unknown",
      exteriorColor: req.body.exteriorColor || "Unknown",
      interiorColor: req.body.interiorColor || "Unknown",
      mileage: req.body.mileage || 0,
      features: req.body.features || [],
    };

    // Return vehicle details along with media
    return res.status(200).json({
      message: "VIN extracted and vehicle details decoded successfully",
      vehicle: vehicleData,
      media,
    });
  } catch (error) {
    console.error("[ERROR] Extracting and decoding VIN:", error);
    res
      .status(500)
      .json({ message: "Error extracting and decoding VIN", error });
  }
};



// tested
// Decode VIN using NHTSA API (manual input)
exports.decodeVIN = async (req, res) => {
  try {
    const { vin } = req.body;

    if (!vin || vin.length !== 17) {
      return res
        .status(400)
        .json({ message: "Invalid VIN. It must be 17 characters." });
    }

    const response = await axios.get(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`
    );

    if (
      !response.data ||
      !response.data.Results ||
      response.data.Results.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Invalid response from the NHTSA API." });
    }

    const vehicleDetails = response.data.Results[0];

    if (vehicleDetails.ErrorCode === "0") {
      const updatedData = {};
      const dynamicFields = {};

      const fieldMapping = {
        make: "Make",
        model: "Model",
        year: "ModelYear",
        trim: "Trim",
        engine: "EngineDescription",
        transmission: "TransmissionStyle",
        drivetrain: "DriveType",
        fuelType: "FuelTypePrimary",
        bodyType: "BodyClass",
        exteriorColor: "ExteriorColor", // Assuming NHTSA provides this
        interiorColor: "InteriorColor", // Assuming NHTSA provides this
        mileage: "Mileage", // Assuming NHTSA provides this
      };

      // Map known fields
      for (const [key, nhtsaField] of Object.entries(fieldMapping)) {
        const value = vehicleDetails[nhtsaField];
        if (value) {
          updatedData[key] = value; // Assign value if present
        }
      }

      // Gather dynamic fields
      for (const key in vehicleDetails) {
        if (
          !updatedData.hasOwnProperty(key) &&
          key !== "ErrorCode" &&
          key !== "ErrorText"
        ) {
          dynamicFields[key] = vehicleDetails[key]; // Add to dynamicFields if not already included
        }
      }

      updatedData.dynamicFields = dynamicFields; // Assign dynamic fields to the updated data
      updatedData.tenant = req.headers["x-tenant-id"]; // Ensure tenant is set

      return res.status(200).json({
        message: "VIN decoded successfully",
        data: updatedData,
      });
    } else {
      return res
        .status(400)
        .json({ message: "Unable to decode VIN", error: vehicleDetails });
    }
  } catch (error) {
    console.error("[ERROR] Decoding VIN:", error.message || error);
    return res.status(500).json({
      message: "Error decoding VIN",
      error: error.message || "Internal server error",
    });
  }
};
