import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import {
    ICON_SIZE_XL, ICON_SIZE_SM, LogUncaughtErrorTemplate, TitleErrorTemplate, TextSomethingWentWrong,
    LabelTryAgain
} from '../../shared/config';
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
    console.error(LogUncaughtErrorTemplate.replace('{0}', this.props.name), error, errorInfo);
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
                <h4 className="error-boundary-title">{TitleErrorTemplate.replace('{0}', this.props.name)}</h4>
                <p>{TextSomethingWentWrong}</p>
                <button onClick={this.handleReset} className="btn btn-sm btn-outline">
                    <RotateCw size={ICON_SIZE_SM} /> {LabelTryAgain}
                </button>
             </div>
        </div>
      );
    }
    return this.props.children;
  }
}
