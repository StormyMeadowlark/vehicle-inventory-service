const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const vehicleRoutes = require("./src/routes/vehicleRoutes");
//const serviceRoutes = require("./src/routes/serviceRoutes");
//const salesRoutes = require("./src/routes/salesRoutes");
const mediaRoutes = require("./src/routes/mediaRoutes");
//const acquisitionRoutes = require("./src/routes/acquisitionRoutes");

// Initialize the app
const app = express();

// Middleware
app.use(cors()); // Allow cross-origin requests
app.use(helmet()); // Secure HTTP headers
app.use(express.json()); // Parse JSON request body
app.use(morgan("dev")); // Log HTTP requests

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/vehicles", vehicleRoutes);
//app.use("/api/services", serviceRoutes);
//app.use("/api/sales", salesRoutes);
app.use("/api/media", mediaRoutes);
//app.use("/api/acquisition", acquisitionRoutes);

// Error Handling for undefined routes
app.use((req, res, next) => {
  const error = new Error("Not Found");
  error.status = 404;
  next(error);
});

// General Error Handling
app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({
    error: {
      message: error.message,
    },
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
