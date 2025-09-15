import React, { FC, useState, useEffect, useCallback } from 'react';
import { Panel } from '../../../../shared/ui/panel';
import { AnalysisConfig, ANALYSIS_SCOPES, ANALYSIS_MODES, GEMINI_MODELS } from '../domain';
import { FlaskConical, ChevronUp, ChevronDown, Loader2, BookText, FolderGit2, FileCode, Zap, Search } from 'lucide-react';
import { useRepository } from '../application/repository-context';
import {
    ICON_SIZE_SM, UI_GAP_SM,
    PlaceholderCustomInstructions, TitleEnableOnFileSelection, LabelEntireRepo,
    LabelSelectedFile, LabelFastScan,
    LabelDeepScan, TitleGenerateDocs, LabelGenerating, LabelGenerateDocs, LabelAnalyzing,
    LabelRunAnalysis, LabelInitializingDocEngine, LabelInitializingAnalysisEngine, LabelLoadRepoToEnable,
    TitleShowConfig, TitleHideConfig
} from '../../../../shared/config';
import { useApiClient } from '../application/use-analysis-runner';
import { getFilesForAnalysis } from '../application/file-tree-utils';

export const AnalysisPanel: FC = () => {
  const {
    state: { selectedFile, repoInfo, fileTree, analysisConfig, isAnalysisLoading, analysisProgressMessage, isDocLoading, docProgressMessage },
    dispatch,
  } = useRepository();
  const { runAnalysis, generateDocumentation } = useApiClient();
  const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);
  const isRepoLoaded = !!repoInfo;

  useEffect(() => {
    if (!isRepoLoaded) {
      dispatch({ type: 'SET_ANALYSIS_PREVIEW_PATHS', payload: new Set() });
      return;
    }
    const filesToAnalyze = getFilesForAnalysis({
      fileTree,
      config: analysisConfig,
      selectedFile,
    });
    const paths = new Set(filesToAnalyze.map(f => f.path));
    dispatch({ type: 'SET_ANALYSIS_PREVIEW_PATHS', payload: paths });
  }, [analysisConfig, fileTree, selectedFile, isRepoLoaded, dispatch]);

  const setConfig = useCallback((cfg: Partial<AnalysisConfig>) => dispatch({ type: 'SET_ANALYSIS_CONFIG', payload: cfg }), [dispatch]);

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
              <FolderGit2 size={ICON_SIZE_SM} />
              <span className="radio-label-title">{LabelEntireRepo}</span>
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
              <FileCode size={ICON_SIZE_SM} />
              <span className="radio-label-title">{LabelSelectedFile}</span>
            </label>
          </div>
          {analysisConfig.scope === ANALYSIS_SCOPES.ALL && (
            <div className="custom-scope-patterns">
              <textarea
                className="input"
                placeholder="Include patterns (e.g., src/**/*.js, *.md)"
                value={analysisConfig.includePatterns}
                onChange={(e) => setConfig({ includePatterns: e.target.value })}
                disabled={isAnalysisLoading || isDocLoading}
                rows={2}
              />
              <textarea
                className="input"
                placeholder="Exclude patterns (e.g., **/*.test.ts, dist/*)"
                value={analysisConfig.excludePatterns}
                onChange={(e) => setConfig({ excludePatterns: e.target.value })}
                disabled={isAnalysisLoading || isDocLoading}
                rows={2}
              />
            </div>
          )}
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
              <Zap size={ICON_SIZE_SM} />
              <span className="radio-label-title">{LabelFastScan}</span>
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
              <Search size={ICON_SIZE_SM} />
              <span className="radio-label-title">{LabelDeepScan}</span>
            </label>
          </div>
          <div className="analysis-actions" style={{ justifyContent: 'flex-end', gap: UI_GAP_SM }}>
            <button
              className="btn btn-sm btn-secondary"
              onClick={generateDocumentation}
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
