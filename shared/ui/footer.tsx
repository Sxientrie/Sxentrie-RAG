import React, { FC } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { ICON_SIZE_SM, TextCopyrightTemplate, TitleClearError } from '../../shared/config';

interface FooterProps {
  errorMessage: string | null;
  onClearError: () => void;
  tooltipMessage: string | null;
}

export const Footer: FC<FooterProps> = ({ errorMessage, onClearError, tooltipMessage }) => {
  const rightContent = errorMessage ? (
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
  ) : tooltipMessage ? (
    <p className="footer-tooltip">{tooltipMessage}</p>
  ) : null;

  return (
    <footer className="page-footer">
      <div className="footer-left-content">
        <p className="copyright-text">{TextCopyrightTemplate.replace('{0}', new Date().getFullYear().toString())}</p>
      </div>
      <div className="footer-right-content">
        {rightContent}
      </div>
    </footer>
  );
};
