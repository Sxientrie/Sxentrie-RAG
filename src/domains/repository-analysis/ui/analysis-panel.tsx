/**
 * @file src/domains/repository-analysis/ui/analysis-panel.tsx
 * @version 0.4.0
 * @description The UI panel for configuring and displaying code analysis results.
 *
 * @module RepositoryAnalysis.UI
 *
 * @summary This component provides the user interface for the core analysis feature. It includes controls for setting analysis configuration (scope, mode, custom rules), a button to trigger the analysis, and views for displaying loading states, errors, and the final analysis report. It consumes the `RepositoryContext` to interact with application state.
 *
 * @dependencies
 * - react
 * - lucide-react
 * - ../../../../shared/ui/panel
 * - ../domain
 * - ../application/repository-context
 * - ../application/use-analysis-runner
 * - ./analysis-report-view
 * - ../../../../shared/config
 *
 * @outputs
 * - Exports the `AnalysisPanel` React component.
 *
 * @changelog
 * - v0.4.0 (2025-09-15): Removed all local error rendering logic to delegate error display to the main app footer. Errors are now lifted up to the parent component.
 * - v0.3.0 (2025-09-08): Implemented dynamic file count preview for analysis scope options.
 * - v0.2.0 (2025-09-08): Implemented the UI and logic for the 'Generate Docs' feature.
 * - v0.1.0 (2025-09-08): File created and documented.
 */
import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import { Panel } from '../../../../shared/ui/panel';
import { AnalysisConfig, RepoInfo, ANALYSIS_SCOPES, ANALYSIS_MODES, GEMINI_MODELS } from '../domain';
import { FlaskConical, ChevronUp, ChevronDown, Download, TestTubeDiagonal, Loader2, RotateCw, BookText, X } from 'lucide-react';
import { getLanguage } from '../../../../shared/lib/get-language';
import { useRepository } from '../application/repository-context';
import { ICON_SIZE_SM, ICON_SIZE_XL, UI_FONT_SIZE_MD, UI_GAP_SM } from '../../../../shared/config';
import { useAnalysisRunner } from '../application/use-analysis-runner';
import { AnalysisReportView } from './analysis-report-view';
import { generateDocumentation } from '../infrastructure/gemini-service';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MAX_GEMINI_FILE_COUNT, MARKDOWN_FILE_EXTENSION, REPORT_FILE_MIMETYPE } from '../../../../shared/config';
import { collectAllFiles } from '../application/file-tree-utils';
import { ApiKeyError } from '../../../../shared/errors/api-key-error';

const isApiKeyError = (msg: string | null): boolean => !!msg && msg.startsWith('Gemini API key not found');

