import React, { FC, useCallback, useRef, useEffect } from 'react';

interface SplitterProps {
  onResize: (deltaX: number) => void;
}

export const Splitter: FC<SplitterProps> = ({ onResize }) => {
    const onResizeRef = useRef(onResize);

    useEffect(() => {
        onResizeRef.current = onResize;
    });

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