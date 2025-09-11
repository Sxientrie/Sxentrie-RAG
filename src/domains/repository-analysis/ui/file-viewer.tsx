import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism/';
import { Panel } from '../../../../shared/ui/panel';
import { FileCode2, ClipboardCopy, Download, Check, MousePointerClick, Github, Play, FlaskConical, WrapText } from 'lucide-react';
import { getLanguage } from '../../../../shared/lib/get-language';
import { useRepository } from '../application/repository-context';
import { UI_COPY_SUCCESS_TIMEOUT_MS, UI_DEBOUNCE_DELAY_MS, DEFAULT_DOWNLOAD_FILENAME, GENERIC_FILE_MIMETYPE, ICON_SIZE_SM, ICON_SIZE_MD, ICON_SIZE_XL, UI_FONT_SIZE_SM } from '../../../../shared/config';
interface FileViewerProps {
  onError: (message: string) => void;
}
const syntaxHighlighterStyle: React.CSSProperties = {
  height: '100%',
  margin: 0,
  borderRadius: 'var(--rounded-app)',
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
    <><FileCode2 size={ICON_SIZE_SM}/> {selectedFile ? selectedFile.path : 'Preview'}</>
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
              <WrapText size={ICON_SIZE_SM} />
          </button>
          <button
              className="file-action-btn"
              onClick={handleCopy}
              title={selectedFile.isImage ? "Cannot copy an image" : (isCopied ? "Copied!" : "Copy to clipboard")}
              aria-label="Copy file content to clipboard"
              disabled={isCopied || selectedFile.isImage}
          >
              {isCopied ? <Check size={ICON_SIZE_SM} color="var(--primary)" /> : <ClipboardCopy size={ICON_SIZE_SM} />}
          </button>
           <button
              className="file-action-btn"
              onClick={handleDownload}
              title="Download file"
              aria-label="Download file"
          >
              <Download size={ICON_SIZE_SM} />
          </button>
      </div>
  ) : null;
  const codeTagPropsStyle: React.CSSProperties = useMemo(() => {
    const style: React.CSSProperties = {
      fontFamily: 'var(--font-family-mono)',
      fontSize: UI_FONT_SIZE_SM,
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
                    <div className="step-icon"><Github size={ICON_SIZE_MD}/></div>
                    <span><strong>Paste a public GitHub URL</strong> into the input field at the top of the page.</span>
                </li>
                <li>
                    <div className="step-icon"><Play size={ICON_SIZE_MD}/></div>
                    <span><strong>Click "Load"</strong> to fetch the repository's file structure.</span>
                </li>
                <li>
                    <div className="step-icon"><FlaskConical size={ICON_SIZE_MD}/></div>
                    <span><strong>Run an analysis</strong> on the entire repo or a selected file.</span>
                </li>
            </ol>
        </div>
      );
    }
    return (
        <>
            <MousePointerClick size={ICON_SIZE_XL} strokeWidth={1} />
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
