import React, { FC, ReactNode } from 'react';
import { CodeXml } from 'lucide-react';

interface PageHeaderProps {
    children?: ReactNode;
}

export const PageHeader: FC<PageHeaderProps> = ({ children }) => {
    return (
        <header className="page-header">
            <div className="app-title">
                <CodeXml size={20} strokeWidth={2} />
                <h1>Sxentrie: Beyond the <code>clone</code></h1>
            </div>
            {children}
        </header>
    );
};
