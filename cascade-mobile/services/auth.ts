import { useAuth as useClerkAuth } from '@clerk/clerk-expo';

/**
 * Auth service wrapper for Clerk
 */
export function useAuth() {
  const { getToken, isSignedIn, userId, isLoaded } = useClerkAuth();

  /**
   * Get the current session token for API calls
   */
  const getAuthToken = async (): Promise<string | null> => {
    try {
      const token = await getToken();
      return token;
    } catch (error) {
      console.error('[Auth] Failed to get token:', error);
      return null;
    }
  };

  return {
    getAuthToken,
    isSignedIn,
    userId,
    isLoaded,
  };
}
