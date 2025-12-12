
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
      // TEMPORARILY DISABLED FOR TESTING - Allow uploads without auth
      // In production, verify Clerk session token here
      // TODO: Re-enable authentication when login is enabled
      
      try {
        // Get Clerk auth from request headers (if available)
        const authHeader = req.headers.authorization;
        const userId = req.headers['x-user-id'] || 
                      (authHeader ? "authenticated_user" : "test_user");
        
        // For testing: allow uploads without auth
        // In production, uncomment the check below:
        // if (!authHeader) {
        //   throw new Error("No authorization header");
        // }
        
        return { userId };
      } catch (error) {
        console.error("UploadThing auth error:", error);
        // For testing: allow uploads even if auth fails
        // In production, uncomment the throw below:
        // throw new Error("Unauthorized: Please sign in to upload files");
        return { userId: "test_user" };
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload completed for userId:", metadata.userId);
      console.log("file url", file.url);
      // You could trigger webhooks or DB updates here if needed
      return { uploadedBy: metadata.userId };
    }),
};
