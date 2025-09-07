import React, { FC, useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism/';
import { Panel } from '../../../../shared/ui/panel';
import { FileCode2, ClipboardCopy, Download, Check, MousePointerClick, Github, Play, FlaskConical } from 'lucide-react';
import { getLanguage } from '../../../../shared/lib/get-language';
import { useRepository } from '../application/repository-context';

const customStyle = {
    ...vscDarkPlus,
    'pre[class*="language-"]': {
        ...vscDarkPlus['pre[class*="language-"]'],
        backgroundColor: 'var(--background)',
        margin: 0,
        padding: '1rem',
        height: '100%',
    },
     'code[class*="language-"]': {
        ...vscDarkPlus['code[class*="language-"]'],
        fontFamily: 'var(--font-family-mono)',
        fontSize: '0.8rem',
    }
};

interface FileViewerProps {
  onError: (message: string) => void;
}

export const FileViewer: FC<FileViewerProps> = ({ onError }) => {
  const { state: { selectedFile, repoInfo, activeLineRange, findingsMap } } = useRepository();
  const [isCopied, setIsCopied] = useState(false);
  const isRepoLoaded = !!repoInfo;

  useEffect(() => {
    if (activeLineRange) {
      // Small delay to allow react-syntax-highlighter to render the new props
      const timer = setTimeout(() => {
        const highlightedElement = document.querySelector('.line-highlight');
        if (highlightedElement) {
          highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeLineRange]);

  const handleCopy = (): void => {
    if (!selectedFile || selectedFile.isImage) return;
    navigator.clipboard.writeText(selectedFile.content).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
        onError('Failed to copy file content to clipboard.');
    });
  };

  const handleDownload = async (): Promise<void> => {
      if (!selectedFile) return;
      
      const fileName = selectedFile.path.split('/').pop() || 'download';
      let blob;
      
      try {
        if (selectedFile.isImage && selectedFile.url) {
            const response = await fetch(selectedFile.url);
            if (!response.ok) throw new Error('Network response was not ok');
            blob = await response.blob();
        } else {
            blob = new Blob([selectedFile.content], { type: 'text/plain;charset=utf-8' });
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
      } catch (error) {
          onError('Failed to download file. An unexpected error occurred.');
      }
  };
  
  const panelTitle = (
    <><FileCode2 size={14}/> {selectedFile ? selectedFile.path : 'Preview'}</>
  );
  
  const panelActions = selectedFile ? (
      <div className="file-actions">
          <button
              className="file-action-btn"
              onClick={handleCopy}
              title={selectedFile.isImage ? "Cannot copy an image" : (isCopied ? "Copied!" : "Copy to clipboard")}
              aria-label="Copy file content to clipboard"
              disabled={isCopied || selectedFile.isImage}
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
    <Panel
        className="file-viewer-panel"
        title={panelTitle}
        actions={panelActions}
    >
      {selectedFile ? (
        selectedFile.isImage && selectedFile.url ? (
            <div className="image-viewer-container">
              <img src={selectedFile.url} alt={selectedFile.path} className="image-preview" />
            </div>
        ) : (
            <SyntaxHighlighter
              language={getLanguage(selectedFile.path)}
              style={customStyle}
              showLineNumbers
              wrapLines
              lineProps={(lineNumber) => {
                if (activeLineRange && lineNumber >= activeLineRange.start && lineNumber <= activeLineRange.end) {
                  return { className: 'line-highlight' };
                }
                return {};
              }}
              lineNumberStyle={(lineNumber: number) => {
                const fileFindings = selectedFile ? findingsMap.get(selectedFile.path) : undefined;
                if (fileFindings?.has(lineNumber)) {
                    return { className: 'gutter-marker' } as React.CSSProperties;
                }
                return {};
              }}
              customStyle={{ height: '100%', overflow: 'auto', margin: 0, borderRadius: 'var(--radius)', backgroundColor: 'var(--background)' }}
            >
              {selectedFile.content}
            </SyntaxHighlighter>
        )
      ) : (
        <div className="placeholder">
           {renderPlaceholder()}
        </div>
      )}
    </Panel>
  );
};