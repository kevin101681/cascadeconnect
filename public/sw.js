/**
 * SERVICE WORKER: PUSH NOTIFICATIONS
 * Universal push notification handler for Cascade Connect
 * Handles all 7 notification types: Claims, Appointments, Chat, Tasks, Enrollments, etc.
 * January 18, 2026
 */

// Service Worker Version
const SW_VERSION = 'v1.0.0';

console.log(`[SW ${SW_VERSION}] Service Worker initialized`);

// --- PUSH EVENT LISTENER ---
// Triggered when a push notification is received
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event);

  // Parse notification data
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    console.error('[SW] Failed to parse push data:', err);
    data = {
      title: 'New Notification',
      body: 'You have a new notification',
      url: '/dashboard',
    };
  }

  const { title, body, icon, url, badge } = data;

  // Default values
  const notificationTitle = title || 'Cascade Connect';
  const notificationOptions = {
    body: body || 'You have a new notification',
    icon: icon || '/logo.svg',
    badge: badge || '/logo.svg',
    data: {
      url: url || '/dashboard',
    },
    requireInteraction: false, // Auto-dismiss after a few seconds
    vibrate: [200, 100, 200], // Vibration pattern for mobile
    tag: 'cascade-notification', // Group notifications
  };

  console.log('[SW] Showing notification:', notificationTitle, notificationOptions);

  // Show the notification
  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

// --- NOTIFICATION CLICK LISTENER ---
// Triggered when user clicks on a notification
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification);

  // Close the notification
  event.notification.close();

  // Get the URL from the notification data
  const urlToOpen = event.notification.data?.url || '/dashboard';

  console.log('[SW] Opening URL:', urlToOpen);

  // Open/focus the app window and navigate to the URL
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Focus existing window and navigate
          return client.focus().then(() => {
            return client.navigate(urlToOpen);
          });
        }
      }

      // No window open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// --- INSTALL EVENT ---
// Triggered when the service worker is first installed
self.addEventListener('install', (event) => {
  console.log(`[SW ${SW_VERSION}] Installing...`);
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// --- ACTIVATE EVENT ---
// Triggered when the service worker becomes active
self.addEventListener('activate', (event) => {
  console.log(`[SW ${SW_VERSION}] Activating...`);
  // Claim all clients immediately
  event.waitUntil(self.clients.claim());
});

// --- FETCH EVENT (Optional) ---
// Can be used for caching strategies if needed in the future
self.addEventListener('fetch', (event) => {
  // Pass through - no caching for now
  event.respondWith(fetch(event.request));
});
