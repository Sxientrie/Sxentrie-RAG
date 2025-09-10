import { useCallback } from 'react';
import { useRepository } from './repository-context';
import { runCodeAnalysis } from '../infrastructure/gemini-service';
import { ApiKeyError } from '../../../../shared/errors/api-key-error';
export const useAnalysisRunner = () => {
  const { state, dispatch, openSettingsPanel, onError } = useRepository();
  const { repoInfo, fileTree, analysisConfig, selectedFile } = state;
  const runAnalysis = useCallback(async (): Promise<void> => {
    if (!repoInfo) {
      const errorMessage = "A repository must be loaded before running analysis.";
      dispatch({ type: 'RUN_ANALYSIS_ERROR', payload: errorMessage });
      if (onError) onError(errorMessage);
      return;
    }
    dispatch({ type: 'RUN_ANALYSIS_START' });
    try {
      const results = await runCodeAnalysis({
        repoName: repoInfo.repo,
        fileTree,
        config: analysisConfig,
        selectedFile,
        onProgress: (msg) => dispatch({ type: 'SET_ANALYSIS_PROGRESS', payload: msg })
      });
      dispatch({ type: 'RUN_ANALYSIS_SUCCESS', payload: results });
    } catch (err) {
      if (err instanceof ApiKeyError && openSettingsPanel) {
        openSettingsPanel();
      }
      const message = err instanceof Error ? err.message : "An unknown error occurred during analysis.";
      dispatch({ type: 'RUN_ANALYSIS_ERROR', payload: message });
      if (onError) onError(message);
    }
  }, [repoInfo, fileTree, analysisConfig, selectedFile, dispatch, openSettingsPanel, onError]);
  return { runAnalysis };
};
