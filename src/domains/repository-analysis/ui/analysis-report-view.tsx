import React, { FC, useState, useCallback, useMemo } from 'react';
import { AnalysisResults, TechnicalReviewFinding, ANALYSIS_TABS } from '../domain';
import { useRepository } from '../application/repository-context';
import { RepositoryAction } from '../application/repository-context';
import { FileCheck2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nord } from 'react-syntax-highlighter/dist/esm/styles/prism/';
import { getLanguage } from '../../../../shared/lib/get-language';
import {
    ICON_SIZE_SM, ICON_SIZE_XL, UI_FONT_SIZE_SM, UI_FONT_SIZE_MD, CssFontFamilyMono, CssTransparent,
    TitleDismissFinding, LabelNoIssuesFound, LabelHiddenFindingsCountTemplate
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
    dispatch({ type: 'SET_ACTIVE_TAB', payload: ANALYSIS_TABS.EDITOR });
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
          title={TitleDismissFinding}
          aria-label={TitleDismissFinding}
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