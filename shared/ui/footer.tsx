import React, { FC } from 'react';
import { RefreshCw, AlertTriangle, X } from 'lucide-react';
import { ICON_SIZE_XS, ICON_SIZE_SM } from '../../shared/config';
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
          <RefreshCw size={ICON_SIZE_XS} />
        </button>
        <p className="copyright-text">© {new Date().getFullYear()} Sxentrie. All Rights Reserved. | Built with React, Typescript, API's & lots of coffee.</p>
      </div>
      {errorMessage && (
        <div className="footer-error-message" role="alert">
          <AlertTriangle size={ICON_SIZE_SM} className="error-icon" />
          <span className="error-text">{errorMessage}</span>
          <button
            className="footer-action-btn clear-error-btn"
            onClick={onClearError}
            title="Clear error message"
            aria-label="Clear error message"
          >
            <X size={ICON_SIZE_SM} />
          </button>
        </div>
      )}
    </footer>
  );
};
