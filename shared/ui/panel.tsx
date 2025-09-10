/**
 * @file shared/ui/panel.tsx
 * @version 0.1.0
 * @description A generic, reusable panel component with a header, title, actions, and content area.
 *
 * @module Core.UI
 *
 * @summary This component serves as a standardized container for the main sections of the UI. It provides features like a consistent header with a title, an optional actions slot, and a collapse/expand functionality, abstracting away common layout and behavior.
 *
 * @dependencies
 * - react
 * - lucide-react
 *
 * @outputs
 * - Exports the `Panel` React component.
 *
 * @changelog
 * - v0.1.0 (2025-09-08): File created and documented.
 */
import React, { FC, ReactNode } from 'react';
import { PanelLeftClose, PanelRightClose, PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import { ICON_SIZE_SM } from '../../shared/config';

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
          <h2 className="panel-title">{title}</h2>
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
              <CollapseIcon size={ICON_SIZE_SM} />
            </button>
          )}
        </div>
      </div>
      {!isCollapsed && <div className="panel-content">{children}</div>}
    </div>
  );
};