
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
app.use(
  "/api/uploadthing",
  createRouteHandler({
    router: uploadRouter,
    config: { 
        uploadthingId: process.env.UPLOADTHING_APP_ID,
        uploadthingSecret: process.env.UPLOADTHING_SECRET,
    },
  })
);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Cascade Connect Backend is running" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`UploadThing endpoint active at http://localhost:${PORT}/api/uploadthing`);
});
