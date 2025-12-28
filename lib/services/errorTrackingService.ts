/**
 * ERROR TRACKING SERVICE
 * Centralized error logging and monitoring (Sentry-ready)
 * Follows .cursorrules: Type safety, structured logging
 */

// ==========================================
// TYPES & INTERFACES
// ==========================================

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface ErrorContext {
  userId?: string;
  homeownerId?: string;
  claimId?: string;
  callId?: string;
  component?: string;
  service?: string;
  endpoint?: string;
  operation?: string;
  [key: string]: any;
}

export interface ErrorLog {
  message: string;
  severity: ErrorSeverity;
  timestamp: Date;
  context?: ErrorContext;
  stack?: string;
  fingerprint?: string[];
}

// ==========================================
// CONFIGURATION
// ==========================================

/**
 * Check if Sentry is configured
 */
export function isSentryConfigured(): boolean {
  return !!(
    typeof window !== 'undefined' && 
    process.env.NEXT_PUBLIC_SENTRY_DSN || 
    process.env.SENTRY_DSN
  );
}

/**
 * Get Sentry DSN
 */
function getSentryDSN(): string | null {
  return process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || null;
}

/**
 * Get environment name
 */
function getEnvironment(): string {
  return process.env.NODE_ENV || process.env.NETLIFY_ENV || 'development';
}

// ==========================================
// ERROR LOGGING
// ==========================================

/**
 * Log an error with context
 * Automatically sends to Sentry if configured
 * 
 * @param error - Error object or message
 * @param context - Additional context data
 * @param severity - Error severity level
 */
export function logError(
  error: Error | string,
  context?: ErrorContext,
  severity: ErrorSeverity = 'error'
): void {
  const timestamp = new Date();
  const message = error instanceof Error ? error.message : error;
  const stack = error instanceof Error ? error.stack : undefined;

  // Console logging with emoji
  const emoji = getSeverityEmoji(severity);
  console.error(`${emoji} [${severity.toUpperCase()}]`, message);
  
  if (context) {
    console.error('Context:', context);
  }
  
  if (stack) {
    console.error('Stack:', stack);
  }

  // Send to Sentry if configured
  if (isSentryConfigured()) {
    sendToSentry({ message, severity, timestamp, context, stack });
  }

  // Store locally for debugging (in development)
  if (getEnvironment() === 'development') {
    storeErrorLocally({ message, severity, timestamp, context, stack });
  }
}

/**
 * Log a warning (non-blocking issues)
 */
export function logWarning(message: string, context?: ErrorContext): void {
  logError(message, context, 'warning');
}

/**
 * Log an info message (for important events)
 */
export function logInfo(message: string, context?: ErrorContext): void {
  logError(message, context, 'info');
}

/**
 * Log a fatal error (application-breaking)
 */
export function logFatal(error: Error | string, context?: ErrorContext): void {
  logError(error, context, 'fatal');
}

// ==========================================
// ERROR CAPTURING
// ==========================================

/**
 * Capture an exception with automatic context
 * Wraps try/catch blocks for consistent error handling
 * 
 * @param operation - Function to execute
 * @param context - Context data
 * @returns Result or throws error
 * 
 * @example
 * ```typescript
 * const result = await captureException(
 *   () => uploadFile(file),
 *   { component: 'UploadForm', userId: '123' }
 * );
 * ```
 */
export async function captureException<T>(
  operation: () => Promise<T>,
  context?: ErrorContext
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logError(
      error instanceof Error ? error : new Error(String(error)),
      context,
      'error'
    );
    throw error;
  }
}

/**
 * Capture and swallow errors (for non-critical operations)
 * Logs but doesn't rethrow
 */
export async function captureAndIgnore<T>(
  operation: () => Promise<T>,
  context?: ErrorContext,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    logWarning(
      error instanceof Error ? error.message : String(error),
      context
    );
    return fallback;
  }
}

// ==========================================
// BREADCRUMBS
// ==========================================

const breadcrumbs: Array<{ message: string; timestamp: Date; data?: any }> = [];
const MAX_BREADCRUMBS = 50;

/**
 * Add a breadcrumb for error context
 * Helps trace user actions leading to errors
 */
export function addBreadcrumb(message: string, data?: any): void {
  breadcrumbs.push({
    message,
    timestamp: new Date(),
    data,
  });

  // Keep only last N breadcrumbs
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift();
  }

  // Send to Sentry if configured
  if (isSentryConfigured() && typeof window !== 'undefined') {
    try {
      // @ts-ignore - Sentry may not be imported yet
      if (window.Sentry?.addBreadcrumb) {
        // @ts-ignore
        window.Sentry.addBreadcrumb({
          message,
          data,
          timestamp: Date.now() / 1000,
        });
      }
    } catch (e) {
      // Silent fail
    }
  }
}

