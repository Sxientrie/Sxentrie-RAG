/**
 * @file shared/ui/error-boundary.tsx
 * @version 0.1.0
 * @description A React Error Boundary component to catch and handle rendering errors in its children.
 *
 * @module Core.UI
 *
 * @summary This is a class-based React component that implements the `componentDidCatch` lifecycle method. It wraps parts of the UI, catching any JavaScript errors during rendering, and displays a user-friendly fallback UI instead of crashing the application section. It also includes a reset mechanism.
 *
 * @dependencies
 * - react
 * - lucide-react
 *
 * @outputs
 * - Exports the `ErrorBoundary` React component.
 *
 * @changelog
 * - v0.1.0 (2025-09-08): File created and documented.
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { ICON_SIZE_XL, ICON_SIZE_SM } from '../../shared/config';

interface Props {
  children: ReactNode;
  name: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function reportErrorToService(error: Error, errorInfo: React.ErrorInfo) {
    // In a real application, this would send the error to a monitoring service
    // like Sentry, Bugsnag, Datadog, etc.
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in ${this.props.name}:`, error, errorInfo);
    reportErrorToService(error, errorInfo);
  }
  
  private handleReset = () => {
      this.setState({ hasError: false, error: null });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback panel">
             <div className="placeholder">
                <AlertTriangle size={ICON_SIZE_XL} strokeWidth={1} color="var(--error)" />
                <h4 className="error-boundary-title">Error in {this.props.name}</h4>
                <p>Something went wrong while rendering this section.</p>
                <button onClick={this.handleReset} className="btn btn-sm btn-outline">
                    <RotateCw size={ICON_SIZE_SM} /> Try Again
                </button>
             </div>
        </div>
      );
    }

    return this.props.children;
  }
}