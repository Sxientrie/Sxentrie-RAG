/**
 * @file src/domains/repository-analysis/application/use-analysis-runner.ts
 * @version 0.2.0
 * @description A custom hook to encapsulate the logic for initiating and managing a code analysis run.
 *
 * @module RepositoryAnalysis.Application
 *
 * @summary This custom hook connects the UI (specifically `AnalysisPanel`) to the `gemini-service`. It retrieves the necessary state from the `RepositoryContext`, calls the `runCodeAnalysis` function, and dispatches actions to the context to update the UI with progress, results, or errors.
 *
 * @dependencies
 * - react
 * - ./repository-context
 * - ../infrastructure/gemini-service
 *
 * @outputs
 * - Exports the `useAnalysisRunner` hook.
 *
 * @changelog
 * - v0.2.0 (2025-09-15): Modified to lift errors up to the main app shell via the `onError` callback for centralized display.
 * - v0.1.0 (2025-09-08): File created and documented.
 */
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
      if (onError) onError(message); // Lift the error up to the app shell
    }
  }, [repoInfo, fileTree, analysisConfig, selectedFile, dispatch, openSettingsPanel, onError]);

  return { runAnalysis };
};