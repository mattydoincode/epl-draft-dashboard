'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenReceived: (token: string) => void;
}

type ModalState = 'idle' | 'creating' | 'ready' | 'success' | 'error';

export default function LoginModal({ isOpen, onClose, onTokenReceived }: LoginModalProps) {
  const [state, setState] = useState<ModalState>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to terminate a session
  const terminateSession = useCallback(async (sid: string | null) => {
    if (!sid) return;
    try {
      await fetch('/api/auth/end-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid }),
      });
    } catch {
      // Best effort - ignore errors
    }
  }, []);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Handle token found
  const handleTokenFound = useCallback(async (token: string, sid: string) => {
    stopPolling();
    setState('success');

    // Cleanup the session
    await terminateSession(sid);

    // Wait a moment to show success state, then close
    setTimeout(() => {
      onTokenReceived(token);
      onClose();
    }, 1000);
  }, [stopPolling, terminateSession, onTokenReceived, onClose]);

  // Start polling for token
  const startPolling = useCallback((sid: string) => {
    stopPolling();

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/auth/check-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sid }),
        });
        const data = await res.json();

        if (data.hasToken && data.token) {
          handleTokenFound(data.token, sid);
        }
      } catch {
        // Ignore polling errors
      }
    }, 1000); // Poll every second
  }, [stopPolling, handleTokenFound]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setState('idle');
      setSessionId(null);
      setLiveViewUrl(null);
      setError(null);
    } else {
      stopPolling();
    }
  }, [isOpen, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // Handle closing the modal - terminate any active session
  const handleClose = async () => {
    stopPolling();
    await terminateSession(sessionId);
    onClose();
  };

  const startSession = async () => {
    // Terminate any existing session before starting a new one
    stopPolling();
    await terminateSession(sessionId);
    setState('creating');
    setError(null);

    try {
      const res = await fetch('/api/auth/start-session', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create session');
      }

      setSessionId(data.sessionId);
      setLiveViewUrl(data.liveViewUrl);
      setState('ready');

      // Start polling for token capture
      startPolling(data.sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create browser session');
      setState('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Login to Premier League Draft</h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {state === 'idle' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
              <div className="text-center space-y-2">
                <h4 className="text-xl font-medium text-gray-900">Automatic Token Retrieval</h4>
                <p className="text-gray-600 max-w-md">
                  We&apos;ll open a browser window where you can log in to the Premier League Draft website.
                  Your token will be captured automatically once you log in.
                </p>
              </div>
              <button
                onClick={startSession}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Start Browser Session
              </button>
            </div>
          )}

          {state === 'creating' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
              <p className="text-gray-600">Creating browser session...</p>
            </div>
          )}

          {state === 'ready' && liveViewUrl && (
            <>
              <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
                <p className="text-sm text-blue-800">
                  Log in to the Premier League Draft website below. Your token will be captured automatically.
                </p>
              </div>
              <div className="flex-1 relative">
                <iframe
                  src={liveViewUrl}
                  className="absolute inset-0 w-full h-full"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                  allow="clipboard-read; clipboard-write"
                />
              </div>
            </>
          )}

          {state === 'success' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
              <div className="rounded-full h-16 w-16 bg-green-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-medium text-green-800">Token captured successfully!</p>
            </div>
          )}

          {state === 'error' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
              <div className="rounded-full h-16 w-16 bg-red-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-red-800">Something went wrong</p>
                <p className="text-gray-600">{error}</p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={startSession}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
