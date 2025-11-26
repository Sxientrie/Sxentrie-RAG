import React, { FC, useState, useEffect, useCallback } from 'react';
import { Panel } from '../../../../shared/ui/panel';
import { AnalysisConfig, ANALYSIS_SCOPES, ANALYSIS_MODES, GEMINI_MODELS } from '../domain';
import { FlaskConical, ChevronUp, ChevronDown, Loader2, FolderGit2, FileCode, Zap, Search, Beaker } from 'lucide-react';
import { useRepository } from '../application/repository-context';
import {
  ICON_SIZE_SM,
  PlaceholderCustomInstructions, TitleEnableOnFileSelection, LabelEntireRepo,
  LabelSelectedFile, LabelFastScan,
  LabelDeepScan, LabelAnalyzing,
  LabelRunAnalysis, LabelInitializingAnalysisEngine, LabelLoadRepoToEnable,
  TitleShowConfig, TitleHideConfig
} from '../../../../shared/config';
import { useApiClient } from '../application/use-analysis-runner';
import { getFilesForAnalysis } from '../application/file-tree-utils';

export const AnalysisPanel: FC = () => {
  const {
    state: { selectedFile, repoInfo, fileTree, analysisConfig, isAnalysisLoading, analysisProgressMessage },
    dispatch,
  } = useRepository();
  const { runAnalysis } = useApiClient();
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

  if (isAnalysisLoading) {
    return (
      <Panel
        className="analysis-panel"
        title={panelTitle}
        actions={panelActions}
      >
        <div className="thinking-progress">
          <p key={analysisProgressMessage} className="thinking-text">
            {analysisProgressMessage || LabelInitializingAnalysisEngine}
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
          <div className="config-section">
            <label className="config-label">Scope</label>
            <div className="radio-group toggle-radio-group">
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
                  disabled={isAnalysisLoading || isFileAnalysisDisabled}
                />
                <FileCode size={ICON_SIZE_SM} />
                <span className="radio-label-title">{LabelSelectedFile}</span>
              </label>
            </div>
          </div>

          <div className="config-section">
            <label className="config-label">Mode</label>
            <div className="radio-group toggle-radio-group">
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
                  disabled={isAnalysisLoading}
                />
                <Search size={ICON_SIZE_SM} />
                <span className="radio-label-title">{LabelDeepScan}</span>
              </label>
            </div>
          </div>

          {analysisConfig.scope === ANALYSIS_SCOPES.ALL && (
            <div className="config-section full-width">
              <label className="config-label">Filters</label>
              <div className="custom-scope-patterns">
                <textarea
                  className="input"
                  placeholder="Include patterns (e.g., src/**/*.js, *.md)"
                  value={analysisConfig.includePatterns}
                  onChange={(e) => setConfig({ includePatterns: e.target.value })}
                  disabled={isAnalysisLoading}
                  rows={1}
                />
                <textarea
                  className="input"
                  placeholder="Exclude patterns (e.g., **/*.test.ts, dist/*)"
                  value={analysisConfig.excludePatterns}
                  onChange={(e) => setConfig({ excludePatterns: e.target.value })}
                  disabled={isAnalysisLoading}
                  rows={1}
                />
              </div>
            </div>
          )}

          <div className="config-section full-width">
            <label className="config-label">Custom Instructions</label>
            <div className="custom-rules">
              <textarea
                className="input"
                placeholder={PlaceholderCustomInstructions}
                value={analysisConfig.customRules}
                onChange={(e) => setConfig({ customRules: e.target.value })}
                disabled={isAnalysisLoading}
                rows={2}
              />
            </div>
          </div>

          <div className="analysis-actions full-width">
            <button
              className={`btn btn-sm btn-primary ${isAnalysisLoading ? 'analyzing' : ''}`}
              onClick={runAnalysis}
              disabled={isAnalysisLoading || !isRepoLoaded}
            >
              {isAnalysisLoading ? (
                <>
                  <Loader2 className="spin-icon" size={ICON_SIZE_SM} />
                  <span>{LabelAnalyzing}</span>
                </>
              ) : (
                <>
                  <Beaker size={ICON_SIZE_SM} />
                  <span>{LabelRunAnalysis}</span>
                </>
              )}
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
