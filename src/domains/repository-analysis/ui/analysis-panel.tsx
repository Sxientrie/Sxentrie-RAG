import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import { Panel } from '../../../../shared/ui/panel';
import { AnalysisConfig, RepoInfo, ANALYSIS_SCOPES, ANALYSIS_MODES, GEMINI_MODELS } from '../domain';
import { FlaskConical, ChevronUp, ChevronDown, Download, TestTubeDiagonal, Loader2, RotateCw, BookText, X } from 'lucide-react';
import { getLanguage } from '../../../../shared/lib/get-language';
import { useRepository } from '../application/repository-context';
import {
    ICON_SIZE_SM, ICON_SIZE_XL, UI_FONT_SIZE_MD, UI_GAP_SM, MAX_GEMINI_FILE_COUNT, MARKDOWN_FILE_EXTENSION,
    REPORT_FILE_MIMETYPE, ReportHeaderTemplate, ReportRepoUrlTemplate, ReportDateTemplate, ReportHorizontalRule,
    ReportConfigHeader, ReportScopeFileTemplate, ReportScopeRepo, ReportModeTemplate, ReportCustomDirectivesTemplate,
    ReportNoCustomDirectives, ReportOverviewHeader, ReportReviewHeader, ReportNoIssuesFound, ReportSummaryTableHeader,
    ReportSummaryTableRowTemplate, ReportDetailsHeader, ReportFindingHeaderTemplate, ReportDetailsTableHeader,
    ReportDetailsTableRowTemplate, ReportLineRangeTemplate, ReportNotApplicable, ReportQuoteTemplate,
    ReportCodeBlockTemplate, ReportFileNameTemplate, FastScanPreviewTemplate, DeepScanPreviewTemplate,
    ErrorUnknownDocGen, PlaceholderCustomInstructions, TitleEnableOnFileSelection, LabelEntireRepo,
    LabelAnalyzesAllFiles, LabelSelectedFile, LabelFocusesOnActiveFile, LabelFastScan, LabelQuickOverview,
    LabelDeepScan, LabelSlowerAnalysis, TitleGenerateDocs, LabelGenerating, LabelGenerateDocs, LabelAnalyzing,
    LabelRunAnalysis, LabelInitializingDocEngine, LabelGeneratedDocumentation, TitleClearDocumentation, LabelClear,
    LabelInitializingAnalysisEngine, LabelAnalysisResultsPlaceholder, LabelAnalysisHelpText, LabelLoadRepoToEnable,
    TitleShowDismissedFindingsTemplate, AriaLabelRestoreDismissed, TitleDownloadReport, AriaLabelDownloadReport,
    TitleShowConfig, TitleHideConfig
} from '../../../../shared/config';
import { useAnalysisRunner } from '../application/use-analysis-runner';
import { AnalysisReportView } from './analysis-report-view';
import { generateDocumentation } from '../infrastructure/gemini-service';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { collectAllFiles } from '../application/file-tree-utils';
import { ApiKeyError } from '../../../../shared/errors/api-key-error';
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
    return FastScanPreviewTemplate.replace('{0}', String(Math.min(MAX_GEMINI_FILE_COUNT, totalAnalyzableFiles)));
  }, [totalAnalyzableFiles]);
  const deepScanPreviewText = useMemo(() => {
    return DeepScanPreviewTemplate.replace('{0}', String(totalAnalyzableFiles));
  }, [totalAnalyzableFiles]);
  const handleDownloadReport = useCallback((): void => {
    if (!analysisResults || !repoInfo) return;
    const reportDate = new Date().toUTCString();
    const reportParts: string[] = [];
    const findings = analysisResults.review;
    reportParts.push(ReportHeaderTemplate.replace('{0}', repoInfo.repo));
    reportParts.push(ReportRepoUrlTemplate.replace('{0}', repoInfo.owner).replace('{1}', repoInfo.repo));
    reportParts.push(ReportDateTemplate.replace('{0}', reportDate));
    reportParts.push(ReportHorizontalRule);
    reportParts.push(ReportConfigHeader);
    if (analysisConfig.scope === ANALYSIS_SCOPES.FILE && selectedFile) {
      reportParts.push(ReportScopeFileTemplate.replace('{0}', selectedFile.path));
    } else {
      reportParts.push(ReportScopeRepo);
    }
    reportParts.push(ReportModeTemplate.replace('{0}', analysisConfig.mode.charAt(0).toUpperCase() + analysisConfig.mode.slice(1)));
    if (analysisConfig.customRules) {
      reportParts.push(ReportCustomDirectivesTemplate.replace('{0}', analysisConfig.customRules));
    } else {
      reportParts.push(ReportNoCustomDirectives);
    }
    reportParts.push(`\n${ReportHorizontalRule}`);
    reportParts.push(ReportOverviewHeader);
    reportParts.push(`${analysisResults.overview}\n\n${ReportHorizontalRule}\n`);
    reportParts.push(ReportReviewHeader);
    if (findings.length === 0) {
      reportParts.push(ReportNoIssuesFound);
    } else {
      const summaryTable = [
        ReportSummaryTableHeader,
        ...findings.map(f => ReportSummaryTableRowTemplate.replace('{0}', f.severity).replace('{1}', f.finding).replace('{2}', f.fileName)).join('\n'),
      ].join('\n');
      reportParts.push(summaryTable);
      reportParts.push(`\n\n${ReportHorizontalRule}\n`);
      reportParts.push(ReportDetailsHeader);
      findings.forEach((finding, index) => {
        reportParts.push(ReportFindingHeaderTemplate.replace('{0}', String(index + 1)).replace('{1}', finding.finding));
        const detailsTable = [
          ReportDetailsTableHeader,
          ReportDetailsTableRowTemplate
            .replace('{0}', finding.severity)
            .replace('{1}', finding.fileName)
            .replace('{2}', finding.startLine ? ReportLineRangeTemplate.replace('{0}', String(finding.startLine)).replace('{1}', String(finding.endLine)) : ReportNotApplicable)
        ].join('\n');
        reportParts.push(detailsTable);
        reportParts.push('\n\n');
        finding.explanation.forEach(step => {
          if (step.type === 'text') {
            reportParts.push(ReportQuoteTemplate.replace('{0}', step.content));
          } else if (step.type === 'code') {
            const language = getLanguage(finding.fileName);
            reportParts.push(ReportCodeBlockTemplate.replace('{0}', language).replace('{1}', step.content));
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
    a.download = ReportFileNameTemplate.replace('{0}', repoInfo.repo).replace('{1}', MARKDOWN_FILE_EXTENSION);
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
        const message = err instanceof Error ? err.message : ErrorUnknownDocGen;
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
          title={TitleShowDismissedFindingsTemplate.replace('{0}', String(dismissedCount))}
          aria-label={AriaLabelRestoreDismissed}
        >
          <RotateCw size={ICON_SIZE_SM} />
        </button>
      )}
      {analysisResults && (
        <button
          className="panel-action-btn"
          onClick={handleDownloadReport}
          disabled={!analysisResults || !repoInfo}
          title={TitleDownloadReport}
          aria-label={AriaLabelDownloadReport}
        >
          <Download size={ICON_SIZE_SM} />
        </button>
      )}
      <button
        className="panel-toggle-btn"
        onClick={() => setIsConfigCollapsed(prev => !prev)}
        title={isConfigCollapsed ? TitleShowConfig : TitleHideConfig}
        aria-label={isConfigCollapsed ? TitleShowConfig : TitleHideConfig}
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
              className="input"
              placeholder={PlaceholderCustomInstructions}
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
                  <span className="radio-label-title">{LabelEntireRepo}</span>
                  <span className="radio-label-description">{LabelAnalyzesAllFiles}</span>
                </div>
              </label>
              <label htmlFor="scope-file" title={isFileAnalysisDisabled ? TitleEnableOnFileSelection : ''}>
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
                  <span className="radio-label-title">{LabelSelectedFile}</span>
                  <span className="radio-label-description">{LabelFocusesOnActiveFile}</span>
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
                  <span className="radio-label-title">{LabelFastScan}</span>
                  <span className="radio-label-description">
                    {isRepoLoaded ? fastScanPreviewText : LabelQuickOverview}
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
                  <span className="radio-label-title">{LabelDeepScan}</span>
                  <span className="radio-label-description">
                    {isRepoLoaded ? deepScanPreviewText : LabelSlowerAnalysis}
                  </span>
                </div>
              </label>
            </div>
          </div>
          <div className="analysis-actions" style={{ justifyContent: 'flex-end', gap: UI_GAP_SM }}>
            <button
              className="btn btn-sm btn-secondary"
              onClick={handleGenerateDocs}
              disabled={isAnalysisLoading || isDocLoading || !isRepoLoaded}
              title={TitleGenerateDocs}
            >
              {isDocLoading ? (
                <Loader2 size={ICON_SIZE_SM} className="animate-spin" />
              ) : (
                <BookText size={ICON_SIZE_SM} />
              )}
              {isDocLoading ? LabelGenerating : LabelGenerateDocs}
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
              {isAnalysisLoading ? LabelAnalyzing : LabelRunAnalysis}
            </button>
          </div>
        </div>
      </div>
      {isDocLoading && (
        <div className="thinking-progress">
          <p key={docProgressMessage} className="thinking-text">
            {docProgressMessage || LabelInitializingDocEngine}
          </p>
        </div>
      )}
      {generatedDoc && !isDocLoading && !docError && (
        <div className="analysis-results">
            <div className="tabs">
                <div className="tabs-nav">
                  <button className="tab-btn active">{LabelGeneratedDocumentation}</button>
                </div>
                 <button className="panel-action-btn" onClick={() => dispatch({ type: 'CLEAR_DOC' })} title={TitleClearDocumentation}>
                    <X size={ICON_SIZE_SM} /> {LabelClear}
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
                {analysisProgressMessage || LabelInitializingAnalysisEngine}
              </p>
            </div>
          )}
          {!isAnalysisLoading && !analysisResults && !error && (
            <div className="placeholder placeholder-top">
              {isRepoLoaded ? (
                <>
                  <TestTubeDiagonal size={ICON_SIZE_XL} strokeWidth={1} />
                  <p style={{ maxWidth: '80%' }}>{LabelAnalysisResultsPlaceholder}</p>
                  <p style={{ fontSize: UI_FONT_SIZE_MD, color: 'var(--muted-foreground)', maxWidth: '80%' }}>
                    {LabelAnalysisHelpText}
                  </p>
                </>
              ) : (
                <p>{LabelLoadRepoToEnable}</p>
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
