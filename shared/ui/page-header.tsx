/**
 * @file shared/ui/page-header.tsx
 * @version 0.1.0
 * @description The shared header component for the main application layout.
 *
 * @module Core.UI
 *
 * @summary This component renders the top-level header of the application. It includes the application title and logo, and provides a slot for child components (like the `RepoLoader`) and the `LoginButton`.
 *
 * @dependencies
 * - react
 * - lucide-react
 * - ../../src/domains/accounts/ui/login-button
 *
 * @outputs
 * - Exports the `PageHeader` React component.
 *
 * @changelog
 * - v0.1.0 (2025-09-08): File created and documented.
 */
import React, { FC, ReactNode } from 'react';
import { CodeXml, Settings } from 'lucide-react';
import { LoginButton } from '../../src/domains/accounts/ui/login-button';

interface PageHeaderProps {
  children?: ReactNode;
  onToggleSettings: () => void;
}

export const PageHeader: FC<PageHeaderProps> = ({ children, onToggleSettings }) => {
  return (
    <header className="page-header">
      <div className="app-title">
        <CodeXml size={20} strokeWidth={2} />
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
            <Settings size={16} />
        </button>
      </div>
    </header>
  );
};