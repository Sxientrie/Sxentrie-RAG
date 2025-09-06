import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  name: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
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
  }
  
  private handleReset = () => {
      this.setState({ hasError: false, error: null });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback panel">
             <div className="placeholder">
                <AlertTriangle size={48} strokeWidth={1} color="var(--error)" />
                <h4 className="error-boundary-title">Error in {this.props.name}</h4>
                <p>Something went wrong while rendering this section.</p>
                <button onClick={this.handleReset} className="error-boundary-reset-btn">
                    <RotateCw size={14} /> Try Again
                </button>
             </div>
        </div>
      );
    }

    return this.props.children;
  }
}
