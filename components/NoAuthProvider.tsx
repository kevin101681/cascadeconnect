import React, { createContext, useContext, ReactNode } from 'react';

// Mock auth context for development mode without Better Auth
interface MockClerkContext {
  isSignedIn: boolean;
  user: null;
  isLoaded: boolean;
  signOut: () => Promise<void>;
}

const NoAuthContext = createContext<MockClerkContext | null>(null);

export const NoAuthProvider = ({ children }: { children: ReactNode }) => {
  return (
    <NoAuthContext.Provider
      value={{
        isSignedIn: false,
        user: null,
        isLoaded: true,
        signOut: async () => {},
      }}
    >
      {children}
    </NoAuthContext.Provider>
  );
};

// Export context for checking if we're in no-auth mode
export const useNoAuthContext = () => useContext(NoAuthContext);

