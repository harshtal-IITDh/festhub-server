import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// Core middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check route — useful to confirm server is alive
app.get("/api/health", (req, res) => {
  res
    .status(200)
    .json({ status: "ok", message: "Harshtal backend is running" });
});

// Routes will be mounted here as we build them
// e.g. app.use("/api/auth", authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handlerr
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message || "Internal Server Error",
  });
});

export default app;
