
import { generateReactHelpers } from "@uploadthing/react";
import type { uploadRouter } from "../../server/uploadthing"; // Path to your server definition (types only)
 
// This creates the hooks we use in the components
export const { useUploadThing, uploadFiles } = generateReactHelpers<typeof uploadRouter>({
  url: "/api/uploadthing", // Matches the route in server/index.js
});
