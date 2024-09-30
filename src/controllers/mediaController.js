const Media = require("../models/media");
const Vehicle = require("../models/vehicle");
const AWS = require("aws-sdk");

// Configure AWS SDK for DigitalOcean Spaces
const spacesEndpoint = new AWS.Endpoint(process.env.DO_SPACES_ENDPOINT);
const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.DO_SPACES_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET,
});

// Add media (photos/documents) for a vehicle
exports.addMedia = async (req, res) => {
  try {
    const tenantId = req.headers["x-tenant-id"];
    if (!tenantId) {
      return res.status(400).json({ message: "x-tenant-id header is missing" });
    }

    const { vehicleId } = req.params;

    // Ensure the vehicle exists and belongs to the tenant
    const vehicle = await Vehicle.findOne({ _id: vehicleId, tenant: tenantId });
    if (!vehicle) {
      return res
        .status(404)
        .json({ message: "Vehicle not found or access denied" });
    }

    const uploadedMediaUrls = [];

    // Upload each file to DigitalOcean Spaces
    for (const file of req.files) {
      const uploadParams = {
        Bucket: process.env.DO_SPACES_BUCKET,
        Key: `${vehicleId}/${Date.now()}_${file.originalname}`,
        Body: file.buffer,
        ACL: "public-read",
        ContentType: file.mimetype,
      };

      const result = await s3.upload(uploadParams).promise();
      uploadedMediaUrls.push(result.Location); // Store the public URL of the uploaded file
    }

    let media = await Media.findOne({ vehicleId });
    if (!media) {
      media = new Media({
        tenantId, // Add tenantId here for future reference
        vehicleId,
        photos: uploadedMediaUrls,
        documents: [],
      });
    } else {
      media.photos = media.photos.concat(uploadedMediaUrls);
    }

    await media.save();

    res.status(201).json({ message: "Media uploaded successfully", media });
  } catch (error) {
    console.error("[ERROR] Adding media:", error.message); // Log the error message
    res
      .status(500)
      .json({ message: "Error adding media", error: error.message });
  }
};
exports.addTenantMedia = async (req, res) => {
  try {
    // Log the files received by Multer
    console.log("Uploaded files:", req.files);

    // Get tenantId from the URL params
    const tenantId = req.params.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: "tenantId is missing" });
    }

    // Ensure files are present
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
        ACL: "public-read", // Make files publicly readable
        ContentType: file.mimetype,
      };

      // Try to upload the file to DigitalOcean Spaces (S3)
      try {
        const result = await s3.upload(uploadParams).promise();
        uploadedMediaUrls.push(result.Location); // Store the public URL of the uploaded file
      } catch (uploadError) {
        console.error("Error uploading file to DO Spaces:", uploadError);
        return res
          .status(500)
          .json({ message: "Error uploading file", uploadError });
      }
    }

    // Create a new media document in the database for the tenant
    const media = new Media({
      tenantId, // Store media under tenantId
      photos: uploadedMediaUrls,
      documents: [], // You can add document upload support later if needed
    });

    await media.save();

    // Respond with success message
    res.status(201).json({ message: "Media uploaded successfully", media });
  } catch (error) {
    console.error("[ERROR] Adding tenant media:", error);
    res.status(500).json({ message: "Error adding media", error });
  }
};


// Get all media for a tenant
exports.getTenantMedia = async (req, res) => {
  try {
    // Get tenantId from the x-tenant-id header
    const tenantId = req.headers["x-tenant-id"];
    if (!tenantId) {
      return res.status(400).json({ message: "x-tenant-id header is missing" });
    }

    // Fetch all media related to the tenant
    const media = await Media.find({ tenantId });

    if (!media || media.length === 0) {
      return res
        .status(404)
        .json({ message: "No media found for this tenant" });
    }

    res.status(200).json({ media });
  } catch (error) {
    console.error("[ERROR] Retrieving tenant media:", error);
    res.status(500).json({ message: "Error retrieving media", error });
  }
};

