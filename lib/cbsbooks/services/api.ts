
import { Invoice, Expense, Client } from '../types';

// --- CONFIGURATION ---

// Check if API is available (cache the result)
let apiAvailableCache: boolean | null = null;

const checkApiAvailability = async (): Promise<boolean> => {
  if (apiAvailableCache !== null) return apiAvailableCache;
  
  // 1. Allow forcing offline mode via LocalStorage
  if (typeof window !== 'undefined' && localStorage.getItem('FORCE_OFFLINE') === 'true') {
    apiAvailableCache = false;
    return false;
  }
  
  // 2. Try to check if API is available
  try {
    const res = await fetch('/api/cbsbooks/invoices', { 
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const contentType = res.headers.get('content-type') || '';
    
    // If we get JSON, API is available
    if (contentType.includes('application/json')) {
      // Also verify the response is actually JSON (not an error)
      try {
        const text = await res.text();
        JSON.parse(text); // If this succeeds, it's valid JSON
        apiAvailableCache = true;
        return true;
      } catch {
        // Response says JSON but isn't valid JSON
        apiAvailableCache = false;
        return false;
      }
    }
    
    // If HTML, it's a 404 page or error
    apiAvailableCache = false;
    return false;
  } catch (error) {
    console.warn('API availability check failed:', error);
    apiAvailableCache = false;
    return false;
  }
};

// Initialize API availability check
let USE_MOCK_DATA = true;
if (typeof window !== 'undefined') {
  checkApiAvailability().then(available => {
    USE_MOCK_DATA = !available;
    // Update the cache
    apiAvailableCache = available;
  });
}

// API Base path - Use Express server endpoints when available, fallback to Netlify Functions
const API_BASE = '/api/cbsbooks';

// --- MOCK DATABASE (LocalStorage) ---
const STORAGE_KEYS = {
  INVOICES: 'cbs_invoices',
  EXPENSES: 'cbs_expenses',
  CLIENTS: 'cbs_clients',
};

const getStorage = <T>(key: string, defaultData: T[]): T[] => {
  if (typeof window === 'undefined') return defaultData;
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultData));
    return defaultData;
  }
  return JSON.parse(stored);
};

const setStorage = <T>(key: string, data: T[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
};

const mockDelay = () => new Promise(resolve => setTimeout(resolve, 300));

// Helper to check if we should use mock data
const shouldUseMockData = async (): Promise<boolean> => {
  const apiAvailable = await checkApiAvailability();
  return !apiAvailable;
};

// --- HELPER ---
const fetchWithErrors = async (url: string, options?: RequestInit) => {
  try {
    const res = await fetch(url, options);
    
    // Handle 204 No Content (Common for Delete)
    if (res.status === 204) {
        return null;
    }

    // Check if response is HTML (likely a 404 or error page)
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      const text = await res.text();
      // If we get HTML, it's likely a 404 page or error page
      console.warn(`API endpoint returned HTML instead of JSON: ${url}`);
      throw new Error(`API endpoint not found. The server may not be running or the route doesn't exist.`);
    }

    if (!res.ok) {
      let errorMsg = res.statusText;
      try {
        const body = await res.text();
        // Try to parse JSON error if possible
        try {
          if (body) {
            const json = JSON.parse(body);
            // Check for common error fields
            if (json.error) errorMsg = json.error;
            else if (json.message) errorMsg = json.message;
          }
        } catch {
          // If body is plain text (e.g. from a 500 html page), use a snippet of it
          if (body && !body.startsWith('<!DOCTYPE')) {
             // Limit length to avoid huge HTML dumps in UI
             errorMsg = body.length > 200 ? body.substring(0, 200) + '...' : body;
          }
        }
      } catch (e) { /* ignore */ }
      
      console.error(`API Request Failed: ${url}`, errorMsg);
      throw new Error(`${errorMsg || 'Server Error'}`);
    }
    
    // Safe JSON parsing for empty bodies that aren't 204
    const text = await res.text();
    if (!text) return {};
    
    // Check if text is HTML (starts with <)
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      console.warn(`API endpoint returned HTML instead of JSON: ${url}`);
      throw new Error(`API endpoint not found. The server may not be running or the route doesn't exist.`);
    }
    
    return JSON.parse(text);
    
  } catch (err: any) {
    // Handle network errors (like offline)
    console.error("Fetch Network Error:", err);
    throw new Error(err.message || "Network Error: Could not reach server.");
  }
};

