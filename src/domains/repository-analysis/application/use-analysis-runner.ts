import { useCallback } from 'react';
import { useRepository } from './repository-context';
import { runCodeAnalysis } from '../infrastructure/gemini-service';

export const useAnalysisRunner = () => {
  const { state, dispatch } = useRepository();
  const { repoInfo, fileTree, analysisConfig, selectedFile } = state;

  const runAnalysis = useCallback(async (): Promise<void> => {
    if (!repoInfo) {
      dispatch({ type: 'RUN_ANALYSIS_ERROR', payload: "A repository must be loaded before running analysis." });
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
      const message = err instanceof Error ? err.message : "An unknown error occurred during analysis.";
      dispatch({ type: 'RUN_ANALYSIS_ERROR', payload: message });
    }
  }, [repoInfo, fileTree, analysisConfig, selectedFile, dispatch]);

  return { runAnalysis };
};