// Get all media (photos/documents) for a vehicle
exports.getMedia = async (req, res) => {
  try {
    const { tenantId, vehicleId } = req.params;

    // Fetch all media associated with the vehicleId and tenantId
    const media = await Media.find({
      tenantId: tenantId,
      vehicleId: vehicleId,
    });

    if (!media || media.length === 0) {
      return res
        .status(404)
        .json({ message: "No media found for this vehicle" });
    }

    // Return all media related to the vehicle
    res.status(200).json({ media });
  } catch (error) {
    console.error("[ERROR] Fetching media for vehicle:", error);
    res.status(500).json({ message: "Error fetching media", error });
  }
};

// Get all media for a tenant (unassigned and assigned to vehicles)
exports.getTenantMedia = async (req, res) => {
  try {
    const { tenantId } = req.params;

    // Find all media for the tenant, whether it's assigned to a vehicle or not
    const media = await Media.find({ tenantId });

    if (!media || media.length === 0) {
      return res
        .status(404)
        .json({ message: "No media found for this tenant" });
    }

    res.status(200).json({ media });
  } catch (error) {
    console.error("[ERROR] Retrieving tenant media:", error);
    res.status(500).json({ message: "Error retrieving media", error });
  }
};

// Delete a media file (photo/document) from DigitalOcean Spaces and the database
exports.deleteMedia = async (req, res) => {
  try {
    const { tenantId, mediaId } = req.params;

    // Find the media entry by mediaId
    const media = await Media.findOne({ _id: mediaId });
    if (!media) {
      return res.status(404).json({ message: "Media not found" });
    }

    // Check if the media belongs to the tenant's vehicle
    const vehicle = await Vehicle.findOne({
      _id: media.vehicleId,
      tenant: tenantId,
    });
    if (!vehicle) {
      return res.status(403).json({
        message: "Access denied. Media does not belong to the tenant.",
      });
    }

    // Remove the media file from DigitalOcean Spaces
    for (const fileUrl of media.photos) {
      const fileName = fileUrl.split("/").pop(); // Extract file name from the URL

      await s3
        .deleteObject({
          Bucket: process.env.DO_SPACES_BUCKET,
          Key: `${media.vehicleId}/${fileName}`, // Construct the file key from the vehicleId and file name
        })
        .promise();
    }

    // Remove the media entry from the database
    await Media.deleteOne({ _id: mediaId });

    res.status(200).json({ message: "Media deleted successfully" });
  } catch (error) {
    console.error("[ERROR] Deleting media:", error);
    res.status(500).json({ message: "Error deleting media", error });
  }
};
exports.bulkAssignMediaToVehicle = async (req, res) => {
  try {
    const { tenantId, vehicleId } = req.params;
    const { mediaIds } = req.body; // Array of media IDs that the tenant selected

    // Validate input
    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return res
        .status(400)
        .json({ message: "mediaIds must be a non-empty array" });
    }

    // Ensure the vehicle exists and belongs to the tenant
    const vehicle = await Vehicle.findOne({ _id: vehicleId, tenant: tenantId });
    if (!vehicle) {
      return res
        .status(404)
        .json({ message: "Vehicle not found or access denied" });
    }

    // Find media that belongs to the tenant and hasn't already been assigned to a vehicle
    const media = await Media.find({
      _id: { $in: mediaIds },
      tenantId: tenantId,
    });

    if (!media || media.length === 0) {
      return res
        .status(404)
        .json({ message: "No media found for this tenant" });
    }

    // Update the selected media items to associate them with the chosen vehicle
    const updateResult = await Media.updateMany(
      { _id: { $in: mediaIds }, tenantId: tenantId },
      { $set: { vehicleId: vehicleId } }
    );

    // Return success message and updated count
    res.status(200).json({
      message: "Media successfully assigned to vehicle",
      updatedCount: updateResult.nModified,
    });
  } catch (error) {
    console.error("[ERROR] Bulk assigning media to vehicle:", error);
    res
      .status(500)
      .json({ message: "Error assigning media to vehicle", error });
  }
};;