// --- API SERVICE ---

export const api = {
  get isOffline() {
    // Check if FORCE_OFFLINE is set, otherwise return cached value
    if (typeof window !== 'undefined' && localStorage.getItem('FORCE_OFFLINE') === 'true') {
      return true;
    }
    return USE_MOCK_DATA;
  },
  
  // --- INVOICES ---
  invoices: {
    list: async (forceFresh = false): Promise<Invoice[]> => {
      // Check cache first (if available and not forcing fresh)
      const cacheKey = 'cbs_invoices_cache';
      const cacheTimeKey = 'cbs_invoices_cache_time';
      const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days cache
      
      if (typeof window !== 'undefined' && !forceFresh) {
        const cached = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(cacheTimeKey);
        if (cached && cacheTime) {
          const age = Date.now() - parseInt(cacheTime);
          if (age < CACHE_DURATION) {
            console.log('✅ Using cached invoices (age:', Math.round(age / 1000 / 60), 'minutes)');
            return JSON.parse(cached);
          } else {
            console.log('⚠️ Cache expired (age:', Math.round(age / 1000 / 60 / 60), 'hours), fetching fresh data');
          }
        }
      }
      
      // Fetch from API (cache already checked above)
      const startTime = performance.now();
      try {
        const response = await fetch(`${API_BASE}/invoices`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-cache' // Always fetch fresh, but we cache the result
        });
        
        console.log('API response status:', response.status, 'ok:', response.ok);
        
        // Read the response text once
        const text = await response.text();
        console.log('Response text length:', text.length, 'first 200 chars:', text.substring(0, 200));
        
        const contentType = response.headers.get('content-type') || '';
        console.log('Content-Type:', contentType);
        
        // If status is 200, try to parse as JSON
        if (response.status === 200) {
          // Handle empty response
          if (!text || text.trim() === '') {
            console.warn('API returned 200 with empty body, returning empty array');
            apiAvailableCache = true;
            USE_MOCK_DATA = false;
            return [];
          }
          
          try {
            const data = JSON.parse(text);
            const count = Array.isArray(data) ? data.length : 0;
            const fetchTime = performance.now() - startTime;
            console.log(`✅ Fetched ${count} invoices in ${fetchTime.toFixed(0)}ms`);
            if (count === 0) {
              console.log('   ℹ️  Database is empty. If you have data in localStorage, it will migrate automatically.');
            }
            // Update cache to indicate API is available
            apiAvailableCache = true;
            USE_MOCK_DATA = false;
            const result = Array.isArray(data) ? data : [];
            
            // Cache the result (but don't fail if caching fails due to quota)
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem(cacheKey, JSON.stringify(result));
                localStorage.setItem(cacheTimeKey, Date.now().toString());
              } catch (cacheError: any) {
                // If localStorage quota exceeded, just log and continue
                if (cacheError.name === 'QuotaExceededError') {
                  console.warn('⚠️  localStorage quota exceeded, skipping cache. Data will still load from API.');
                } else {
                  console.warn('⚠️  Failed to cache data:', cacheError.message);
                }
              }
            }
            
            return result;
          } catch (parseError: any) {
            console.error('Failed to parse JSON response:', parseError.message, 'Text:', text.substring(0, 100));
            // If it's not JSON but status is 200, might be HTML
            if (text.trim().startsWith('<') || text.trim().startsWith('<!DOCTYPE')) {
              throw new Error('API returned HTML instead of JSON (endpoint may not exist)');
            }
            throw new Error(`Invalid JSON response: ${parseError.message}`);
          }
        }
        
        // If not 200, it's an error
        console.error('API returned non-200 status:', response.status);
        if (contentType.includes('application/json') || text.trim().startsWith('{')) {
          try {
            const errorData = JSON.parse(text);
            console.error('API returned error JSON:', errorData);
            throw new Error(errorData.error || errorData.message || `API error: ${response.status}`);
          } catch {
            throw new Error(`API returned ${response.status}: ${text.substring(0, 200)}`);
          }
        }
        
        // If not JSON and not 200, it's probably HTML (404 page)
        console.error('API returned non-JSON response (likely HTML):', text.substring(0, 200));
        throw new Error(`API returned ${response.status} with content-type ${contentType}. This usually means the endpoint doesn't exist.`);
      } catch (error: any) {
        // Fallback to mock data if API fails
        console.error('API failed, using mock data. Error:', error.message || error);
        apiAvailableCache = false;
        USE_MOCK_DATA = true;
        await mockDelay();
        const mockData = getStorage<Invoice>(STORAGE_KEYS.INVOICES, []);
        console.log('Returning mock data, count:', mockData.length);
        return mockData;
      }
    },
    add: async (invoice: Invoice): Promise<Invoice> => {
      try {
        const response = await fetch(`${API_BASE}/invoices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invoice),
        });
        
        if (response.ok) {
          const data = await response.json();
          apiAvailableCache = true;
          USE_MOCK_DATA = false;
          
          // Invalidate cache
          if (typeof window !== 'undefined') {
            localStorage.removeItem('cbs_invoices_cache');
            localStorage.removeItem('cbs_invoices_cache_time');
          }
          
          return data;
        }
        throw new Error(`API returned ${response.status}`);
      } catch (error) {
        console.warn('API failed, using mock data:', error);
        apiAvailableCache = false;
        USE_MOCK_DATA = true;
        await mockDelay();
        const list = getStorage<Invoice>(STORAGE_KEYS.INVOICES, []);
        list.unshift(invoice);
        setStorage(STORAGE_KEYS.INVOICES, list);
        return invoice;
      }
    },
    bulkAdd: async (invoices: Invoice[]): Promise<void> => {
      if (USE_MOCK_DATA) {
        await mockDelay();
        const list = getStorage<Invoice>(STORAGE_KEYS.INVOICES, []);
        // Efficiently prepend all at once for Mock Mode
        setStorage(STORAGE_KEYS.INVOICES, [...invoices, ...list]);
        return;
      }
      
      try {
        // Batch processing for Real API to prevent timeout/overload
        const BATCH_SIZE = 5; // Concurrency limit
        const chunks: Invoice[][] = [];
        for (let i = 0; i < invoices.length; i += BATCH_SIZE) {
          chunks.push(invoices.slice(i, i + BATCH_SIZE));
        }

        // Process sequentially chunks of concurrent requests
        for (const chunk of chunks) {
           await Promise.all(chunk.map(inv => 
               fetchWithErrors(`${API_BASE}/invoices`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(inv),
               }).catch(e => console.error(`Failed to import invoice ${inv.invoiceNumber}`, e))
           ));
        }
      } catch (error) {
        // Fallback to mock data if API fails
        console.warn('API failed, using mock data:', error);
        await mockDelay();
        const list = getStorage<Invoice>(STORAGE_KEYS.INVOICES, []);
        setStorage(STORAGE_KEYS.INVOICES, [...invoices, ...list]);
      }
    },
    update: async (invoice: Invoice): Promise<Invoice> => {
      const useMock = await shouldUseMockData();
      if (useMock) {
        await mockDelay();
        let list = getStorage<Invoice>(STORAGE_KEYS.INVOICES, []);
        list = list.map(i => i.id === invoice.id ? invoice : i);
        setStorage(STORAGE_KEYS.INVOICES, list);
        return invoice;
      }
      try {
        const result = await fetchWithErrors(`${API_BASE}/invoices/${invoice.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invoice),
        });
        
        // Invalidate cache
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cbs_invoices_cache');
          localStorage.removeItem('cbs_invoices_cache_time');
        }
        
        return result;
      } catch (error) {
        // Fallback to mock data if API fails
        console.warn('API failed, using mock data:', error);
        await mockDelay();
        let list = getStorage<Invoice>(STORAGE_KEYS.INVOICES, []);
        list = list.map(i => i.id === invoice.id ? invoice : i);
        setStorage(STORAGE_KEYS.INVOICES, list);
        return invoice;
      }
    },
    delete: async (id: string): Promise<void> => {
      if (USE_MOCK_DATA) {
        await mockDelay();
        let list = getStorage<Invoice>(STORAGE_KEYS.INVOICES, []);
        list = list.filter(i => i.id !== id);
        setStorage(STORAGE_KEYS.INVOICES, list);
        return;
      }
      try {
        await fetchWithErrors(`${API_BASE}/invoices/${id}`, { method: 'DELETE' });
        
        // Invalidate cache
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cbs_invoices_cache');
          localStorage.removeItem('cbs_invoices_cache_time');
        }
      } catch (error) {
        // Fallback to mock data if API fails
        console.warn('API failed, using mock data:', error);
        await mockDelay();
        let list = getStorage<Invoice>(STORAGE_KEYS.INVOICES, []);
        list = list.filter(i => i.id !== id);
        setStorage(STORAGE_KEYS.INVOICES, list);
      }
    },
    bulkDelete: async (ids: string[]): Promise<void> => {
       const useMock = await shouldUseMockData();
       if (useMock) {
        await mockDelay();
        let list = getStorage<Invoice>(STORAGE_KEYS.INVOICES, []);
        list = list.filter(i => !ids.includes(i.id));
        setStorage(STORAGE_KEYS.INVOICES, list);
        return;
      }

      try {
        // Batch Delete
        const BATCH_SIZE = 10;
        const chunks: string[][] = [];
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          chunks.push(ids.slice(i, i + BATCH_SIZE));
        }

        for (const chunk of chunks) {
          await Promise.all(chunk.map(id => 
               fetchWithErrors(`${API_BASE}/invoices/${id}`, { method: 'DELETE' })
               .catch(e => console.error(`Failed to delete invoice ${id}`, e))
          ));
        }
      } catch (error) {
        // Fallback to mock data if API fails
        console.warn('API failed, using mock data:', error);
        await mockDelay();
        let list = getStorage<Invoice>(STORAGE_KEYS.INVOICES, []);
        list = list.filter(i => !ids.includes(i.id));
        setStorage(STORAGE_KEYS.INVOICES, list);
      }
    },
    createPaymentLink: async (invoiceNumber: string, amount: number, clientName: string): Promise<string> => {
      const useMock = await shouldUseMockData();
      if (useMock) {
        await mockDelay();
        return `https://square.link/u/mock-${Math.random().toString(36).substring(7)}`;
      }
      try {
        const result = await fetchWithErrors(`${API_BASE}/create-payment-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: invoiceNumber,
            amount: amount,
            name: `Invoice ${invoiceNumber}`,
            description: `Payment for ${clientName}`
          })
        });
        return result.url;
      } catch (error) {
        console.warn('API failed, using mock payment link:', error);
        return `https://square.link/u/mock-${Math.random().toString(36).substring(7)}`;
      }
    },
    sendEmail: async (to: string, subject: string, text: string, html: string, attachment: { filename: string, data: string }) => {
        const useMock = await shouldUseMockData();
        if (useMock) {
            await mockDelay();
            console.log("Mock Email Sent:", { to, subject });
            return { message: "Mock Email Sent" };
        }
        try {
          return await fetchWithErrors(`${API_BASE}/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to, subject, text, html, attachment })
          });
        } catch (error) {
          console.warn('API failed, using mock email:', error);
          await mockDelay();
          console.log("Mock Email Sent:", { to, subject });
          return { message: "Mock Email Sent" };
        }
    }
  },

  // --- EXPENSES ---
  expenses: {
    list: async (forceFresh = false): Promise<Expense[]> => {
      // Check cache first (if available and not forcing fresh)
      const cacheKey = 'cbs_expenses_cache';
      const cacheTimeKey = 'cbs_expenses_cache_time';
      const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days cache
      
      if (typeof window !== 'undefined' && !forceFresh) {
        const cached = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(cacheTimeKey);
        if (cached && cacheTime) {
          const age = Date.now() - parseInt(cacheTime);
          if (age < CACHE_DURATION) {
            console.log('✅ Using cached expenses (age:', Math.round(age / 1000 / 60), 'minutes)');
            return JSON.parse(cached);
          }
        }
      }
      
      const useMock = await shouldUseMockData();
      if (useMock) {
        await mockDelay();
        return getStorage<Expense>(STORAGE_KEYS.EXPENSES, []);
      }
      try {
        const result = await fetchWithErrors(`${API_BASE}/expenses`);
        
        // Cache the result (but don't fail if caching fails due to quota)
        if (typeof window !== 'undefined' && Array.isArray(result)) {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(result));
            localStorage.setItem(cacheTimeKey, Date.now().toString());
          } catch (cacheError: any) {
            // If localStorage quota exceeded, just log and continue
            if (cacheError.name === 'QuotaExceededError') {
              console.warn('⚠️  localStorage quota exceeded for expenses, skipping cache. Data will still load from API.');
            } else {
              console.warn('⚠️  Failed to cache expenses:', cacheError.message);
            }
          }
        }
        
        return result;
      } catch (error) {
        console.warn('API failed, using mock data:', error);
        await mockDelay();
        return getStorage<Expense>(STORAGE_KEYS.EXPENSES, []);
      }
    },
    add: async (expense: Expense): Promise<Expense> => {
      if (USE_MOCK_DATA) {
        await mockDelay();
        const list = getStorage<Expense>(STORAGE_KEYS.EXPENSES, []);
        list.unshift(expense);
        setStorage(STORAGE_KEYS.EXPENSES, list);
        return expense;
      }
      try {
        return await fetchWithErrors(`${API_BASE}/expenses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expense),
        });
      } catch (error) {
        console.warn('API failed, using mock data:', error);
        await mockDelay();
        const list = getStorage<Expense>(STORAGE_KEYS.EXPENSES, []);
        list.unshift(expense);
        setStorage(STORAGE_KEYS.EXPENSES, list);
        return expense;
      }
    },
    bulkAdd: async (expenses: Expense[]): Promise<void> => {
      const useMock = await shouldUseMockData();
      if (useMock) {
        await mockDelay();
        const list = getStorage<Expense>(STORAGE_KEYS.EXPENSES, []);
        setStorage(STORAGE_KEYS.EXPENSES, [...expenses, ...list]);
        return;
      }

      try {
        // Batch processing for Real API
        const BATCH_SIZE = 5; 
        const chunks: Expense[][] = [];
        for (let i = 0; i < expenses.length; i += BATCH_SIZE) {
          chunks.push(expenses.slice(i, i + BATCH_SIZE));
        }

        for (const chunk of chunks) {
           await Promise.all(chunk.map(exp => 
               fetchWithErrors(`${API_BASE}/expenses`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(exp),
               }).catch(e => console.error(`Failed to import expense`, e))
           ));
        }
      } catch (error) {
        console.warn('API failed, using mock data:', error);
        await mockDelay();
        const list = getStorage<Expense>(STORAGE_KEYS.EXPENSES, []);
        setStorage(STORAGE_KEYS.EXPENSES, [...expenses, ...list]);
      }
    },
    delete: async (id: string): Promise<void> => {
      const useMock = await shouldUseMockData();
      if (useMock) {
        await mockDelay();
        let list = getStorage<Expense>(STORAGE_KEYS.EXPENSES, []);
        list = list.filter(e => e.id !== id);
        setStorage(STORAGE_KEYS.EXPENSES, list);
        return;
      }
      try {
        await fetchWithErrors(`${API_BASE}/expenses/${id}`, { method: 'DELETE' });
      } catch (error) {
        console.warn('API failed, using mock data:', error);
        await mockDelay();
        let list = getStorage<Expense>(STORAGE_KEYS.EXPENSES, []);
        list = list.filter(e => e.id !== id);
        setStorage(STORAGE_KEYS.EXPENSES, list);
      }
    },
    bulkDelete: async (ids: string[]): Promise<void> => {
      if (USE_MOCK_DATA) {
       await mockDelay();
       let list = getStorage<Expense>(STORAGE_KEYS.EXPENSES, []);
       list = list.filter(e => !ids.includes(e.id));
       setStorage(STORAGE_KEYS.EXPENSES, list);
       return;
     }

     try {
       // Batch Delete
       const BATCH_SIZE = 10;
       const chunks: string[][] = [];
       for (let i = 0; i < ids.length; i += BATCH_SIZE) {
         chunks.push(ids.slice(i, i + BATCH_SIZE));
       }

       for (const chunk of chunks) {
         await Promise.all(chunk.map(id => 
              fetchWithErrors(`${API_BASE}/expenses/${id}`, { method: 'DELETE' })
              .catch(e => console.error(`Failed to delete expense ${id}`, e))
         ));
       }
     } catch (error) {
       console.warn('API failed, using mock data:', error);
       await mockDelay();
       let list = getStorage<Expense>(STORAGE_KEYS.EXPENSES, []);
       list = list.filter(e => !ids.includes(e.id));
       setStorage(STORAGE_KEYS.EXPENSES, list);
     }
   },
  },

  // --- CLIENTS ---
  clients: {
    list: async (forceFresh = false): Promise<Client[]> => {
      // Check cache first (if available and not forcing fresh)
      const cacheKey = 'cbs_clients_cache';
      const cacheTimeKey = 'cbs_clients_cache_time';
      const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days cache
      
      if (typeof window !== 'undefined' && !forceFresh) {
        const cached = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(cacheTimeKey);
        if (cached && cacheTime) {
          const age = Date.now() - parseInt(cacheTime);
          if (age < CACHE_DURATION) {
            console.log('✅ Using cached clients (age:', Math.round(age / 1000 / 60), 'minutes)');
            return JSON.parse(cached);
          }
        }
      }
      
      try {
        const response = await fetch(`${API_BASE}/clients`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok && response.status === 200) {
          const text = await response.text();
          try {
            const data = JSON.parse(text);
            apiAvailableCache = true;
            USE_MOCK_DATA = false;
            const result = Array.isArray(data) ? data : [];
            
            // Cache the result
            if (typeof window !== 'undefined') {
              localStorage.setItem(cacheKey, JSON.stringify(result));
              localStorage.setItem(cacheTimeKey, Date.now().toString());
            }
            
            return result;
          } catch {
            throw new Error('Invalid JSON response');
          }
        }
        throw new Error(`API returned ${response.status}`);
      } catch (error) {
        console.warn('API failed, using mock data:', error);
        apiAvailableCache = false;
        USE_MOCK_DATA = true;
        await mockDelay();
        return getStorage<Client>(STORAGE_KEYS.CLIENTS, []);
      }
    },
    add: async (client: Client): Promise<Client> => {
      const useMock = await shouldUseMockData();
      if (useMock) {
        await mockDelay();
        const list = getStorage<Client>(STORAGE_KEYS.CLIENTS, []);
        list.unshift(client);
        setStorage(STORAGE_KEYS.CLIENTS, list);
        return client;
      }
      try {
        return await fetchWithErrors(`${API_BASE}/clients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(client),
        });
      } catch (error) {
        console.warn('API failed, using mock data:', error);
        await mockDelay();
        const list = getStorage<Client>(STORAGE_KEYS.CLIENTS, []);
        list.unshift(client);
        setStorage(STORAGE_KEYS.CLIENTS, list);
        return client;
      }
    },
    update: async (client: Client): Promise<Client> => {
      const useMock = await shouldUseMockData();
      if (useMock) {
        await mockDelay();
        let list = getStorage<Client>(STORAGE_KEYS.CLIENTS, []);
        list = list.map(c => c.id === client.id ? client : c);
        setStorage(STORAGE_KEYS.CLIENTS, list);
        return client;
      }
      try {
        return await fetchWithErrors(`${API_BASE}/clients/${client.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(client),
        });
      } catch (error) {
        console.warn('API failed, using mock data:', error);
        await mockDelay();
        let list = getStorage<Client>(STORAGE_KEYS.CLIENTS, []);
        list = list.map(c => c.id === client.id ? client : c);
        setStorage(STORAGE_KEYS.CLIENTS, list);
        return client;
      }
    },
    delete: async (id: string): Promise<void> => {
      const useMock = await shouldUseMockData();
      if (useMock) {
        await mockDelay();
        let list = getStorage<Client>(STORAGE_KEYS.CLIENTS, []);
        list = list.filter(c => c.id !== id);
        setStorage(STORAGE_KEYS.CLIENTS, list);
        return;
      }
      try {
        await fetchWithErrors(`${API_BASE}/clients/${id}`, { method: 'DELETE' });
      } catch (error) {
        console.warn('API failed, using mock data:', error);
        await mockDelay();
        let list = getStorage<Client>(STORAGE_KEYS.CLIENTS, []);
        list = list.filter(c => c.id !== id);
        setStorage(STORAGE_KEYS.CLIENTS, list);
      }
    },
  },
};
