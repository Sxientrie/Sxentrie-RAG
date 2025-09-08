/**
 * @file src/domains/repository-analysis/ui/file-viewer.tsx
 * @version 0.5.1
 * @description A component to display the content of a selected file with syntax highlighting.
 *
 * @module RepositoryAnalysis.UI
 *
 * @summary This component is responsible for viewing the content of the selected file. It uses `react-syntax-highlighter` for code files, displays images for image files, and shows a placeholder or onboarding guide when no file is selected. It also provides actions like copying, downloading, and toggling line wrap for the file content.
 *
 * @dependencies
 * - react
 * - react-syntax-highlighter
 * - lucide-react
 * - ../../../../shared/ui/panel
 * - ../../../../shared/lib/get-language
 * - ../../../../shared/config
 * - ../application/repository-context
 *
 * @outputs
 * - Exports the `FileViewer` React component.
 *
 * @changelog
 * - v0.5.1 (2025-09-09): Set line wrapping to be disabled by default.
 * - v0.5.0 (2025-09-09): Implemented the definitive fix for line wrapping by using `codeTagProps` to apply corrective CSS overrides, as detailed in the user-provided research.
 * - v0.4.0 (2025-09-09): Implemented a definitive fix for line-wrapping by using the library's official `wrapLines` prop and `codeTagProps`, which correctly overrides theme styles.
 * - v0.3.0 (2025-09-09): Fixed line-wrap by dynamically modifying the highlighter theme to correctly apply `white-space: pre-wrap`.
 * - v0.2.2 (2025-09-09): Fixed the line-wrap toggle by applying `min-width: 0` to the flex-item code viewer, forcing it to obey container width.
 * - v0.2.1 (2025-09-09): Fixed a bug where the line-wrap toggle was not working due to a conflicting CSS overflow property.
 * - v0.2.0 (2025-09-09): Added a feature to toggle line wrapping in the code viewer.
 * - v0.1.0 (2025-09-08): File created and documented.
 */
import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism/';
import { Panel } from '../../../../shared/ui/panel';
import { FileCode2, ClipboardCopy, Download, Check, MousePointerClick, Github, Play, FlaskConical, WrapText } from 'lucide-react';
import { getLanguage } from '../../../../shared/lib/get-language';
import { useRepository } from '../application/repository-context';
import { UI_COPY_SUCCESS_TIMEOUT_MS, UI_DEBOUNCE_DELAY_MS, DEFAULT_DOWNLOAD_FILENAME, GENERIC_FILE_MIMETYPE } from '../../../../shared/config';

interface FileViewerProps {
  onError: (message: string) => void;
}

const syntaxHighlighterStyle: React.CSSProperties = { 
  height: '100%', 
  margin: 0, 
  borderRadius: 'var(--radius)', 
  backgroundColor: 'var(--background)', 
  minWidth: 0 
};

export const FileViewer: FC<FileViewerProps> = ({ onError }) => {
  const { state: { selectedFile, repoInfo, activeLineRange, findingsMap } } = useRepository();
  const [isCopied, setIsCopied] = useState(false);
  const [isWrapEnabled, setIsWrapEnabled] = useState(false);
  const isRepoLoaded = !!repoInfo;

  useEffect(() => {
    if (activeLineRange) {
      // Small delay to allow react-syntax-highlighter to render the new props
      const timer = setTimeout(() => {
        const highlightedElement = document.querySelector('.line-highlight');
        if (highlightedElement) {
          highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, UI_DEBOUNCE_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [activeLineRange]);

  const handleCopy = useCallback(async (): Promise<void> => {
    if (!selectedFile || selectedFile.isImage) return;
    try {
        await navigator.clipboard.writeText(selectedFile.content);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), UI_COPY_SUCCESS_TIMEOUT_MS);
    } catch (err) {
        onError('Failed to copy file content to clipboard.');
    }
  }, [selectedFile, onError]);

  const handleDownload = useCallback(async (): Promise<void> => {
      if (!selectedFile) return;
      
      const fileName = selectedFile.path.split('/').pop() || DEFAULT_DOWNLOAD_FILENAME;
      let blob;
      
      try {
        if (selectedFile.isImage && selectedFile.url) {
            const response = await fetch(selectedFile.url);
            if (!response.ok) throw new Error('Network response was not ok');
            blob = await response.blob();
        } else {
            blob = new Blob([selectedFile.content], { type: GENERIC_FILE_MIMETYPE });
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
  }, [selectedFile, onError]);
  
  const toggleWrap = useCallback(() => setIsWrapEnabled(p => !p), []);
  
  const panelTitle = (
    <><FileCode2 size={14}/> {selectedFile ? selectedFile.path : 'Preview'}</>
  );
  
  const panelActions = selectedFile ? (
      <div className="file-actions">
           <button
              className="file-action-btn"
              onClick={toggleWrap}
              title={isWrapEnabled ? "Disable line wrapping" : "Enable line wrapping"}
              aria-label={isWrapEnabled ? "Disable line wrapping" : "Enable line wrapping"}
              disabled={!selectedFile || selectedFile.isImage}
          >
              <WrapText size={14} />
          </button>
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
  
  const codeTagPropsStyle: React.CSSProperties = useMemo(() => {
    const style: React.CSSProperties = {
      fontFamily: 'var(--font-family-mono)',
      fontSize: '0.8rem',
    };
    if (isWrapEnabled) {
      style.whiteSpace = 'pre-wrap';
      style.wordBreak = 'break-word';
    } else {
      style.whiteSpace = 'pre';
    }
    return style;
  }, [isWrapEnabled]);


  const renderPlaceholder = useCallback((): JSX.Element => {
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
  }, [isRepoLoaded]);

  const getLineProps = useCallback((lineNumber: number) => {
    if (activeLineRange && lineNumber >= activeLineRange.start && lineNumber <= activeLineRange.end) {
      return { className: 'line-highlight' };
    }
    return {};
  }, [activeLineRange]);

  const getLineNumberStyle = useCallback((lineNumber: number) => {
    const fileFindings = selectedFile ? findingsMap.get(selectedFile.path) : undefined;
    if (fileFindings?.has(lineNumber)) {
        return { className: 'gutter-marker' } as React.CSSProperties;
    }
    return {};
  }, [selectedFile, findingsMap]);


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
              style={vscDarkPlus}
              showLineNumbers
              wrapLines={true}
              lineProps={getLineProps}
              lineNumberStyle={getLineNumberStyle}
              customStyle={syntaxHighlighterStyle}
              codeTagProps={{
                style: codeTagPropsStyle
              }}
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
