import React, { FC, useState, useCallback, useMemo } from 'react';
import { AnalysisResults, TechnicalReviewFinding, ANALYSIS_TABS } from '../domain';
import { useRepository } from '../application/repository-context';
import { RepositoryAction } from '../application/repository-context';
import { FileCheck2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism/';
import { getLanguage } from '../../../../shared/lib/get-language';
import { ICON_SIZE_SM, ICON_SIZE_XL, UI_FONT_SIZE_SM, UI_FONT_SIZE_MD } from '../../../../shared/config';
const codeViewerStyle = {
  ...vscDarkPlus,
  'code[class*="language-"]': {
    ...vscDarkPlus['code[class*="language-"]'],
    fontFamily: 'var(--font-family-mono)',
    fontSize: UI_FONT_SIZE_SM,
  },
  'pre[class*="language-"]': {
    ...vscDarkPlus['pre[class*="language-"]'],
    backgroundColor: 'transparent',
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
  const language = getLanguage(finding.fileName);
  const handleClick = useCallback(() => {
    onFileSelect(finding.fileName);
    if (finding.startLine && finding.endLine) {
      dispatch({
        type: 'SET_ACTIVE_LINE_RANGE',
        payload: { start: finding.startLine, end: finding.endLine }
      });
    } else {
      dispatch({ type: 'SET_ACTIVE_LINE_RANGE', payload: null });
    }
  }, [onFileSelect, finding.fileName, finding.startLine, finding.endLine, dispatch]);
  return (
    <div className="review-finding">
      <div className="review-finding-header">
        <div className="finding-header-left">
            <span className={`severity-badge severity-${finding.severity.toLowerCase()}`}>{finding.severity}</span>
            <button className="clickable-filepath" onClick={handleClick}>
              {finding.fileName}
            </button>
        </div>
        <button
          className="panel-action-btn"
          onClick={() => onDismiss(id)}
          title="Dismiss this finding"
          aria-label="Dismiss this finding"
        >
          <X size={ICON_SIZE_SM} />
        </button>
      </div>
      <div className="review-finding-body markdown-content">
        <h4>{finding.finding}</h4>
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
    </div>
  );
};
interface AnalysisReportViewProps {
  analysisResults: AnalysisResults;
  onFileSelect: (path: string) => void;
}
export const AnalysisReportView: FC<AnalysisReportViewProps> = ({ analysisResults, onFileSelect }) => {
  const { state: { dismissedFindings }, dispatch } = useRepository();
  const [activeTab, setActiveTab] = useState<ANALYSIS_TABS>(ANALYSIS_TABS.OVERVIEW);
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
      <div className="tabs">
        <div className="tabs-nav">
          <button className={`tab-btn ${activeTab === ANALYSIS_TABS.OVERVIEW ? 'active' : ''}`} onClick={() => setActiveTab(ANALYSIS_TABS.OVERVIEW)}>Project Overview</button>
          <button className={`tab-btn ${activeTab === ANALYSIS_TABS.REVIEW ? 'active' : ''}`} onClick={() => setActiveTab(ANALYSIS_TABS.REVIEW)}>
            Technical Review ({visibleFindings.length})
            {dismissedCount > 0 && <span style={{ marginLeft: '6px', opacity: 0.7 }}>({dismissedCount} hidden)</span>}
          </button>
        </div>
      </div>
      {activeTab === ANALYSIS_TABS.OVERVIEW && (
        <div className="tab-content markdown-content" aria-live="polite">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysisResults.overview}</ReactMarkdown>
        </div>
      )}
      {activeTab === ANALYSIS_TABS.REVIEW && (
        <div className="tab-content" aria-live="polite">
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
              No specific technical issues found based on the criteria.
              {dismissedCount > 0 && <p style={{ fontSize: UI_FONT_SIZE_MD, color: 'var(--muted-foreground)' }}>({dismissedCount} findings are hidden.)</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
