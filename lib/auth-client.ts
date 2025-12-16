// NOTE: This file was created for Better Auth integration
// The app uses Stack Auth (Neon Auth) for authentication, but AuthScreen component
// uses this client for email/password login. If you want to use Better Auth directly, install:
// npm install better-auth

// Stub auth client for compatibility
export const authClient = {
  signIn: {
    email: async ({ email, password }: { email: string; password: string }) => {
      console.warn("Better Auth not installed. Install 'better-auth' package to enable authentication.");
      return { error: { message: "Better Auth not configured" }, data: null };
    },
    social: async ({ provider, callbackURL }: { provider: string; callbackURL: string }) => {
      console.warn("Better Auth not installed. Install 'better-auth' package to enable authentication.");
      return { error: { message: "Better Auth not configured" }, data: null };
    }
  },
  signUp: {
    email: async ({ email, password, name }: { email: string; password: string; name?: string }) => {
      console.warn("Better Auth not installed. Install 'better-auth' package to enable authentication.");
      return { error: { message: "Better Auth not configured" }, data: null };
    }
  },
  signOut: async () => {
    console.warn("Better Auth not installed. Install 'better-auth' package to enable authentication.");
  }
};
