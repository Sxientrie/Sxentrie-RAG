/**
 * @file shared/ui/footer.tsx
 * @version 0.1.0
 * @description The shared footer component for the main application layout.
 *
 * @module Core.UI
 *
 * @summary This component renders the footer content, including copyright information and a button to reset the panel layout. It receives the reset handler as a prop to decouple its presentation from the application's state logic.
 *
 * @dependencies
 * - react
 * - lucide-react
 *
 * @outputs
 * - Exports the `Footer` React component.
 *
 * @changelog
 * - v0.1.0 (2025-09-08): File created and documented.
 */
import React, { FC } from 'react';
import { RefreshCw, AlertTriangle, X } from 'lucide-react';

interface FooterProps {
  onResetLayout: () => void;
  errorMessage: string | null;
  onClearError: () => void;
}

export const Footer: FC<FooterProps> = ({ onResetLayout, errorMessage, onClearError }) => {
  return (
    <footer className="page-footer">
      <div className="footer-left-content">
        <button
          className="footer-action-btn"
          onClick={onResetLayout}
          title="Reset Layout"
          aria-label="Reset panel layout"
        >
          <RefreshCw size={12} />
        </button>
        <p className="copyright-text">© {new Date().getFullYear()} Sxentrie. All Rights Reserved. | Built with React, Typescript, API's & lots of coffee.</p>
      </div>
      
      {errorMessage && (
        <div className="footer-error-message" role="alert">
          <AlertTriangle size={14} className="error-icon" />
          <span className="error-text">{errorMessage}</span>
          <button 
            className="footer-action-btn clear-error-btn" 
            onClick={onClearError}
            title="Clear error message"
            aria-label="Clear error message"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </footer>
  );
};