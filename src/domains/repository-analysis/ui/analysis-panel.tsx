import React, { FC, useState, useEffect } from 'react';
import { Panel } from '../../../../shared/ui/panel';
import { AnalysisConfig, RepoInfo, ANALYSIS_SCOPES, GEMINI_MODELS, ANALYSIS_MODES } from '../domain';
import { FlaskConical, ChevronUp, ChevronDown, Download, TestTubeDiagonal, Loader2, RotateCw } from 'lucide-react';
import { getLanguage } from '../../../../shared/lib/get-language';
import { useRepository } from '../application/repository-context';
import { useAnalysisRunner } from '../application/use-analysis-runner';
import { AnalysisReportView } from './analysis-report-view';

export const AnalysisPanel: FC = () => {
  const {
    state: { selectedFile, repoInfo, analysisResults, analysisConfig, isAnalysisLoading, analysisProgressMessage, error, dismissedFindings },
    dispatch,
    selectFileByPath
  } = useRepository();
  const { runAnalysis } = useAnalysisRunner();

  const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);

  useEffect(() => {
    if (analysisResults) {
      setIsConfigCollapsed(true);
    }
  }, [analysisResults]);

  const isRepoLoaded = !!repoInfo;

  const handleDownloadReport = (): void => {
    if (!analysisResults || !repoInfo) return;

    const reportDate = new Date().toUTCString();
    const reportParts: string[] = [];

    reportParts.push(`# Sxentrie Analysis Report for ${repoInfo.repo}\n\n`);
    reportParts.push(`**Repository:** https://github.com/${repoInfo.owner}/${repoInfo.repo}\n`);
    reportParts.push(`**Report Generated:** ${reportDate}\n\n`);
    reportParts.push(`## Analysis Configuration\n\n`);

    if (analysisConfig.scope === ANALYSIS_SCOPES.FILE && selectedFile) {
      reportParts.push(`*   **Scope:** Selected File (\`${selectedFile.path}\`)\n`);
    } else {
      reportParts.push(`*   **Scope:** Entire Repository\n`);
    }
    if (analysisConfig.customRules) {
      reportParts.push(`*   **Custom Directives:** \n\`\`\`\n${analysisConfig.customRules}\n\`\`\`\n`);
    } else {
      reportParts.push(`*   **Custom Directives:** None\n`);
    }
    reportParts.push(`\n---\n\n`);

    reportParts.push(`## Project Overview\n\n${analysisResults.overview}\n\n---\n\n`);

    reportParts.push(`## Technical Review\n\n`);
    if (analysisResults.review.length === 0) {
      reportParts.push(`No specific technical issues were found based on the provided criteria.\n`);
    } else {
      analysisResults.review.forEach((finding, index) => {
        reportParts.push(`### ${index + 1}. ${finding.finding}\n\n`);
        reportParts.push(`**File:** \`${finding.fileName}\`\n\n`);
        finding.explanation.forEach(step => {
          if (step.type === 'text') {
            reportParts.push(`${step.content}\n\n`);
          } else if (step.type === 'code') {
            const language = getLanguage(finding.fileName);
            reportParts.push(`\`\`\`${language}\n${step.content}\n\`\`\`\n\n`);
          }
        });
        reportParts.push(`\n`);
      });
    }

    const md = reportParts.join('');
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${repoInfo.repo}-analysis-report.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const setConfig = (cfg: Partial<AnalysisConfig>) => dispatch({ type: 'SET_ANALYSIS_CONFIG', payload: cfg });

  const isFileAnalysisDisabled = !selectedFile || selectedFile.isImage === true;
  const ConfigCollapseIcon = isConfigCollapsed ? ChevronDown : ChevronUp;

  const dismissedCount = dismissedFindings.size;

  const panelTitle = <><FlaskConical size={14} /> Analysis Engine</>;

  const panelActions = (
    <>
      {dismissedCount > 0 && (
        <button
          className="panel-action-btn"
          onClick={() => dispatch({ type: 'RESET_DISMISSED_FINDINGS' })}
          title={`Show all ${dismissedCount} dismissed findings`}
          aria-label="Restore dismissed findings"
        >
          <RotateCw size={14} />
        </button>
      )}
      {analysisResults && (
        <button
          className="panel-action-btn"
          onClick={handleDownloadReport}
          disabled={!analysisResults || !repoInfo}
          title="Download analysis as Markdown file"
          aria-label="Download analysis report"
        >
          <Download size={14} />
        </button>
      )}
      <button
        className="panel-toggle-btn"
        onClick={() => setIsConfigCollapsed(prev => !prev)}
        title={isConfigCollapsed ? "Show configuration" : "Hide configuration"}
        aria-label={isConfigCollapsed ? "Show configuration" : "Hide configuration"}
        aria-expanded={!isConfigCollapsed}
      >
        <ConfigCollapseIcon size={14} />
      </button>
    </>
  );


  return (
    <Panel
      className="analysis-panel"
      title={panelTitle}
      actions={panelActions}
    >
      <div className={`analysis-config-wrapper ${isConfigCollapsed ? 'collapsed' : ''}`}>
        <div className="analysis-config">
          <div className="custom-rules">
            <textarea
              placeholder='Guide Sxentrie with specific instructions, e.g., "Focus on security vulnerabilities" or "Ignore styling issues and check for performance bottlenecks."'
              value={analysisConfig.customRules}
              onChange={(e) => setConfig({ customRules: e.target.value })}
              disabled={isAnalysisLoading}
            />
          </div>
          <div className="analysis-config-grid">
            <div className="radio-group">
              <label htmlFor="scope-all">
                <input
                  type="radio"
                  id="scope-all"
                  name="scope"
                  value={ANALYSIS_SCOPES.ALL}
                  checked={analysisConfig.scope === ANALYSIS_SCOPES.ALL}
                  onChange={() => setConfig({ scope: ANALYSIS_SCOPES.ALL })}
                  disabled={isAnalysisLoading}
                />
                <span className="custom-radio"></span>
                <div className="radio-label-content">
                  <span className="radio-label-title">Entire Repo</span>
                  <span className="radio-label-description">Analyzes all supported files.</span>
                </div>
              </label>
              <label htmlFor="scope-file" title={isFileAnalysisDisabled ? 'Select a text file to enable this option' : ''}>
                <input
                  type="radio"
                  id="scope-file"
                  name="scope"
                  value={ANALYSIS_SCOPES.FILE}
                  checked={analysisConfig.scope === ANALYSIS_SCOPES.FILE}
                  onChange={() => setConfig({ scope: ANALYSIS_SCOPES.FILE })}
                  disabled={isAnalysisLoading || isFileAnalysisDisabled}
                />
                <span className="custom-radio"></span>
                <div className="radio-label-content">
                  <span className="radio-label-title">Selected File</span>
                  <span className="radio-label-description">Focuses on the active file.</span>
                </div>
              </label>
            </div>
            <div className="radio-group">
              <label htmlFor="mode-fast">
                <input
                  type="radio"
                  id="mode-fast"
                  name="mode"
                  value={ANALYSIS_MODES.FAST}
                  checked={analysisConfig.mode === ANALYSIS_MODES.FAST}
                  onChange={() => setConfig({ mode: ANALYSIS_MODES.FAST, model: GEMINI_MODELS.FLASH })}
                  disabled={isAnalysisLoading}
                />
                <span className="custom-radio"></span>
                <div className="radio-label-content">
                  <span className="radio-label-title">Fast Scan</span>
                  <span className="radio-label-description">Quick overview for initial assessments.</span>
                </div>
              </label>
              <label htmlFor="mode-deep">
                <input
                  type="radio"
                  id="mode-deep"
                  name="mode"
                  value={ANALYSIS_MODES.DEEP}
                  checked={analysisConfig.mode === ANALYSIS_MODES.DEEP}
                  onChange={() => setConfig({ mode: ANALYSIS_MODES.DEEP, model: GEMINI_MODELS.PRO })}
                  disabled={isAnalysisLoading}
                />
                <span className="custom-radio"></span>
                <div className="radio-label-content">
                  <span className="radio-label-title">Deep Scan</span>
                  <span className="radio-label-description">Slower, more thorough analysis.</span>
                </div>
              </label>
            </div>
          </div>
          <div className="analysis-actions" style={{ justifyContent: 'flex-end' }}>
            <button
              className="btn btn-sm btn-primary"
              onClick={runAnalysis}
              disabled={isAnalysisLoading || !isRepoLoaded}
            >
              {isAnalysisLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FlaskConical size={14} />
              )}
              {isAnalysisLoading ? "Analyzing..." : "Run Analysis"}
            </button>
          </div>
        </div>
      </div>

      {isAnalysisLoading && (
        <div className="thinking-progress">
          <p key={analysisProgressMessage} className="thinking-text">
            {analysisProgressMessage || "Initializing analysis..."}
          </p>
        </div>
      )}

      {error && !isAnalysisLoading && <div className="error-message">{error}</div>}

      {!isAnalysisLoading && !analysisResults && !error && (
        <div className="placeholder placeholder-top">
          {isRepoLoaded ? (
            <>
              <TestTubeDiagonal size={48} strokeWidth={1} />
              <p style={{ maxWidth: '80%' }}>Your analysis results will appear here.</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', maxWidth: '80%' }}>
                Configure your analysis scope, add custom directives if you like, and click "Run Analysis" to begin.
              </p>
            </>
          ) : (
            <p>Load a repository to enable the Analysis Engine.</p>
          )}
        </div>
      )}

      {analysisResults && !isAnalysisLoading && (
        <AnalysisReportView
          analysisResults={analysisResults}
          onFileSelect={selectFileByPath}
        />
      )}
    </Panel>
  );
};
