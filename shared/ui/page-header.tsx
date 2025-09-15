import React, { FC, ReactNode } from 'react';
import { Settings, Menu } from 'lucide-react';
import { LoginButton } from '../../src/domains/accounts/ui/login-button';
import { ICON_SIZE_MD, AppTitle, AppTagline, TitleOpenSettings, AriaLabelOpenSettings, TitleToggleDrawer, AriaLabelToggleDrawer } from '../../shared/config';
import { AnimatedLogo } from './animated-logo';

interface PageHeaderProps {
  children?: ReactNode;
  onToggleSettings: () => void;
  isMobile?: boolean;
  onToggleDrawer?: () => void;
}

export const PageHeader: FC<PageHeaderProps> = ({ children, onToggleSettings, isMobile, onToggleDrawer }) => {
  return (
    <header className="page-header">
      <div className="app-title">
        {isMobile && (
          <button
            className="footer-action-btn drawer-toggle-btn"
            onClick={onToggleDrawer}
            title={TitleToggleDrawer}
            aria-label={AriaLabelToggleDrawer}
          >
            <Menu size={ICON_SIZE_MD} />
          </button>
        )}
        <AnimatedLogo />
        <h1>
          <strong>{AppTitle}</strong>
          <span className="header-tagline" dangerouslySetInnerHTML={{ __html: AppTagline }} />
        </h1>
      </div>

      <div className="header-center">
        {children}
      </div>

      <div className="header-actions">
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