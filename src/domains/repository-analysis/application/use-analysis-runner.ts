import { useCallback } from 'react';
import { useRepository } from './repository-context';
import { runCodeAnalysis, generateDocumentation } from '../infrastructure/gemini-service';
import { ApiKeyError } from '../../../../shared/errors/api-key-error';
import { ErrorUnknownDocGen } from '../../../../shared/config';

export const useApiClient = () => {
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

  const generateDocumentation = useCallback(async (): Promise<void> => {
    if (!repoInfo) {
        const errorMessage = "A repository must be loaded before generating documentation.";
        dispatch({ type: 'RUN_DOC_GEN_ERROR', payload: errorMessage });
        if (onError) onError(errorMessage);
        return;
    }
    dispatch({ type: 'RUN_DOC_GEN_START' });
    try {
        const doc = await generateDocumentation({
            repoName: repoInfo.repo,
            fileTree,
            config: analysisConfig,
            selectedFile,
            onProgress: (msg) => dispatch({ type: 'SET_DOC_GEN_PROGRESS', payload: msg })
        });
        dispatch({ type: 'RUN_DOC_GEN_SUCCESS', payload: doc });
    } catch (err) {
        if (err instanceof ApiKeyError && openSettingsPanel) {
            openSettingsPanel();
        }
        const message = err instanceof Error ? err.message : ErrorUnknownDocGen;
        dispatch({ type: 'RUN_DOC_GEN_ERROR', payload: message });
        if (onError) onError(message);
    }
  }, [repoInfo, fileTree, analysisConfig, selectedFile, dispatch, openSettingsPanel, onError]);

  return { runAnalysis, generateDocumentation };
};
