import React, { FC, ReactNode } from 'react';
import { CodeXml } from 'lucide-react';
import { LoginButton } from '../../src/domains/accounts/ui/login-button';

interface PageHeaderProps {
  children?: ReactNode;
}

export const PageHeader: FC<PageHeaderProps> = ({ children }) => {
  return (
    <header className="page-header">
      <div className="app-title">
        <CodeXml size={20} strokeWidth={2} />
        <h1>
          <strong>Sxentrie:</strong>
          {' '}
          Instant <code>Code</code> Comprehension.
        </h1>
      </div>
      <div className="header-actions">
        {children}
        <LoginButton />
      </div>
    </header>
  );
};
