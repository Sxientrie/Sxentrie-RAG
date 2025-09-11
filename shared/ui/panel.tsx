import React, { FC, ReactNode } from 'react';
import { PanelLeftClose, PanelRightClose, PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import { ICON_SIZE_SM, TitleExpandPanel, TitleCollapsePanel } from '../../shared/config';

interface Tab {
    title: string;
    content?: ReactNode;
}

interface PanelProps {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  actions?: ReactNode;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  collapseDirection?: 'left' | 'right';
  tabs?: Tab[];
  activeTab?: number;
  onTabChange?: (index: number) => void;
}

export const Panel: FC<PanelProps> = ({
  children,
  className,
  title,
  actions,
  isCollapsed = false,
  onToggleCollapse,
  collapseDirection = 'left',
  tabs,
  activeTab,
  onTabChange
}) => {
  const CollapseIcon = isCollapsed
    ? (collapseDirection === 'left' ? PanelRightOpen : PanelLeftOpen)
    : (collapseDirection === 'left' ? PanelLeftClose : PanelRightClose);
  return (
    <div className={`panel ${className || ''} ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="panel-header">
        <div className="panel-title-wrapper">
          {title && <h2 className="panel-title">{title}</h2>}
          {tabs && (
            <div className="tabs-nav">
              {tabs.map((tab, index) => (
                <button
                  key={index}
                  className={`tab-btn ${index === activeTab ? 'active' : ''}`}
                  onClick={() => onTabChange && onTabChange(index)}
                >
                  {tab.title}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="panel-actions-wrapper">
          {!isCollapsed && actions}
          {onToggleCollapse && (
            <button
              className="panel-toggle-btn"
              onClick={onToggleCollapse}
              title={isCollapsed ? TitleExpandPanel : TitleCollapsePanel}
              aria-label={isCollapsed ? TitleExpandPanel : TitleCollapsePanel}
              aria-expanded={!isCollapsed}
            >
              <CollapseIcon size={ICON_SIZE_SM} />
            </button>
          )}
        </div>
      </div>
      {!isCollapsed && <div className="panel-content">{children}</div>}
    </div>
  );
};
