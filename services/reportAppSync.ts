/**
 * Service for syncing homeowners between Cascade Connect and the PDF Reports App
 * This service handles user creation and linking between the two applications
 */

import { Homeowner } from '../types';

export interface ReportAppUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  builder?: string;
  cascadeConnectHomeownerId: string; // Link back to Cascade Connect
  createdAt: Date;
}

export interface SyncResponse {
  success: boolean;
  userId?: string;
  error?: string;
  message?: string;
}

/**
 * Configuration for the PDF Reports App
 * Update these values to match your PDF Reports App's API
 */
const REPORT_APP_CONFIG = {
  // API endpoint for creating users
  apiUrl: (import.meta as any).env?.VITE_REPORT_APP_API_URL || 'http://localhost:3001/api',
  
  // API key for authentication (if required)
  apiKey: (import.meta as any).env?.VITE_REPORT_APP_API_KEY || '',
  
  // Whether to automatically sync on homeowner creation/update
  autoSync: (import.meta as any).env?.VITE_REPORT_APP_AUTO_SYNC === 'true',
};

/**
 * Creates a user in the PDF Reports App based on a Cascade Connect homeowner
 */
export const createReportAppUser = async (
  homeowner: Homeowner
): Promise<SyncResponse> => {
  try {
    // Prepare user data for the PDF Reports App
    const userData: Partial<ReportAppUser> = {
      email: homeowner.email,
      name: homeowner.name,
      phone: homeowner.phone,
      address: homeowner.address,
      builder: homeowner.builder,
      cascadeConnectHomeownerId: homeowner.id,
    };

    // Make API call to create user in PDF Reports App
    const response = await fetch(`${REPORT_APP_CONFIG.apiUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(REPORT_APP_CONFIG.apiKey && { 'Authorization': `Bearer ${REPORT_APP_CONFIG.apiKey}` }),
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const createdUser = await response.json();
    
    return {
      success: true,
      userId: createdUser.id,
      message: `User created successfully in PDF Reports App`,
    };
  } catch (error) {
    console.error('Error creating user in PDF Reports App:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
};

/**
 * Updates a user in the PDF Reports App when homeowner data changes
 */
export const updateReportAppUser = async (
  homeowner: Homeowner,
  reportAppUserId: string
): Promise<SyncResponse> => {
  try {
    const userData: Partial<ReportAppUser> = {
      email: homeowner.email,
      name: homeowner.name,
      phone: homeowner.phone,
      address: homeowner.address,
      builder: homeowner.builder,
    };

    const response = await fetch(`${REPORT_APP_CONFIG.apiUrl}/users/${reportAppUserId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(REPORT_APP_CONFIG.apiKey && { 'Authorization': `Bearer ${REPORT_APP_CONFIG.apiKey}` }),
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return {
      success: true,
      message: `User updated successfully in PDF Reports App`,
    };
  } catch (error) {
    console.error('Error updating user in PDF Reports App:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
};

/**
 * Checks if a homeowner is already linked to the PDF Reports App
 */
export const checkReportAppLink = async (
  homeownerId: string
): Promise<{ linked: boolean; userId?: string }> => {
  try {
    const response = await fetch(
      `${REPORT_APP_CONFIG.apiUrl}/users/by-cascade-id/${homeownerId}`,
      {
        headers: {
          ...(REPORT_APP_CONFIG.apiKey && { 'Authorization': `Bearer ${REPORT_APP_CONFIG.apiKey}` }),
        },
      }
    );

    if (response.ok) {
      const user = await response.json();
      return { linked: true, userId: user.id };
    }

    return { linked: false };
  } catch (error) {
    console.error('Error checking report app link:', error);
    return { linked: false };
  }
};

/**
 * Generates a deep link URL to open the PDF Reports App for a specific homeowner
 */
export const getReportAppLink = (homeownerId: string, reportAppUserId?: string): string => {
  const baseUrl = (import.meta as any).env?.VITE_REPORT_APP_URL || 'http://localhost:3001';
  const userId = reportAppUserId || homeownerId;
  return `${baseUrl}/reports?homeownerId=${userId}&cascadeId=${homeownerId}`;
};






