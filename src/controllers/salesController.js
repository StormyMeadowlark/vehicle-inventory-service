const mongoose = require("mongoose");
const Vehicle = require("../models/vehicle");
const Sales = require("../models/sales");
const axios = require("axios");
const XLSX = require("xlsx");
const puppeteer = require("puppeteer");
const { Parser } = require("json2csv");

exports.addSale = async (req, res) => {
  try {
    // Extract the tenant ID from headers
    const tenantId = req.headers["x-tenant-id"];
    if (!tenantId) {
      console.log("[ERROR] x-tenant-id header is missing");
      return res.status(400).json({ message: "x-tenant-id header is missing" });
    }

    // Extract vehicle ID from the URL parameters and sale details from the request body
    const {
      salePrice,
      condition,
      status,
      marketingChannels,
      description,
      vehicleId,
    } = req.body;

    console.log("[DEBUG] Sale details:", {
      salePrice,
      condition,
      status,
      marketingChannels,
      description,
    });

    // Get the user ID of the person making the request from the auth middleware
    const listedBy = req.user._id;

    // Check if the vehicle exists and is associated with the correct tenant
    const vehicle = await Vehicle.findOne({ _id: vehicleId, tenant: tenantId });
    if (!vehicle) {
      console.log(
        "[ERROR] Vehicle not found for vehicleId:",
        vehicleId,
        "and tenantId:",
        tenantId
      );
      return res
        .status(404)
        .json({ message: "Vehicle not found for this tenant" });
    }

    // Check if a sale already exists for the vehicle and tenant
    const existingSale = await Sales.findOne({ vehicleId, tenantId });
    if (existingSale) {
      console.log(
        "[ERROR] Sale already exists for vehicleId:",
        vehicleId,
        "and tenantId:",
        tenantId
      );
      return res.status(400).json({
        message: "Sale already exists for this vehicle under this tenant",
      });
    }

    // Create a new sale record, including the tenantId to associate the sale with the tenant
    const newSale = new Sales({
      tenantId, // Include tenantId in the sale record
      vehicleId, // Associate the sale with the vehicle
      salePrice, // Sale price of the vehicle
      condition, // Condition of the vehicle
      status, // Sale status (available, sold, etc.)
      marketingChannels, // Marketing channels used for the sale
      description, // Description for the sale
      listedBy, // The user who listed the vehicle
    });

    // Save the sale record to the database
    await newSale.save();
    console.log("[SUCCESS] Sale added successfully:", newSale);

    // Send a success response
    res.status(201).json({ message: "Sale added successfully", sale: newSale });
  } catch (error) {
    console.error("[ERROR] Adding sale:", error);
    // Handle any errors during the process
    res
      .status(500)
      .json({ message: "Error adding sale", error: error.message });
  }
};

