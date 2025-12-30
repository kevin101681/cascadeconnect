/**
 * CUSTOM REACT HOOKS FOR SERVICES
 * React hooks that wrap service layer for easier component integration
 * Follows React best practices: proper dependencies, cleanup, error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { uploadFile, uploadMultipleFiles, type UploadResult, type UploadOptions } from '../services/uploadService';
import { sendSms, type SendSmsRequest, type SendSmsResponse } from '../services/smsService';
import { getNetlifyInfo, getNetlifyDeploys, getNeonStats, type NetlifyInfoResponse, type NetlifyDeploymentsResponse, type NeonStats } from '../services/netlifyService';

// ==========================================
// UPLOAD HOOKS
// ==========================================

export interface UseUploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
}

/**
 * Hook for uploading multiple files with progress tracking
 * @param options - Upload options (max retries, timeout, etc.)
 * @returns Upload function and state
 * 
 * @example
 * ```tsx
 * const { upload, uploading, error } = useFileUpload();
 * 
 * const handleFiles = async (files: File[]) => {
 *   const { successes, failures } = await upload(files);
 *   console.log(`Uploaded ${successes.length} files`);
 * };
 * ```
 */
export function useFileUpload(options?: UploadOptions) {
  const [state, setState] = useState<UseUploadState>({
    uploading: false,
    progress: 0,
    error: null,
  });

  const upload = useCallback(async (files: File[]) => {
    setState({ uploading: true, progress: 0, error: null });
    
    try {
      const result = await uploadMultipleFiles(files, options);
      setState({ uploading: false, progress: 100, error: null });
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setState({ uploading: false, progress: 0, error: errorMessage });
      throw error;
    }
  }, [options]);

  const reset = useCallback(() => {
    setState({ uploading: false, progress: 0, error: null });
  }, []);

  return {
    upload,
    reset,
    ...state,
  };
}

// ==========================================
// MESSAGES HOOKS
// ==========================================

export interface UseSendMessageState {
  sending: boolean;
  error: string | null;
  lastMessageId: string | null;
}

/**
 * Hook for sending SMS messages
 * @returns Send message function and state
 * 
 * @example
 * ```tsx
 * const { sendSms, sending, error } = useSendMessage();
 * 
 * const handleSend = async () => {
 *   const result = await sendSms({
 *     homeownerId: 'abc123',
 *     message: 'Hello!',
 *   });
 *   if (result.success) {
 *     alert('Message sent!');
 *   }
 * };
 * ```
 */
export function useSendMessage() {
  const [state, setState] = useState<UseSendMessageState>({
    sending: false,
    error: null,
    lastMessageId: null,
  });

  const sendMessage = useCallback(async (request: SendSmsRequest): Promise<SendSmsResponse> => {
    setState(prev => ({ ...prev, sending: true, error: null }));
    
    try {
      const result = await sendSms(request);
      
      if (result.success) {
        setState({
          sending: false,
          error: null,
          lastMessageId: result.messageId || null,
        });
      } else {
        setState({
          sending: false,
          error: result.error || 'Failed to send message',
          lastMessageId: null,
        });
      }
      
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      setState({
        sending: false,
        error: errorMessage,
        lastMessageId: null,
      });
      return { success: false, error: errorMessage };
    }
  }, []);

  const reset = useCallback(() => {
    setState({ sending: false, error: null, lastMessageId: null });
  }, []);

  return {
    sendSms: sendMessage,
    reset,
    ...state,
  };
}

// ==========================================
// NETLIFY HOOKS
// ==========================================

export interface UseNetlifyInfoState {
  data: NetlifyInfoResponse | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for fetching Netlify site information
 * Automatically fetches on mount
 * 
 * @param autoFetch - Whether to automatically fetch on mount (default: true)
 * @returns Netlify info data, loading state, and refetch function
 * 
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useNetlifyInfo();
 * 
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error}</div>;
 * 
 * return <div>Site: {data?.siteInfo?.siteId}</div>;
 * ```
 */
export function useNetlifyInfo(autoFetch: boolean = true) {
  const [state, setState] = useState<UseNetlifyInfoState>({
    data: null,
    loading: false,
    error: null,
  });

  const fetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await getNetlifyInfo();
      setState({
        data: result,
        loading: false,
        error: result.success ? null : (result.error || 'Failed to fetch Netlify info'),
      });
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch Netlify info';
      setState({
        data: null,
        loading: false,
        error: errorMessage,
      });
      throw error;
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetch();
    }
  }, [autoFetch, fetch]);

  return {
    ...state,
    refetch: fetch,
  };
}

/**
 * Hook for fetching Netlify deployment history
 * Automatically fetches on mount
 */
export function useNetlifyDeploys(autoFetch: boolean = true) {
  const [state, setState] = useState<{
    data: NetlifyDeploymentsResponse | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });

  const fetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await getNetlifyDeploys();
      setState({
        data: result,
        loading: false,
        error: result.success ? null : (result.error || 'Failed to fetch deployments'),
      });
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch deployments';
      setState({
        data: null,
        loading: false,
        error: errorMessage,
      });
      throw error;
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetch();
    }
  }, [autoFetch, fetch]);

  return {
    ...state,
    refetch: fetch,
  };
}

/**
 * Hook for fetching Neon database statistics
 * Automatically fetches on mount
 */
export function useNeonStats(autoFetch: boolean = true) {
  const [state, setState] = useState<{
    data: NeonStats | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });

  const fetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await getNeonStats();
      setState({
        data: result,
        loading: false,
        error: result.success ? null : (result.error || 'Failed to fetch Neon stats'),
      });
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch Neon stats';
      setState({
        data: null,
        loading: false,
        error: errorMessage,
      });
      throw error;
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetch();
    }
  }, [autoFetch, fetch]);

  return {
    ...state,
    refetch: fetch,
  };
}

// ==========================================
// POLLING HOOKS
// ==========================================

/**
 * Hook for polling Netlify info at regular intervals
 * @param intervalMs - Polling interval in milliseconds (default: 30000 = 30 seconds)
 * 
 * @example
 * ```tsx
 * // Poll every 30 seconds
 * const { data, loading } = useNetlifyInfoPolling(30000);
 * ```
 */
export function useNetlifyInfoPolling(intervalMs: number = 30000) {
  const { data, loading, error, refetch } = useNetlifyInfo(true);

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs, refetch]);

  return { data, loading, error, refetch };
}

/**
 * Hook for polling Neon stats at regular intervals
 * @param intervalMs - Polling interval in milliseconds (default: 60000 = 1 minute)
 */
export function useNeonStatsPolling(intervalMs: number = 60000) {
  const { data, loading, error, refetch } = useNeonStats(true);

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs, refetch]);

  return { data, loading, error, refetch };
}

