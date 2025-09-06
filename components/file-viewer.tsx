import React, { FC, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coldarkDark } from 'react-syntax-highlighter/dist/esm/styles/prism/';
import { Panel } from './panel';
import { FileCode2, ClipboardCopy, Download, Check, MousePointerClick, Github, Play, FlaskConical } from 'lucide-react';
import { getLanguage } from '../utils/get-language';

const customStyle = {
    ...coldarkDark,
    'pre[class*="language-"]': {
        ...coldarkDark['pre[class*="language-"]'],
        backgroundColor: 'var(--background)',
        margin: 0,
        padding: '1rem',
        height: '100%',
    },
     'code[class*="language-"]': {
        ...coldarkDark['code[class*="language-"]'],
        fontFamily: 'var(--font-family-mono)',
        fontSize: '0.9rem',
    }
};

const styleSheet = `
.file-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
}
.file-action-btn {
    background: none;
    border: none;
    color: var(--muted-foreground);
    cursor: pointer;
    padding: 4px;
    border-radius: var(--radius);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}
.file-action-btn:hover:not(:disabled) {
    background-color: oklch(100% 0 0 / 0.1);
    color: var(--foreground);
}
.file-action-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}
.image-viewer-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    overflow: auto;
    padding: 1rem;
    background-color: var(--background);
    border-radius: var(--radius);
}
.image-preview {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: calc(var(--radius) - 4px);
}
.onboarding-guide {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1rem;
    padding: 1rem;
    max-width: 500px;
}
.onboarding-guide h3 {
    font-size: 1.25rem;
    color: var(--foreground);
    margin: 0;
}
.onboarding-guide > p {
    color: var(--muted-foreground);
    margin: 0;
}
.onboarding-guide ol {
    list-style: none;
    padding: 0;
    margin: 1rem 0 0 0;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    text-align: left;
    align-items: flex-start;
}
.onboarding-guide li {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.95rem;
    color: var(--muted-foreground);
}
.onboarding-guide li strong {
    color: var(--foreground);
}
.onboarding-guide .step-icon {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: var(--background);
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary);
}
`;


interface FileViewerProps {
  file: { path: string; content: string; url?: string; isImage?: boolean } | null;
  isRepoLoaded: boolean;
}

export const FileViewer: FC<FileViewerProps> = ({ file, isRepoLoaded }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = (): void => {
    if (!file || file.isImage) return;
    navigator.clipboard.writeText(file.content).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
  };

  const handleDownload = async (): Promise<void> => {
      if (!file) return;
      
      const fileName = file.path.split('/').pop() || 'download';
      let blob;
      
      if (file.isImage && file.url) {
        try {
            const response = await fetch(file.url);
            if (!response.ok) throw new Error('Network response was not ok');
            blob = await response.blob();
        } catch (error) {
            console.error('Failed to download image:', error);
            return;
        }
      } else {
        blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
      }

      if (blob) {
        const link = document.createElement('a');
        link.download = fileName;
        link.href = window.URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(link.href);
      }
  };
  
  const panelTitle = (
    <><FileCode2 size={14}/> {file ? file.path : 'File Content'}</>
  );
  
  const panelActions = file ? (
      <div className="file-actions">
          <button
              className="file-action-btn"
              onClick={handleCopy}
              title={file.isImage ? "Cannot copy an image" : (isCopied ? "Copied!" : "Copy to clipboard")}
              aria-label="Copy file content to clipboard"
              disabled={isCopied || file.isImage}
          >
              {isCopied ? <Check size={14} color="var(--primary)" /> : <ClipboardCopy size={14} />}
          </button>
           <button
              className="file-action-btn"
              onClick={handleDownload}
              title="Download file"
              aria-label="Download file"
          >
              <Download size={14} />
          </button>
      </div>
  ) : null;

  const renderPlaceholder = (): JSX.Element => {
    if (!isRepoLoaded) {
      return (
        <div className="onboarding-guide">
            <h3>Welcome to Sxentrie!</h3>
            <p>Get started with a code analysis in three simple steps:</p>
            <ol>
                <li>
                    <div className="step-icon"><Github size={16}/></div>
                    <span><strong>Paste a public GitHub URL</strong> into the input field at the top of the page.</span>
                </li>
                <li>
                    <div className="step-icon"><Play size={16}/></div>
                    <span><strong>Click "Load"</strong> to fetch the repository's file structure.</span>
                </li>
                <li>
                    <div className="step-icon"><FlaskConical size={16}/></div>
                    <span><strong>Run an analysis</strong> on the entire repo or a selected file.</span>
                </li>
            </ol>
        </div>
      );
    }
    return (
        <>
            <MousePointerClick size={48} strokeWidth={1} />
            <p>Select a file from the list on the left to view its content.</p>
        </>
    );
  };

  return (
    <>
    <style>{styleSheet}</style>
    <Panel
        className="file-viewer-panel"
        title={panelTitle}
        actions={panelActions}
    >
      {file ? (
        file.isImage && file.url ? (
            <div className="image-viewer-container">
              <img src={file.url} alt={file.path} className="image-preview" />
            </div>
        ) : (
            <SyntaxHighlighter
              language={getLanguage(file.path)}
              style={customStyle}
              showLineNumbers
              wrapLines
              customStyle={{ height: '100%', overflow: 'auto', margin: 0, borderRadius: 'var(--radius)', backgroundColor: 'var(--background)' }}
            >
              {file.content}
            </SyntaxHighlighter>
        )
      ) : (
        <div className="placeholder">
           {renderPlaceholder()}
        </div>
      )}
    </Panel>
    </>
  );
};
