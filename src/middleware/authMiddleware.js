const jwt = require("jsonwebtoken");
const axios = require("axios");

const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      let token = req.header("Authorization");
      console.log("[AUTH] Received Authorization header:", token);

      if (!token || !token.startsWith("Bearer ")) {
        console.log("[AUTH] No or improperly formatted token provided.");
        return res
          .status(401)
          .json({ error: "No or improperly formatted token provided." });
      }

      token = token.replace(/Bearer\s+/g, "").trim();

      // Verify JWT token
      jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
          if (err.name === "TokenExpiredError") {
            console.log("[AUTH] JWT token is expired.");
            return res.status(401).json({ error: "Token expired." });
          }
          console.log("[AUTH] JWT verification error:", err.message);
          return res.status(401).json({ error: "Invalid token." });
        }

        console.log(
          "[AUTH] JWT verified successfully. Decoded payload:",
          decoded
        );

        // Attach user info to request
        req.user = { _id: decoded.userId };
        req.tenantId = decoded.tenantId;

        // Check if x-tenant-id is provided in the request headers
        const tenantId = req.headers["x-tenant-id"];
        if (!tenantId) {
          console.log("[AUTH] x-tenant-id header is missing.");
          return res
            .status(400)
            .json({ error: "x-tenant-id header is missing." });
        }

        // Fetch the user role from the external service, sending x-tenant-id as a header
        try {
          const userResponse = await axios.get(
            `${process.env.USER_SERVICE_URL}/${tenantId}/${req.user._id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "x-tenant-id": tenantId, // Include x-tenant-id header
              },
            }
          );

          // Log the user-related parts of the response
          console.log(
            "[AUTH] User Management Service Response data:",
            userResponse.data
          );

          const user = userResponse.data.data.user; // Access user via data.data.user

          if (user) {
            console.log("[AUTH] userResponse.data.data.user is defined:", user);
          } else {
            console.log("[AUTH] userResponse.data.data.user is undefined");
            return res
              .status(500)
              .json({ error: "User not found in the response." });
          }

          // Check if user exists and if user has a role
          const userRole = user && user.role;
          if (userRole) {
            console.log("[AUTH] User role is found:", userRole);
          } else {
            console.log("[AUTH] User role is missing or undefined");
            return res
              .status(500)
              .json({ error: "User role not found in the response." });
          }

          // Check if the user's role is allowed
          if (!roles.includes(userRole)) {
            console.log(
              "[AUTH] User role is not authorized. Required roles:",
              roles
            );
            return res.status(403).json({ error: "Access denied." });
          }

          // Continue to the next middleware or route handler
          next();
        } catch (fetchError) {
          console.error("[AUTH] Error fetching user role:", fetchError.message);
          return res.status(500).json({ error: "Error fetching user role." });
        }
      });
    } catch (error) {
      console.error("[AUTH] Error in authMiddleware:", error.message);
      res
        .status(500)
        .json({ error: "Internal server error in authMiddleware." });
    }
  };
};

module.exports = requireRole;