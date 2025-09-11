import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import { Panel } from '../../../../shared/ui/panel';
import { AnalysisConfig, ANALYSIS_SCOPES, ANALYSIS_MODES, GEMINI_MODELS } from '../domain';
import { FlaskConical, ChevronUp, ChevronDown, Loader2, BookText } from 'lucide-react';
import { useRepository } from '../application/repository-context';
import {
    ICON_SIZE_SM, UI_GAP_SM, MAX_GEMINI_FILE_COUNT,
    ErrorUnknownDocGen, PlaceholderCustomInstructions, TitleEnableOnFileSelection, LabelEntireRepo,
    LabelAnalyzesAllFiles, LabelSelectedFile, LabelFocusesOnActiveFile, LabelFastScan, LabelQuickOverview,
    LabelDeepScan, LabelSlowerAnalysis, TitleGenerateDocs, LabelGenerating, LabelGenerateDocs, LabelAnalyzing,
    LabelRunAnalysis, LabelInitializingDocEngine, LabelInitializingAnalysisEngine, LabelLoadRepoToEnable,
    TitleShowConfig, TitleHideConfig
} from '../../../../shared/config';
import { useAnalysisRunner } from '../application/use-analysis-runner';
import { generateDocumentation } from '../infrastructure/gemini-service';
import { collectAllFiles } from '../application/file-tree-utils';
import { ApiKeyError } from '../../../../shared/errors/api-key-error';

export const AnalysisPanel: FC = () => {
  const {
    state: { selectedFile, repoInfo, fileTree, analysisConfig, isAnalysisLoading, analysisProgressMessage, isDocLoading, docProgressMessage, totalAnalyzableFiles },
    dispatch,
    openSettingsPanel,
    onError,
  } = useRepository();
  const { runAnalysis } = useAnalysisRunner();
  const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);
  const isRepoLoaded = !!repoInfo;

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
    return `Analyzes up to ${Math.min(MAX_GEMINI_FILE_COUNT, totalAnalyzableFiles)} files.`;
  }, [totalAnalyzableFiles]);

  const deepScanPreviewText = useMemo(() => {
    return `Analyzes all ${totalAnalyzableFiles} files.`;
  }, [totalAnalyzableFiles]);

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
  const panelTitle = <><FlaskConical size={ICON_SIZE_SM} /> Analysis</>;
  const panelActions = (
      <button
        className="panel-toggle-btn"
        onClick={() => setIsConfigCollapsed(prev => !prev)}
        title={isConfigCollapsed ? TitleShowConfig : TitleHideConfig}
        aria-label={isConfigCollapsed ? TitleShowConfig : TitleHideConfig}
        aria-expanded={!isConfigCollapsed}
      >
        <ConfigCollapseIcon size={ICON_SIZE_SM} />
      </button>
  );

  if (isAnalysisLoading || isDocLoading) {
    return (
        <Panel
            className="analysis-panel"
            title={panelTitle}
            actions={panelActions}
        >
            <div className="thinking-progress">
                <p key={analysisProgressMessage || docProgressMessage} className="thinking-text">
                    {isAnalysisLoading ? (analysisProgressMessage || LabelInitializingAnalysisEngine) : (docProgressMessage || LabelInitializingDocEngine)}
                </p>
            </div>
        </Panel>
    );
  }

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
            <div className="radio-group toggle-radio-group">
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
            <div className="radio-group toggle-radio-group">
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
      {!isRepoLoaded && (
        <div className="placeholder placeholder-top">
            <p>{LabelLoadRepoToEnable}</p>
        </div>
      )}
    </Panel>
  );
};