/**
 * Get recent breadcrumbs
 */
export function getBreadcrumbs(): typeof breadcrumbs {
  return [...breadcrumbs];
}

/**
 * Clear all breadcrumbs
 */
export function clearBreadcrumbs(): void {
  breadcrumbs.length = 0;
}

// ==========================================
// SENTRY INTEGRATION
// ==========================================

/**
 * Initialize Sentry (call once at app startup)
 * Only initializes if DSN is configured
 */
export function initializeSentry(): boolean {
  const dsn = getSentryDSN();
  
  if (!dsn) {
    console.log('ℹ️ Sentry not configured, error tracking disabled');
    return false;
  }

  if (typeof window === 'undefined') {
    console.log('ℹ️ Sentry initialization skipped (server-side)');
    return false;
  }

  try {
    // @ts-ignore - Sentry SDK would be imported separately
    if (window.Sentry) {
      // @ts-ignore
      window.Sentry.init({
        dsn,
        environment: getEnvironment(),
        tracesSampleRate: 1.0,
        beforeSend(event: any) {
          // Filter out development errors
          if (getEnvironment() === 'development') {
            return null;
          }
          return event;
        },
      });
      
      console.log('✅ Sentry initialized');
      return true;
    }
  } catch (error) {
    console.error('❌ Failed to initialize Sentry:', error);
  }
  
  return false;
}

/**
 * Send error to Sentry
 */
function sendToSentry(errorLog: ErrorLog): void {
  if (typeof window === 'undefined') return;
  
  try {
    // @ts-ignore
    if (window.Sentry) {
      const { message, severity, context, stack } = errorLog;
      
      // @ts-ignore
      window.Sentry.captureException(new Error(message), {
        level: severity === 'warning' ? 'warning' : 'error',
        contexts: {
          custom: context || {},
        },
        extra: {
          stack,
          breadcrumbs: getBreadcrumbs(),
        },
      });
    }
  } catch (e) {
    console.error('Failed to send to Sentry:', e);
  }
}

/**
 * Set user context for Sentry
 */
export function setUserContext(userId: string, userData?: { email?: string; name?: string }): void {
  if (typeof window === 'undefined') return;
  
  try {
    // @ts-ignore
    if (window.Sentry?.setUser) {
      // @ts-ignore
      window.Sentry.setUser({
        id: userId,
        ...userData,
      });
    }
  } catch (e) {
    // Silent fail
  }
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext(): void {
  if (typeof window === 'undefined') return;
  
  try {
    // @ts-ignore
    if (window.Sentry?.setUser) {
      // @ts-ignore
      window.Sentry.setUser(null);
    }
  } catch (e) {
    // Silent fail
  }
}

// ==========================================
// LOCAL STORAGE (Development)
// ==========================================

const ERROR_STORAGE_KEY = 'cascade_connect_errors';

/**
 * Store error locally for development debugging
 */
function storeErrorLocally(errorLog: ErrorLog): void {
  if (typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem(ERROR_STORAGE_KEY);
    const errors: ErrorLog[] = stored ? JSON.parse(stored) : [];
    
    errors.push(errorLog);
    
    // Keep only last 100 errors
    if (errors.length > 100) {
      errors.shift();
    }
    
    localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(errors));
  } catch (e) {
    // Silent fail (storage might be full)
  }
}

/**
 * Get locally stored errors
 */
export function getLocalErrors(): ErrorLog[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(ERROR_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Clear locally stored errors
 */
export function clearLocalErrors(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(ERROR_STORAGE_KEY);
  } catch (e) {
    // Silent fail
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Get emoji for severity level
 */
function getSeverityEmoji(severity: ErrorSeverity): string {
  const emojiMap: Record<ErrorSeverity, string> = {
    fatal: '💀',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    debug: '🔍',
  };
  return emojiMap[severity] || '❓';
}

/**
 * Create a fingerprint for error grouping
 */
export function createFingerprint(...parts: string[]): string[] {
  return parts.filter(Boolean);
}

/**
 * Sanitize sensitive data from error context
 */
export function sanitizeContext(context: ErrorContext): ErrorContext {
  const sanitized = { ...context };
  
  // Remove sensitive fields
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'ssn', 'creditCard'];
  
  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

// ==========================================
// ERROR BOUNDARIES
// ==========================================

/**
 * React Error Boundary helper
 * Use this in your error boundary componentDidCatch
 */
export function handleReactError(error: Error, errorInfo: React.ErrorInfo): void {
  logError(error, {
    component: 'ErrorBoundary',
    componentStack: errorInfo.componentStack,
  }, 'error');
}