// Get sale details for a specific vehicle
exports.getSaleDetails = async (req, res) => {
  try {
    const { tenantId, vehicleId } = req.params;

    // Debugging logs
    console.log("[DEBUG] Received request with vehicleId:", vehicleId);
    console.log("[DEBUG] Received request with tenantId:", tenantId);

    // Correct the query to use 'tenantId' instead of 'tenant'
    const sale = await Sales.findOne({
      vehicleId,
      tenantId: tenantId,
    }).populate("vehicleId");

    if (!sale) {
      console.log(
        "[DEBUG] No sale found for vehicleId:",
        vehicleId,
        "and tenantId:",
        tenantId
      );
      return res
        .status(404)
        .json({ message: "Sale not found for the vehicle" });
    }

    // Fetch user details from the microservice, if needed (log user response)
    // Construct response and send it back
    console.log("[DEBUG] Found sale:", sale);
    res.status(200).json(sale);
  } catch (error) {
    console.error("[ERROR] Retrieving sale details:", error);
    res.status(500).json({ message: "Error retrieving sale details", error });
  }
};
// Update sale details
exports.updateSale = async (req, res) => {
  try {
    const { tenantId, saleId } = req.params;
    const updatedData = req.body;

    // Log the incoming update request for debugging
    console.log("[DEBUG] tenantId:", tenantId, "saleId:", saleId);
    console.log("[DEBUG] Updated data:", updatedData);

    // Query by saleId and tenantId (ensure you are using 'tenantId')
    const sale = await Sales.findOne({ _id: saleId, tenantId: tenantId });

    if (!sale) {
      console.log(
        "[ERROR] Sale not found for saleId:",
        saleId,
        "and tenantId:",
        tenantId
      );
      return res.status(404).json({ message: "Sale not found" });
    }

    // Update the sale record with the new data
    const updatedSale = await Sales.findOneAndUpdate(
      { _id: saleId, tenantId: tenantId }, // Use tenantId here instead of tenant
      updatedData,
      { new: true } // Return the updated document
    );

    console.log("[SUCCESS] Sale updated successfully:", updatedSale);

    // Send the success response with the updated sale
    res
      .status(200)
      .json({ message: "Sale updated successfully", sale: updatedSale });
  } catch (error) {
    console.error("[ERROR] Updating sale:", error);
    res
      .status(500)
      .json({ message: "Error updating sale", error: error.message });
  }
};
// Delete sale details
exports.deleteSale = async (req, res) => {
  try {
    const { tenantId, saleId } = req.params;

    // Ensure you're using 'tenantId' instead of 'tenant'
    const deletedSale = await Sales.findOneAndDelete({
      _id: saleId,
      tenantId: tenantId,
    });

    if (!deletedSale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    res.status(200).json({ message: "Sale deleted successfully" });
  } catch (error) {
    console.error("[ERROR] Deleting sale:", error);
    res.status(500).json({ message: "Error deleting sale", error });
  }
};

// Get all sales for a tenant
exports.getAllSales = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Get the authorization token from the request headers
    const authToken = req.headers.authorization;
    if (!authToken) {
      return res
        .status(401)
        .json({ message: "Authorization token is missing" });
    }

    // Query sales with tenantId
    const sales = await Sales.paginate(
      { tenantId: tenantId },
      {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        populate: "vehicleId", // Populate vehicle info
      }
    );

    // Function to fetch a user from the User Management Service
    const fetchUser = async (userId) => {
      try {
        const userResponse = await axios.get(
          `${process.env.USER_SERVICE_URL}/${tenantId}/${userId}`, // Correct endpoint
          {
            headers: {
              Authorization: authToken, // Pass Authorization token
              "x-tenant-id": tenantId,
            },
          }
        );
        return userResponse.data.user;
      } catch (error) {
        console.error(`[ERROR] Fetching user ${userId}:`, error.message);
        return null; // Return null if user fetch fails
      }
    };

    // Iterate through sales and fetch listedBy, soldBy, buyer users independently
    const salesWithUserDetails = await Promise.all(
      sales.docs.map(async (sale) => {
        const listedBy = sale.listedBy ? await fetchUser(sale.listedBy) : null;
        const soldBy = sale.soldBy ? await fetchUser(sale.soldBy) : null;
        const buyer = sale.buyer ? await fetchUser(sale.buyer) : null;

        return {
          ...sale.toObject(),
          listedBy,
          soldBy,
          buyer,
        };
      })
    );

    // Return the sales data with user details
    res.status(200).json({
      sales: {
        ...sales,
        docs: salesWithUserDetails,
      },
    });
  } catch (error) {
    console.error("[ERROR] Retrieving sales:", error);
    res.status(500).json({ message: "Error retrieving sales", error });
  }
};

