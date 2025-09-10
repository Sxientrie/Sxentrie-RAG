import React, { FC, ReactNode } from 'react';
import { CodeXml, Settings } from 'lucide-react';
import { LoginButton } from '../../src/domains/accounts/ui/login-button';
import { ICON_SIZE_LG, ICON_SIZE_MD, AppTitle, AppTagline, TitleOpenSettings, AriaLabelOpenSettings } from '../../shared/config';
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
          <strong>{AppTitle}</strong>
          <span className="header-tagline" dangerouslySetInnerHTML={{ __html: AppTagline }} />
        </h1>
      </div>
      <div className="header-actions">
        {children}
        <LoginButton />
        <button
            className="footer-action-btn settings-btn"
            onClick={onToggleSettings}
            title={TitleOpenSettings}
            aria-label={AriaLabelOpenSettings}
        >
            <Settings size={ICON_SIZE_MD} />
        </button>
      </div>
    </header>
  );
};
