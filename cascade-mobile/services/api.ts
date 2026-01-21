import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://www.cascadeconnect.app';

export const API_ENDPOINTS = {
  TELNYX_TOKEN: `${API_URL}/.netlify/functions/telnyx-token`,
  CONTACT_SYNC: `${API_URL}/.netlify/functions/contact-sync`,
};

/**
 * API client with automatic authentication
 */
export class APIClient {
  /**
   * Fetch Telnyx access token
   */
  static async fetchTelnyxToken(getToken: () => Promise<string | null>): Promise<{
    token: string;
    identity: string;
  }> {
    const authToken = await getToken();
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    console.log('[API] Fetching Telnyx token...');

    const response = await fetch(API_ENDPOINTS.TELNYX_TOKEN, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Token fetch failed:', response.status, errorText);
      throw new Error(`Failed to fetch Telnyx token: ${response.status}`);
    }

    const data = await response.json();
    console.log('[API] Telnyx token received, identity:', data.identity);
    return data;
  }

  /**
   * Sync contacts to backend
   */
  static async syncContacts(
    getToken: () => Promise<string | null>,
    contacts: Array<{ name: string; phone: string }>
  ): Promise<{
    synced: number;
    skipped: number;
    errors: number;
  }> {
    const authToken = await getToken();
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    console.log('[API] Syncing contacts...', contacts.length);

    const response = await fetch(API_ENDPOINTS.CONTACT_SYNC, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contacts }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Contact sync failed:', response.status, errorText);
      throw new Error(`Failed to sync contacts: ${response.status}`);
    }

    const result = await response.json();
    console.log('[API] Contact sync complete:', result);
    return result;
  }
}