// Filter sales by status
exports.getSalesByStatus = async (req, res) => {
  try {
    const { tenantId, status } = req.params;

    // Validate status
    const validStatuses = ["available", "sold", "pending_sale", "reserved"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status: ${status}. Allowed statuses are: ${validStatuses.join(
          ", "
        )}`,
      });
    }

    // Query sales with tenantId and status
    const sales = await Sales.find({ tenantId, status }).populate("vehicleId");

    if (!sales.length) {
      return res
        .status(404)
        .json({ message: `No sales found for status: ${status}` });
    }

    // Fetch the user details for each sale (listedBy, soldBy, buyer)
    const salesWithUserDetails = await Promise.all(
      sales.map(async (sale) => {
        const userIds = [sale.listedBy, sale.soldBy, sale.buyer].filter(
          Boolean
        );
        const userDetails = {};

        if (userIds.length > 0) {
          await Promise.all(
            userIds.map(async (userId) => {
              try {
                const userResponse = await axios.get(
                  `${process.env.USER_SERVICE_URL}/${tenantId}/${userId}`,
                  {
                    headers: {
                      Authorization: req.header("Authorization"), // Use authorization token from the request
                      "x-tenant-id": tenantId, // Include tenant ID as a header
                    },
                  }
                );
                userDetails[userId] = userResponse.data.user;
              } catch (err) {
                console.error(
                  `[ERROR] Fetching user details for userId: ${userId}`,
                  err.message
                );
              }
            })
          );
        }

        return {
          ...sale._doc, // Spread sale data
          listedBy: userDetails[sale.listedBy] || null,
          soldBy: userDetails[sale.soldBy] || null,
          buyer: userDetails[sale.buyer] || null,
        };
      })
    );

    res.status(200).json({ sales: salesWithUserDetails });
  } catch (error) {
    console.error("[ERROR] Filtering sales by status:", error);
    res.status(500).json({ message: "Error filtering sales by status", error });
  }
};

// Generate sales report
exports.getSalesReport = async (req, res) => {
  try {
    const { tenantId } = req.params;

    // Comprehensive aggregation report
    const report = await Sales.aggregate([
      { $match: { tenantId: mongoose.Types.ObjectId(tenantId) } }, // Match the tenant

      // Group by status (available, sold, pending_sale, reserved)
      {
        $group: {
          _id: "$status",
          totalSales: { $sum: "$salePrice" }, // Total sales amount per status
          averageSalePrice: { $avg: "$salePrice" }, // Average sale price per status
          count: { $sum: 1 }, // Number of sales per status
          vehicles: { $push: "$vehicleId" }, // Collect the vehicle IDs for further details
        },
      },

      // Lookup vehicle details (make, model, year, mileage) for each sale
      {
        $lookup: {
          from: "vehicles", // Referencing the vehicles collection
          localField: "vehicles", // Match vehicleId
          foreignField: "_id", // Vehicle _id in the vehicles collection
          as: "vehicleDetails", // Store the vehicle details here
        },
      },

      // Group by vehicle condition (new, used, certified_preowned)
      {
        $group: {
          _id: { status: "$_id", condition: "$vehicleDetails.condition" },
          totalRevenue: { $sum: "$totalSales" }, // Total revenue by condition
          averageSalePrice: { $avg: "$averageSalePrice" }, // Average sale price by condition
          vehicleCount: { $sum: "$count" }, // Total number of vehicles sold by condition
          vehicleDetails: { $first: "$vehicleDetails" }, // Vehicle details by condition
        },
      },

      // Add breakdown by marketing channel
      {
        $unwind: "$vehicleDetails", // Unwind the vehicle details
      },
      {
        $unwind: "$vehicleDetails.marketingChannels", // Unwind the marketing channels
      },
      {
        $group: {
          _id: {
            status: "$_id.status",
            condition: "$_id.condition",
            marketingChannel: "$vehicleDetails.marketingChannels",
          },
          totalRevenue: { $sum: "$totalRevenue" }, // Total revenue by marketing channel
          averageSalePrice: { $avg: "$averageSalePrice" }, // Average sale price by marketing channel
          vehicleCount: { $sum: "$vehicleCount" }, // Vehicle count by marketing channel
          vehicleDetails: { $first: "$vehicleDetails" }, // Include vehicle details
        },
      },

      // Final projection for a cleaner report
      {
        $project: {
          status: "$_id.status",
          condition: "$_id.condition",
          marketingChannel: "$_id.marketingChannel",
          totalRevenue: 1,
          averageSalePrice: 1,
          vehicleCount: 1,
          vehicleDetails: {
            make: "$vehicleDetails.make",
            model: "$vehicleDetails.model",
            year: "$vehicleDetails.year",
            mileage: "$vehicleDetails.mileage",
          },
        },
      },
    ]);

    res.status(200).json({ report });
  } catch (error) {
    console.error("[ERROR] Generating sales report:", error);
    res.status(500).json({ message: "Error generating sales report", error });
  }
};

// Search sales by various parameters
exports.searchSales = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { make, model, year, priceRange, status } = req.query;

    // Build the base query with tenantId
    let query = { tenantId: tenantId };

    // Add filters if provided
    if (make) query["vehicleId.make"] = new RegExp(make, "i"); // Case-insensitive search for make
    if (model) query["vehicleId.model"] = new RegExp(model, "i"); // Case-insensitive search for model
    if (year) query["vehicleId.year"] = year; // Exact match for year
    if (status) query.status = status; // Sale status filter

    // Parse the price range if provided
    if (priceRange) {
      const [minPrice, maxPrice] = priceRange.split("-");
      query.salePrice = {
        ...(minPrice && { $gte: parseFloat(minPrice) }),
        ...(maxPrice && { $lte: parseFloat(maxPrice) }),
      };
    }

    // Validate that tenantId and at least one query parameter is provided
    if (!tenantId || Object.keys(req.query).length === 0) {
      return res.status(400).json({
        message:
          "tenantId and at least one search filter (make, model, year, priceRange, or status) are required",
      });
    }

    // Execute the query and populate related fields (vehicle, listedBy, soldBy, buyer)
    const sales = await Sales.find(query)
      .populate("vehicleId", "make model year mileage") // Populate vehicle with selected fields
      .populate("listedBy", "username email")
      .populate("soldBy", "username email")
      .populate("buyer", "username email");

    // If no sales found, return a 404 status
    if (!sales || sales.length === 0) {
      return res
        .status(404)
        .json({ message: "No sales found for the given filters" });
    }

    // Respond with the filtered sales
    res.status(200).json({ sales });
  } catch (error) {
    console.error("[ERROR] Searching sales:", error);
    res.status(500).json({ message: "Error searching sales", error });
  }
};
exports.getInventoryReport = async (req, res) => {
  try {
    const tenantId = req.headers["x-tenant-id"];
    if (!tenantId) {
      return res.status(400).json({ message: "x-tenant-id header is missing" });
    }

    // Get total vehicles
    const totalVehicles = await Vehicle.countDocuments({ tenant: tenantId });

    // Get available vehicles for sale
    const availableVehicles = await Vehicle.countDocuments({
      tenant: tenantId,
      status: "available",
    });

    // Get sold vehicles
    const soldVehicles = await Vehicle.countDocuments({
      tenant: tenantId,
      status: "sold",
    });

    // Breakdown by make
    const makeBreakdown = await Vehicle.aggregate([
      { $match: { tenant: tenantId } },
      { $group: { _id: "$make", count: { $sum: 1 } } },
    ]);

    // Inventory value breakdown by year
    const inventoryValueBreakdown = await Vehicle.aggregate([
      { $match: { tenant: tenantId, status: "available" } },
      {
        $group: {
          _id: "$year",
          totalValue: { $sum: "$salePrice" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      totalVehicles,
      availableVehicles,
      soldVehicles,
      makeBreakdown,
      inventoryValueBreakdown,
    });
  } catch (error) {
    console.error("[ERROR] Getting inventory report:", error);
    res
      .status(500)
      .json({ message: "Error generating inventory report", error });
  }
};
exports.getSalesPerformanceReport = async (req, res) => {
  try {
    const tenantId = req.headers["x-tenant-id"];
    const { startDate, endDate } = req.query;

    if (!tenantId) {
      return res.status(400).json({ message: "x-tenant-id header is missing" });
    }

    // Filter for sales within the provided date range
    const matchFilter = { tenant: tenantId, status: "sold" };
    if (startDate) matchFilter.soldOn = { $gte: new Date(startDate) };
    if (endDate)
      matchFilter.soldOn = { ...matchFilter.soldOn, $lte: new Date(endDate) };

    // Total sales count and total revenue
    const totalSales = await Vehicle.countDocuments(matchFilter);
    const totalRevenue = await Vehicle.aggregate([
      { $match: matchFilter },
      { $group: { _id: null, totalRevenue: { $sum: "$soldPrice" } } },
    ]);

    // Sales by make
    const salesByMake = await Vehicle.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$make",
          count: { $sum: 1 },
          totalRevenue: { $sum: "$soldPrice" },
        },
      },
    ]);

    res.status(200).json({
      totalSales,
      totalRevenue: totalRevenue[0]?.totalRevenue || 0,
      salesByMake,
    });
  } catch (error) {
    console.error("[ERROR] Getting sales performance report:", error);
    res
      .status(500)
      .json({ message: "Error generating sales performance report", error });
  }
};
exports.getGeneralReport = async (req, res) => {
  try {
    const tenantId = req.headers["x-tenant-id"];
    if (!tenantId) {
      return res.status(400).json({ message: "x-tenant-id header is missing" });
    }

    // Get total vehicles, total sold, and average sale price of available vehicles
    const totalVehicles = await Vehicle.countDocuments({ tenant: tenantId });
    const totalSold = await Vehicle.countDocuments({
      tenant: tenantId,
      status: "sold",
    });

    const averagePrice = await Vehicle.aggregate([
      { $match: { tenant: tenantId, status: "available" } },
      { $group: { _id: null, avgPrice: { $avg: "$salePrice" } } },
    ]);

    res.status(200).json({
      totalVehicles,
      totalSold,
      averagePrice: averagePrice[0]?.avgPrice || 0,
    });
  } catch (error) {
    console.error("[ERROR] Getting general report:", error);
    res.status(500).json({ message: "Error generating general report", error });
  }
};
exports.getInventoryReportCSV = async (req, res) => {
  try {
    const tenantId = req.headers["x-tenant-id"];
    if (!tenantId) {
      return res.status(400).json({ message: "x-tenant-id header is missing" });
    }

    const totalVehicles = await Vehicle.countDocuments({ tenant: tenantId });
    const availableVehicles = await Vehicle.countDocuments({
      tenant: tenantId,
      status: "available",
    });
    const soldVehicles = await Vehicle.countDocuments({
      tenant: tenantId,
      status: "sold",
    });
    const makeBreakdown = await Vehicle.aggregate([
      { $match: { tenant: tenantId } },
      { $group: { _id: "$make", count: { $sum: 1 } } },
    ]);

    const reportData = {
      totalVehicles,
      availableVehicles,
      soldVehicles,
      makeBreakdown,
    };

    // Convert the reportData to CSV format
    const fields = [
      "totalVehicles",
      "availableVehicles",
      "soldVehicles",
      "makeBreakdown._id",
      "makeBreakdown.count",
    ];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(reportData);

    // Set the response headers to download the file
    res.header("Content-Type", "text/csv");
    res.attachment("inventory-report.csv");
    return res.send(csv);
  } catch (error) {
    console.error("[ERROR] Exporting CSV:", error);
    res.status(500).json({ message: "Error exporting CSV", error });
  }
};
exports.getInventoryReportPDF = async (req, res) => {
  try {
    const tenantId = req.headers["x-tenant-id"];
    if (!tenantId) {
      return res.status(400).json({ message: "x-tenant-id header is missing" });
    }

    const totalVehicles = await Vehicle.countDocuments({ tenant: tenantId });
    const availableVehicles = await Vehicle.countDocuments({
      tenant: tenantId,
      status: "available",
    });
    const soldVehicles = await Vehicle.countDocuments({
      tenant: tenantId,
      status: "sold",
    });
    const makeBreakdown = await Vehicle.aggregate([
      { $match: { tenant: tenantId } },
      { $group: { _id: "$make", count: { $sum: 1 } } },
    ]);

    // HTML content to be converted to PDF
    const htmlContent = `
      <html>
        <head><title>Inventory Report</title></head>
        <body>
          <h1>Inventory Report</h1>
          <p>Total Vehicles: ${totalVehicles}</p>
          <p>Available Vehicles: ${availableVehicles}</p>
          <p>Sold Vehicles: ${soldVehicles}</p>
          <h2>Breakdown by Make</h2>
          <ul>
            ${makeBreakdown
              .map((item) => `<li>${item._id}: ${item.count}</li>`)
              .join("")}
          </ul>
        </body>
      </html>
    `;

    // Launch Puppeteer to create a PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent);

    const pdf = await page.pdf({ format: "A4" });
    await browser.close();

    // Set response headers and send PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="inventory-report.pdf"'
    );
    return res.send(pdf);
  } catch (error) {
    console.error("[ERROR] Exporting PDF:", error);
    res.status(500).json({ message: "Error exporting PDF", error });
  }
};
exports.getInventoryReportExcel = async (req, res) => {
  try {
    const tenantId = req.headers["x-tenant-id"];
    if (!tenantId) {
      return res.status(400).json({ message: "x-tenant-id header is missing" });
    }

    const totalVehicles = await Vehicle.countDocuments({ tenant: tenantId });
    const availableVehicles = await Vehicle.countDocuments({
      tenant: tenantId,
      status: "available",
    });
    const soldVehicles = await Vehicle.countDocuments({
      tenant: tenantId,
      status: "sold",
    });
    const makeBreakdown = await Vehicle.aggregate([
      { $match: { tenant: tenantId } },
      { $group: { _id: "$make", count: { $sum: 1 } } },
    ]);

    const reportData = [
      { metric: "Total Vehicles", value: totalVehicles },
      { metric: "Available Vehicles", value: availableVehicles },
      { metric: "Sold Vehicles", value: soldVehicles },
    ];

    // Add breakdown by make to the reportData
    makeBreakdown.forEach((item) => {
      reportData.push({ metric: `Make: ${item._id}`, value: item.count });
    });

    // Create a new workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(reportData);

    // Append the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Report");

    // Generate Excel file and send it
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    });

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="inventory-report.xlsx"'
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(excelBuffer);
  } catch (error) {
    console.error("[ERROR] Exporting Excel:", error);
    res.status(500).json({ message: "Error exporting Excel", error });
  }
};