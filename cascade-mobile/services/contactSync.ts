import * as Contacts from 'expo-contacts';
import { APIClient } from './api';

/**
 * Contact sync service
 */
export class ContactSyncService {
  /**
   * Request contacts permission
   */
  static async requestPermission(): Promise<boolean> {
    try {
      console.log('[Contacts] Requesting permission...');
      const { status } = await Contacts.requestPermissionsAsync();
      const granted = status === 'granted';
      console.log('[Contacts] Permission:', granted ? 'granted' : 'denied');
      return granted;
    } catch (error) {
      console.error('[Contacts] Permission error:', error);
      return false;
    }
  }

  /**
   * Normalize phone number to E.164 format
   */
  static normalizePhoneNumber(phone: string): string {
    // Strip all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Add +1 if 10 digits (US number)
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    
    // Add + if 11 digits starting with 1
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    // Otherwise add + to any digit string
    return `+${digits}`;
  }

  /**
   * Get all contacts from device
   */
  static async getAllContacts(): Promise<Array<{ name: string; phone: string }>> {
    const hasPermission = await this.requestPermission();
    
    if (!hasPermission) {
      throw new Error('Contact permission denied');
    }

    console.log('[Contacts] Fetching contacts...');

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
    });

    console.log('[Contacts] Found', data.length, 'contacts');

    const formattedContacts = data
      .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
      .flatMap(contact => 
        contact.phoneNumbers!.map(phoneNumber => ({
          name: contact.name || 'Unknown',
          phone: this.normalizePhoneNumber(phoneNumber.number || ''),
        }))
      )
      .filter(contact => contact.phone && contact.phone.length > 5);

    console.log('[Contacts] Formatted', formattedContacts.length, 'phone numbers');

    return formattedContacts;
  }

  /**
   * Sync contacts to cloud backend
   */
  static async syncToCloud(getToken: () => Promise<string | null>): Promise<{
    synced: number;
    skipped: number;
    errors: number;
  }> {
    console.log('[Contacts] Starting sync to cloud...');
    
    const contacts = await this.getAllContacts();
    console.log(`[Contacts] Syncing ${contacts.length} contacts to backend...`);
    
    const result = await APIClient.syncContacts(getToken, contacts);
    
    console.log('[Contacts] Sync complete:', result);
    
    return result;
  }
}
