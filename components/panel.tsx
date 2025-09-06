import React, { FC, ReactNode } from 'react';
import { PanelLeftClose, PanelRightClose, PanelLeftOpen, PanelRightOpen } from 'lucide-react';

interface PanelProps {
  children: ReactNode;
  className?: string;
  title: ReactNode;
  actions?: ReactNode;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  collapseDirection?: 'left' | 'right';
}

export const Panel: FC<PanelProps> = ({ children, className, title, actions, isCollapsed = false, onToggleCollapse, collapseDirection = 'left' }) => {
    
    const CollapseIcon = isCollapsed 
        ? (collapseDirection === 'left' ? PanelRightOpen : PanelLeftOpen)
        : (collapseDirection === 'left' ? PanelLeftClose : PanelRightClose);

  return (
    <div className={`panel ${className || ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="panel-header">
            <div className="panel-title-wrapper">
                <h2 className="panel-title" aria-hidden={isCollapsed}>{title}</h2>
            </div>
            <div className="panel-actions-wrapper">
                {!isCollapsed && actions}
                 {onToggleCollapse && (
                    <button 
                        className="panel-toggle-btn" 
                        onClick={onToggleCollapse}
                        title={isCollapsed ? "Expand Panel" : "Collapse Panel"}
                        aria-label={isCollapsed ? "Expand Panel" : "Collapse Panel"}
                        aria-expanded={!isCollapsed}
                    >
                        <CollapseIcon size={14} />
                    </button>
                 )}
            </div>
        </div>
      {!isCollapsed && <div className="panel-content">{children}</div>}
    </div>
  );
};