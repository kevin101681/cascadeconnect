
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createRouteHandler } from "uploadthing/express";
import { uploadRouter } from "./uploadthing.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// UploadThing Route Handler
const uploadthingHandler = createRouteHandler({
  router: uploadRouter,
  config: { 
      uploadthingId: process.env.UPLOADTHING_APP_ID,
      uploadthingSecret: process.env.UPLOADTHING_SECRET,
  },
});

app.use("/api/uploadthing", uploadthingHandler);

// Error handling middleware (must be after routes)
// Note: UploadThing handles its own errors, but this catches any unhandled errors
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  if (req.path.startsWith('/api/uploadthing')) {
    res.status(500).json({ 
      error: "Upload failed", 
      message: err.message || "Internal server error",
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } else {
    res.status(500).json({ 
      error: "Server error", 
      message: err.message || "Internal server error"
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Cascade Connect Backend is running",
    uploadthingConfigured: !!(process.env.UPLOADTHING_APP_ID && process.env.UPLOADTHING_SECRET)
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`UploadThing endpoint active at http://localhost:${PORT}/api/uploadthing`);
  
  // Check if UploadThing credentials are set
  if (!process.env.UPLOADTHING_APP_ID || !process.env.UPLOADTHING_SECRET) {
    console.warn("⚠️  WARNING: UPLOADTHING_APP_ID or UPLOADTHING_SECRET not set!");
    console.warn("   Uploads will fail. Set these in your .env.local file.");
  } else {
    console.log("✅ UploadThing credentials configured");
  }
});
