
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
      // In a real production app, verify Clerk session here using @clerk/clerk-sdk-node
      // For now, we trust the request as it comes from our authenticated frontend
      return { userId: "user_id_placeholder" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload completed for userId:", metadata.userId);
      console.log("file url", file.url);
      // You could trigger webhooks or DB updates here if needed
    }),
};
