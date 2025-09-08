/**
 * @file shared/ui/splitter.tsx
 * @version 0.1.0
 * @description A UI component that allows users to resize adjacent panels by dragging.
 *
 * @module Core.UI
 *
 * @summary This component renders a draggable vertical bar. It handles mouse events (`onMouseDown`, `onMouseMove`, `onMouseUp`) to calculate the horizontal drag distance and invokes an `onResize` callback with the delta. This enables the dynamic resizing of the main layout panels.
 *
 * @dependencies
 * - react
 *
 * @outputs
 * - Exports the `Splitter` React component.
 *
 * @changelog
 * - v0.1.0 (2025-09-08): File created and documented.
 */
import React, { FC, useCallback, useRef, useEffect } from 'react';

interface SplitterProps {
  onResize: (deltaX: number) => void;
}

export const Splitter: FC<SplitterProps> = ({ onResize }) => {
  const onResizeRef = useRef(onResize);

  useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  const handleMouseDown = useCallback((downEvent: React.MouseEvent<HTMLDivElement>) => {
    downEvent.preventDefault();

    let lastX = downEvent.clientX;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - lastX;
      lastX = moveEvent.clientX;
      onResizeRef.current(deltaX);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp, { once: true });

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

  }, []);

  return <div className="splitter" onMouseDown={handleMouseDown} role="separator" aria-orientation="vertical" />;
};