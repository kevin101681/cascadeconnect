/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  readonly VITE_DATABASE_URL?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_CLOUDINARY_CLOUD_NAME?: string;
  readonly VITE_CLOUDINARY_API_KEY?: string;
  readonly VITE_CLOUDINARY_API_SECRET?: string;
  // Add other VITE_ prefixed environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}