export const AnalysisPanel: FC = () => {
  const {
    state: { selectedFile, repoInfo, fileTree, analysisResults, analysisConfig, isAnalysisLoading, analysisProgressMessage, error, dismissedFindings, isDocLoading, docProgressMessage, generatedDoc, docError, totalAnalyzableFiles },
    dispatch,
    selectFileByPath,
    openSettingsPanel,
    onError,
  } = useRepository();
  const { runAnalysis } = useAnalysisRunner();

  const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);
  const isRepoLoaded = !!repoInfo;

  useEffect(() => {
    if (analysisResults || generatedDoc) {
      setIsConfigCollapsed(true);
    }
  }, [analysisResults, generatedDoc]);

  useEffect(() => {
    if (!isRepoLoaded) {
      dispatch({ type: 'SET_ANALYSIS_PREVIEW_PATHS', payload: new Set() });
      return;
    }

    let paths = new Set<string>();

    if (analysisConfig.scope === ANALYSIS_SCOPES.FILE && selectedFile && !selectedFile.isImage) {
      paths.add(selectedFile.path);
    } else if (analysisConfig.scope === ANALYSIS_SCOPES.ALL) {
      const allFiles = collectAllFiles(fileTree);
      const filesToConsider = analysisConfig.mode === ANALYSIS_MODES.FAST
        ? allFiles.slice(0, MAX_GEMINI_FILE_COUNT)
        : allFiles;

      paths = new Set(filesToConsider.map(f => f.path));
    }

    dispatch({ type: 'SET_ANALYSIS_PREVIEW_PATHS', payload: paths });
  }, [analysisConfig, fileTree, selectedFile, isRepoLoaded, dispatch]);

  const fastScanPreviewText = useMemo(() => {
    return `Analyzes the first ${Math.min(MAX_GEMINI_FILE_COUNT, totalAnalyzableFiles)} files.`;
  }, [totalAnalyzableFiles]);

  const deepScanPreviewText = useMemo(() => {
    return `Analyzes all ${totalAnalyzableFiles} supported files.`;
  }, [totalAnalyzableFiles]);

  const handleDownloadReport = useCallback((): void => {
    if (!analysisResults || !repoInfo) return;

    const reportDate = new Date().toUTCString();
    const reportParts: string[] = [];
    const findings = analysisResults.review;

    // --- Report Header ---
    reportParts.push(`# Sxentrie Analysis Report for ${repoInfo.repo}\n\n`);
    reportParts.push(`**Repository:** https://github.com/${repoInfo.owner}/${repoInfo.repo}\n`);
    reportParts.push(`**Report Generated:** ${reportDate}\n\n`);
    reportParts.push(`---\n`);

    // --- Configuration ---
    reportParts.push(`## Analysis Configuration\n\n`);
    if (analysisConfig.scope === ANALYSIS_SCOPES.FILE && selectedFile) {
      reportParts.push(`*   **Scope:** Selected File (\`${selectedFile.path}\`)\n`);
    } else {
      reportParts.push(`*   **Scope:** Entire Repository\n`);
    }
    reportParts.push(`*   **Mode:** ${analysisConfig.mode.charAt(0).toUpperCase() + analysisConfig.mode.slice(1)} Scan\n`);
    if (analysisConfig.customRules) {
      reportParts.push(`*   **Custom Directives:** \n\t\`\`\`\n\t${analysisConfig.customRules}\n\t\`\`\`\n`);
    } else {
      reportParts.push(`*   **Custom Directives:** None\n`);
    }
    reportParts.push(`\n---\n`);

    // --- Project Overview ---
    reportParts.push(`## Project Overview\n\n`);
    reportParts.push(`${analysisResults.overview}\n\n---\n\n`);
    
    // --- Technical Review ---
    reportParts.push(`## Technical Review\n\n`);
    if (findings.length === 0) {
      reportParts.push(`> No specific technical issues were found based on the provided criteria.\n`);
    } else {
      // --- Summary Table ---
      const summaryTable = [
        '| Severity | Finding | File |',
        '|:---|:---|:---|',
        ...findings.map(f => `| ${f.severity} | ${f.finding} | \`${f.fileName}\` |`).join('\n'),
      ].join('\n');
      reportParts.push(summaryTable);
      reportParts.push(`\n\n---\n\n`);

      // --- Detailed Findings ---
      reportParts.push('## Findings in Detail\n\n');
      findings.forEach((finding, index) => {
        reportParts.push(`### ${index + 1}. ${finding.finding}\n\n`);

        const detailsTable = [
          '| Severity | File | Line(s) |',
          '|:---|:---|:---|',
          `| ${finding.severity} | \`${finding.fileName}\` | ${finding.startLine ? `${finding.startLine}-${finding.endLine}` : 'N/A'} |`
        ].join('\n');
        reportParts.push(detailsTable);
        reportParts.push('\n\n');

        finding.explanation.forEach(step => {
          if (step.type === 'text') {
            reportParts.push(`> ${step.content}\n\n`);
          } else if (step.type === 'code') {
            const language = getLanguage(finding.fileName);
            reportParts.push(`\`\`\`${language}\n${step.content}\n\`\`\`\n\n`);
          }
        });
        reportParts.push(`\n`);
      });
    }

    const md = reportParts.join('');
    const blob = new Blob([md], { type: REPORT_FILE_MIMETYPE });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${repoInfo.repo}-analysis-report${MARKDOWN_FILE_EXTENSION}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [analysisResults, repoInfo, analysisConfig, selectedFile]);

  const setConfig = useCallback((cfg: Partial<AnalysisConfig>) => dispatch({ type: 'SET_ANALYSIS_CONFIG', payload: cfg }), [dispatch]);

  const handleGenerateDocs = useCallback(async (): Promise<void> => {
    if (!repoInfo) return;

    dispatch({ type: 'RUN_DOC_GEN_START' });
    try {
        const result = await generateDocumentation({
            repoName: repoInfo.repo,
            fileTree,
            config: analysisConfig,
            selectedFile,
            onProgress: (msg) => dispatch({ type: 'SET_DOC_GEN_PROGRESS', payload: msg })
        });
        dispatch({ type: 'RUN_DOC_GEN_SUCCESS', payload: result });
    } catch (err) {
        if (err instanceof ApiKeyError && openSettingsPanel) {
          openSettingsPanel();
        }
        const message = err instanceof Error ? err.message : "An unknown error occurred during documentation generation.";
        dispatch({ type: 'RUN_DOC_GEN_ERROR', payload: message });
        if (onError) onError(message);
    }
  }, [repoInfo, fileTree, analysisConfig, selectedFile, dispatch, openSettingsPanel, onError]);

  const isFileAnalysisDisabled = !selectedFile || selectedFile.isImage === true;
  const ConfigCollapseIcon = isConfigCollapsed ? ChevronDown : ChevronUp;

  const dismissedCount = dismissedFindings.size;

  const panelTitle = <><FlaskConical size={ICON_SIZE_SM} /> Analysis</>;

  const panelActions = (
    <>
      {dismissedCount > 0 && (
        <button
          className="panel-action-btn"
          onClick={() => dispatch({ type: 'RESET_DISMISSED_FINDINGS' })}
          title={`Show all ${dismissedCount} dismissed findings`}
          aria-label="Restore dismissed findings"
        >
          <RotateCw size={ICON_SIZE_SM} />
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
          <Download size={ICON_SIZE_SM} />
        </button>
      )}
      <button
        className="panel-toggle-btn"
        onClick={() => setIsConfigCollapsed(prev => !prev)}
        title={isConfigCollapsed ? "Show configuration" : "Hide configuration"}
        aria-label={isConfigCollapsed ? "Show configuration" : "Hide configuration"}
        aria-expanded={!isConfigCollapsed}
      >
        <ConfigCollapseIcon size={ICON_SIZE_SM} />
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
              disabled={isAnalysisLoading || isDocLoading}
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
                  disabled={isAnalysisLoading || isDocLoading}
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
                  disabled={isAnalysisLoading || isDocLoading || isFileAnalysisDisabled}
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
                  disabled={isAnalysisLoading || isDocLoading}
                />
                <span className="custom-radio"></span>
                <div className="radio-label-content">
                  <span className="radio-label-title">Fast Scan</span>
                  <span className="radio-label-description">
                    {isRepoLoaded ? fastScanPreviewText : "Quick overview for initial assessments."}
                  </span>
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
                  disabled={isAnalysisLoading || isDocLoading}
                />
                <span className="custom-radio"></span>
                <div className="radio-label-content">
                  <span className="radio-label-title">Deep Scan</span>
                  <span className="radio-label-description">
                    {isRepoLoaded ? deepScanPreviewText : "Slower, more thorough analysis."}
                  </span>
                </div>
              </label>
            </div>
          </div>
          <div className="analysis-actions" style={{ justifyContent: 'flex-end', gap: UI_GAP_SM }}>
            <button
              className="btn btn-sm btn-outline"
              onClick={handleGenerateDocs}
              disabled={isAnalysisLoading || isDocLoading || !isRepoLoaded}
              title="Generate documentation for the selected scope"
            >
              {isDocLoading ? (
                <Loader2 size={ICON_SIZE_SM} className="animate-spin" />
              ) : (
                <BookText size={ICON_SIZE_SM} />
              )}
              {isDocLoading ? "Generating..." : "Generate Docs"}
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={runAnalysis}
              disabled={isAnalysisLoading || isDocLoading || !isRepoLoaded}
            >
              {isAnalysisLoading ? (
                <Loader2 size={ICON_SIZE_SM} className="animate-spin" />
              ) : (
                <FlaskConical size={ICON_SIZE_SM} />
              )}
              {isAnalysisLoading ? "Analyzing..." : "Run Analysis"}
            </button>
          </div>
        </div>
      </div>
      
      {isDocLoading && (
        <div className="thinking-progress">
          <p key={docProgressMessage} className="thinking-text">
            {docProgressMessage || "Initializing documentation generation..."}
          </p>
        </div>
      )}
      
      {generatedDoc && !isDocLoading && !docError && (
        <div className="analysis-results">
            <div className="tabs">
                <div className="tabs-nav">
                  <button className="tab-btn active">Generated Documentation</button>
                </div>
                 <button className="panel-action-btn" onClick={() => dispatch({ type: 'CLEAR_DOC' })} title="Clear documentation">
                    <X size={ICON_SIZE_SM} /> Clear
                </button>
            </div>
            <div className="tab-content markdown-content" aria-live="polite">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedDoc}</ReactMarkdown>
            </div>
        </div>
      )}

      {!isDocLoading && !generatedDoc && !docError && (
        <>
          {isAnalysisLoading && (
            <div className="thinking-progress">
              <p key={analysisProgressMessage} className="thinking-text">
                {analysisProgressMessage || "Initializing analysis..."}
              </p>
            </div>
          )}

          {!isAnalysisLoading && !analysisResults && !error && (
            <div className="placeholder placeholder-top">
              {isRepoLoaded ? (
                <>
                  <TestTubeDiagonal size={ICON_SIZE_XL} strokeWidth={1} />
                  <p style={{ maxWidth: '80%' }}>Your analysis results will appear here.</p>
                  <p style={{ fontSize: UI_FONT_SIZE_MD, color: 'var(--muted-foreground)', maxWidth: '80%' }}>
                    Configure your analysis scope, add custom directives if you like, and click "Run Analysis" or "Generate Docs" to begin.
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
        </>
      )}
    </Panel>
  );
};