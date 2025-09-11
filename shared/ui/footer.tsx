import React, { FC } from 'react';
import { RefreshCw, AlertTriangle, X } from 'lucide-react';
import { ICON_SIZE_XS, ICON_SIZE_SM, TitleResetLayout, AriaLabelResetLayout, TextCopyrightTemplate, TitleClearError } from '../../shared/config';
interface FooterProps {
  onResetLayout: () => void;
  errorMessage: string | null;
  onClearError: () => void;
  tooltipMessage: string | null;
}
export const Footer: FC<FooterProps> = ({ onResetLayout, errorMessage, onClearError, tooltipMessage }) => {
  return (
    <footer className="page-footer">
      <div className="footer-left-content">
        <button
          className="footer-action-btn"
          onClick={onResetLayout}
          title={TitleResetLayout}
          aria-label={AriaLabelResetLayout}
        >
          <RefreshCw size={ICON_SIZE_XS} />
        </button>
        {tooltipMessage ? (
          <p className="footer-tooltip">{tooltipMessage}</p>
        ) : (
          <p className="copyright-text">{TextCopyrightTemplate.replace('{0}', new Date().getFullYear().toString())}</p>
        )}
      </div>
      {errorMessage && (
        <div className="footer-error-message" role="alert">
          <AlertTriangle size={ICON_SIZE_SM} className="error-icon" />
          <span className="error-text">{errorMessage}</span>
          <button
            className="footer-action-btn clear-error-btn"
            onClick={onClearError}
            title={TitleClearError}
            aria-label={TitleClearError}
          >
            <X size={ICON_SIZE_SM} />
          </button>
        </div>
      )}
    </footer>
  );
};
