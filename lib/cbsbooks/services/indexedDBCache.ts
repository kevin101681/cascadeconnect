/**
 * IndexedDB Cache Service for CBS Books
 * Provides much larger storage capacity than localStorage (typically hundreds of MBs vs 5-10MB)
 * Used for caching large datasets like invoices and expenses
 */

const DB_NAME = 'CBSBooksCache';
const DB_VERSION = 1;
const STORE_NAME = 'cache';

interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
}

class IndexedDBCache {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB connection
   */
  private async init(): Promise<void> {
    if (this.db) return;
    
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not available'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Set cache entry
   */
  async set(key: string, data: any): Promise<void> {
    try {
      await this.init();
      
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const entry: CacheEntry = {
        key,
        data,
        timestamp: Date.now()
      };

      return new Promise((resolve, reject) => {
        const request = store.put(entry);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to cache in IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Get cache entry
   */
  async get<T = any>(key: string, maxAge?: number): Promise<T | null> {
    try {
      await this.init();
      
      if (!this.db) {
        return null;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      return new Promise((resolve, reject) => {
        const request = store.get(key);
        
        request.onsuccess = () => {
          const entry = request.result as CacheEntry | undefined;
          
          if (!entry) {
            resolve(null);
            return;
          }

          // Check if entry is expired
          if (maxAge && Date.now() - entry.timestamp > maxAge) {
            // Delete expired entry
            this.delete(key).catch(() => {});
            resolve(null);
            return;
          }

          resolve(entry.data);
        };
        
        request.onerror = () => {
          console.error('Failed to get from IndexedDB:', request.error);
          resolve(null);
        };
      });
    } catch (error) {
      console.error('Failed to get from IndexedDB:', error);
      return null;
    }
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<void> {
    try {
      await this.init();
      
      if (!this.db) {
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      return new Promise((resolve, reject) => {
        const request = store.delete(key);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to delete from IndexedDB:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      await this.init();
      
      if (!this.db) {
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      return new Promise((resolve, reject) => {
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to clear IndexedDB:', error);
    }
  }

  /**
   * Get cache age in milliseconds
   */
  async getAge(key: string): Promise<number | null> {
    try {
      await this.init();
      
      if (!this.db) {
        return null;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      return new Promise((resolve, reject) => {
        const request = store.get(key);
        
        request.onsuccess = () => {
          const entry = request.result as CacheEntry | undefined;
          
          if (!entry) {
            resolve(null);
            return;
          }

          resolve(Date.now() - entry.timestamp);
        };
        
        request.onerror = () => {
          console.error('Failed to get age from IndexedDB:', request.error);
          resolve(null);
        };
      });
    } catch (error) {
      console.error('Failed to get age from IndexedDB:', error);
      return null;
    }
  }
}

// Export singleton instance
export const idbCache = new IndexedDBCache();

