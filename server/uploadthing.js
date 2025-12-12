
import { createUploadthing } from "uploadthing/express";
 
const f = createUploadthing();
 
export const uploadRouter = {
  // Define a route for general attachments (images/videos/docs)
  attachmentUploader: f({
    image: { maxFileSize: "16MB", maxFileCount: 5 },
    video: { maxFileSize: "64MB", maxFileCount: 2 },
    pdf: { maxFileSize: "8MB", maxFileCount: 5 },
    text: { maxFileSize: "2MB", maxFileCount: 5 },
  })
    .middleware(async ({ req, res }) => {
      // Verify Clerk session for authenticated uploads
      try {
        // Get Clerk auth from request headers
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          throw new Error("No authorization header");
        }
        
        // In production, verify Clerk session token here
        // For now, extract userId from header if available
        // TODO: Implement full Clerk session verification with @clerk/clerk-sdk-node
        const userId = req.headers['x-user-id'] || "authenticated_user";
        
        return { userId };
      } catch (error) {
        console.error("UploadThing auth error:", error);
        throw new Error("Unauthorized: Please sign in to upload files");
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload completed for userId:", metadata.userId);
      console.log("file url", file.url);
      // You could trigger webhooks or DB updates here if needed
    }),
};
