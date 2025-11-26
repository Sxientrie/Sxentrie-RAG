import React, { FC, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, ClipboardCopy } from 'lucide-react';
import {
    ICON_SIZE_SM, UI_COPY_SUCCESS_TIMEOUT_MS, ErrorFailedToCopy
} from '../../../../shared/config';

interface OverviewPanelProps {
    content: string;
    onError: (message: string) => void;
}

export const OverviewPanel: FC<OverviewPanelProps> = ({ content, onError }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = useCallback(async (): Promise<void> => {
        try {
            await navigator.clipboard.writeText(content);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), UI_COPY_SUCCESS_TIMEOUT_MS);
        } catch (err) {
            onError(ErrorFailedToCopy);
        }
    }, [content, onError]);

    return (
        <div className="overview-panel-container" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--gap-sm)' }}>
            <div className="overview-actions" style={{ display: 'flex', justifyContent: 'flex-end', padding: 'var(--gap-sm) 0' }}>
                <button
                    className="panel-action-btn"
                    onClick={handleCopy}
                    disabled={isCopied}
                    title={isCopied ? "Copied!" : "Copy overview as Markdown"}
                    aria-label="Copy overview as Markdown"
                >
                    {isCopied ? <Check size={ICON_SIZE_SM} color="var(--primary)" /> : <ClipboardCopy size={ICON_SIZE_SM} />}
                </button>
            </div>
            <div className="overview-content markdown-content" style={{ flex: 1, overflowY: 'auto', paddingRight: 'var(--gap-sm)' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
};
