import React, { FC } from 'react';
import { RefreshCw } from 'lucide-react';

interface FooterProps {
  onResetLayout: () => void;
}

export const Footer: FC<FooterProps> = ({ onResetLayout }) => {
  return (
    <footer className="page-footer">
      <div className="footer-actions">
        <button
          className="footer-action-btn"
          onClick={onResetLayout}
          title="Reset Layout"
          aria-label="Reset panel layout"
        >
          <RefreshCw size={12} />
        </button>
      </div>
      <p>© {new Date().getFullYear()} Sxentrie. All Rights Reserved. | Built with React, Typescript, API's & lots of coffee.</p>
    </footer>
  );
};