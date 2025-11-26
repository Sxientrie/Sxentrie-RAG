import React, { FC, useState, useCallback, useMemo } from 'react';
import { AnalysisResults, TechnicalReviewFinding, ANALYSIS_TABS } from '../domain';
import { useRepository } from '../application/repository-context';
import { RepositoryAction } from '../application/repository-context';
import { FileCheck2, X, ClipboardCopy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nord } from 'react-syntax-highlighter/dist/esm/styles/prism/';
import { getLanguage } from '../../../../shared/lib/get-language';
import {
  ICON_SIZE_SM, ICON_SIZE_XL, UI_FONT_SIZE_SM, UI_FONT_SIZE_MD, CssFontFamilyMono, CssTransparent,
  TitleDismissFinding, LabelNoIssuesFound, LabelHiddenFindingsCountTemplate, UI_COPY_SUCCESS_TIMEOUT_MS,
  ErrorFailedToCopyMarkdown
} from '../../../../shared/config';

const codeViewerStyle = {
  ...nord,
  'code[class*="language-"]': {
    ...nord['code[class*="language-"]'],
    fontFamily: CssFontFamilyMono,
    fontSize: UI_FONT_SIZE_SM,
  },
  'pre[class*="language-"]': {
    ...nord['pre[class*="language-"]'],
    backgroundColor: CssTransparent,
  }
};

interface FindingProps {
  finding: TechnicalReviewFinding;
  onFileSelect: (path: string) => void;
  dispatch: React.Dispatch<RepositoryAction>;
  id: string;
  onDismiss: (id: string) => void;
}

const Finding: FC<FindingProps> = ({ finding, onFileSelect, dispatch, id, onDismiss }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const language = getLanguage(finding.fileName);

  const handleCopyToClipboard = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const lines = finding.startLine && finding.endLine ? `${finding.startLine}-${finding.endLine}` : 'N/A';

    const markdownParts = [
      `### ${finding.finding}`,
      ``,
      `| Severity | File | Line(s) |`,
      `|:---|:---|:---|`,
      `| ${finding.severity} | \`${finding.fileName}\` | ${lines} |`,
      ``,
      ...finding.explanation.map(step => {
        if (step.type === 'text') {
          return step.content;
        }
        if (step.type === 'code') {
          const codeLang = getLanguage(finding.fileName);
          return `\`\`\`${codeLang}\n${step.content}\n\`\`\``;
        }
        return '';
      })
    ];
    const markdownString = markdownParts.join('\n');

    try {
      await navigator.clipboard.writeText(markdownString);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), UI_COPY_SUCCESS_TIMEOUT_MS);
    } catch (err) {
      console.error(ErrorFailedToCopyMarkdown, err);
    }
  }, [finding]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(finding.fileName);
    if (finding.startLine && finding.endLine) {
      dispatch({
        type: 'SET_ACTIVE_LINE_RANGE',
        payload: { start: finding.startLine, end: finding.endLine }
      });
    } else {
      dispatch({ type: 'SET_ACTIVE_LINE_RANGE', payload: null });
    }
    dispatch({ type: 'SET_ACTIVE_TAB', payload: ANALYSIS_TABS.EDITOR });
  }, [onFileSelect, finding.fileName, finding.startLine, finding.endLine, dispatch]);

  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return (
    <div className={`review-finding ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="review-finding-header" onClick={toggleExpand}>
        <div className="finding-header-left">
          <button className="expand-toggle" aria-label={isExpanded ? "Collapse" : "Expand"}>
            {isExpanded ? <ChevronDown size={ICON_SIZE_SM} /> : <ChevronRight size={ICON_SIZE_SM} />}
          </button>
          <span className={`severity-badge severity-${finding.severity.toLowerCase()}`}>{finding.severity}</span>
          <span className="finding-title">{finding.finding}</span>
        </div>
        <div className="finding-header-actions">
          <button className="clickable-filepath" onClick={handleClick} title={finding.fileName}>
            {finding.fileName.split('/').pop()}
          </button>
          <div className="action-divider" />
          <button
            className="panel-action-btn"
            onClick={handleCopyToClipboard}
            title={isCopied ? "Copied!" : "Copy as markdown"}
            aria-label="Copy finding as markdown"
            disabled={isCopied}
          >
            {isCopied ? <Check size={ICON_SIZE_SM} color="var(--primary)" /> : <ClipboardCopy size={ICON_SIZE_SM} />}
          </button>
          <button
            className="panel-action-btn"
            onClick={(e) => { e.stopPropagation(); onDismiss(id); }}
            title={TitleDismissFinding}
            aria-label={TitleDismissFinding}
          >
            <X size={ICON_SIZE_SM} />
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="review-finding-body markdown-content">
          {finding.explanation.map((step, index) => {
            if (step.type === 'text') {
              return <ReactMarkdown key={index} remarkPlugins={[remarkGfm]}>{step.content}</ReactMarkdown>;
            }
            if (step.type === 'code') {
              return (
                <div className="code-block-wrapper" key={index}>
                  <SyntaxHighlighter
                    language={language}
                    style={codeViewerStyle}
                    customStyle={{ margin: 0, padding: '0.75rem 1rem' }}
                  >
                    {step.content}
                  </SyntaxHighlighter>
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
};

interface AnalysisReportViewProps {
  analysisResults: AnalysisResults;
  onFileSelect: (path: string) => void;
}

export const AnalysisReportView: FC<AnalysisReportViewProps> = ({ analysisResults, onFileSelect }) => {
  const { state: { dismissedFindings }, dispatch } = useRepository();
  const findingWithIds = useMemo(() => analysisResults.review.map((finding, i) => ({
    ...finding,
    id: `${finding.fileName}-${finding.finding}-${i}`
  })), [analysisResults.review]);
  const visibleFindings = useMemo(() => findingWithIds.filter(f => !dismissedFindings.has(f.id)), [findingWithIds, dismissedFindings]);
  const dismissedCount = dismissedFindings.size;
  const handleDismiss = useCallback((id: string) => {
    dispatch({ type: 'DISMISS_FINDING', payload: id });
  }, [dispatch]);
  return (
    <div className="analysis-results">
      <div className="tab-content" aria-live="polite">
        {dismissedCount > 0 && <p style={{ fontSize: UI_FONT_SIZE_MD, color: 'var(--muted-foreground)' }}>{LabelHiddenFindingsCountTemplate.replace('{0}', String(dismissedCount))}</p>}
        {visibleFindings.length > 0 ? visibleFindings.map((finding) => (
          <Finding
            key={finding.id}
            finding={finding}
            onFileSelect={onFileSelect}
            dispatch={dispatch}
            id={finding.id}
            onDismiss={handleDismiss}
          />
        )) : (
          <div className="placeholder">
            <FileCheck2 size={ICON_SIZE_XL} strokeWidth={1} />
            {LabelNoIssuesFound}
          </div>
        )}
      </div>
    </div>
  );
};