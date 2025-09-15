import { useCallback } from 'react';
import { useRepository } from './repository-context';
// FIX: Alias the imported function to prevent a naming conflict and recursive call.
import { runCodeAnalysis, generateDocumentation as generateDocumentationApi } from '../infrastructure/gemini-service';
import { ApiKeyError } from '../../../../shared/errors/api-key-error';
import { ErrorUnknownDocGen, ErrorRepositoryNotLoaded, ErrorUnknownAnalysis, ErrorDocGenRepositoryNotLoaded } from '../../../../shared/config';

export const useApiClient = () => {
  const { state, dispatch, openSettingsPanel, onError } = useRepository();
  const { repoInfo, fileTree, analysisConfig, selectedFile } = state;

  const runAnalysis = useCallback(async (): Promise<void> => {
    if (!repoInfo) {
      const errorMessage = ErrorRepositoryNotLoaded;
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
      const message = err instanceof Error ? err.message : ErrorUnknownAnalysis;
      dispatch({ type: 'RUN_ANALYSIS_ERROR', payload: message });
      if (onError) onError(message);
    }
  }, [repoInfo, fileTree, analysisConfig, selectedFile, dispatch, openSettingsPanel, onError]);

  const generateDocumentation = useCallback(async (): Promise<void> => {
    if (!repoInfo) {
        const errorMessage = ErrorDocGenRepositoryNotLoaded;
        dispatch({ type: 'RUN_DOC_GEN_ERROR', payload: errorMessage });
        if (onError) onError(errorMessage);
        return;
    }
    dispatch({ type: 'RUN_DOC_GEN_START' });
    try {
        const doc = await generateDocumentationApi({
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
