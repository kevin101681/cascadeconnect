import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  eventId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    eventId: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, eventId: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // Send error to Sentry and get the event ID
    const eventId = Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
    
    // Store event ID for user feedback
    this.setState({ eventId });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          height: '100vh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f0f4f6',
          color: '#171c1f',
          fontFamily: 'sans-serif',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '30px',
            borderRadius: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            maxWidth: '500px'
          }}>
            <h1 style={{ fontSize: '24px', marginBottom: '16px', color: '#ba1a1a' }}>Something went wrong</h1>
            <p style={{ marginBottom: '16px', lineHeight: '1.5' }}>
              An unexpected error occurred. Please refresh the page to try again.
            </p>
            {this.state.error && (
              <details style={{ marginTop: '16px', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', color: '#40484c', marginBottom: '8px' }}>Error details</summary>
                <pre style={{
                  fontSize: '12px',
                  color: '#40484c',
                  backgroundColor: '#eceff1',
                  padding: '12px',
                  borderRadius: '8px',
                  overflow: 'auto',
                  maxHeight: '200px'
                }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#3c6b80',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                Refresh Page
              </button>
              
              {this.state.eventId && (
                <button
                  onClick={() => {
                    Sentry.showReportDialog({ 
                      eventId: this.state.eventId || undefined,
                      title: 'It looks like we\'re having issues.',
                      subtitle: 'Our team has been notified, but you can help us fix this faster.',
                      subtitle2: 'If you\'d like to help, tell us what happened below.',
                    });
                  }}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#ffffff',
                    color: '#3c6b80',
                    border: '2px solid #3c6b80',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '500'
                  }}
                >
                  Report Feedback
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

