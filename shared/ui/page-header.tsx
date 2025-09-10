import React, { FC, ReactNode } from 'react';
import { CodeXml, Settings } from 'lucide-react';
import { LoginButton } from '../../src/domains/accounts/ui/login-button';
import { ICON_SIZE_LG, ICON_SIZE_MD } from '../../shared/config';
interface PageHeaderProps {
  children?: ReactNode;
  onToggleSettings: () => void;
}
export const PageHeader: FC<PageHeaderProps> = ({ children, onToggleSettings }) => {
  return (
    <header className="page-header">
      <div className="app-title">
        <CodeXml size={ICON_SIZE_LG} strokeWidth={2} />
        <h1>
          <strong>Sxentrie:</strong>
          <span className="header-tagline">
            {' '}
            Instant <code>Code</code> Comprehension.
          </span>
        </h1>
      </div>
      <div className="header-actions">
        {children}
        <LoginButton />
        <button
            className="footer-action-btn settings-btn"
            onClick={onToggleSettings}
            title="Open Settings"
            aria-label="Open settings panel"
        >
            <Settings size={ICON_SIZE_MD} />
        </button>
      </div>
    </header>
  );
};
