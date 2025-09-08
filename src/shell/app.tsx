/**
 * @file src/shell/app.tsx
 * @version 0.1.0
 * @description The main application shell component, responsible for layout, state management, and orchestrating domain features.
 *
 * @module Core.Shell
 *
 * @summary This is the central component of the application. It uses a `useReducer` hook for global state management (repo info, file tree, UI state). It orchestrates the main layout using CSS Grid, integrates all the panels and components, and provides the top-level logic for loading repositories and handling resizing.
 *
 * @dependencies
 * - react
 * - ../domains/repository-analysis/domain
 * - ../domains/repository-analysis/infrastructure/github-service
 * - ../domains/repository-analysis/ui/repo-loader
 * - ../domains/repository-analysis/ui/file-tree
 * - ../domains/repository-analysis/ui/file-viewer
 * - ../domains/repository-analysis/ui/analysis-panel
 * - ../domains/repository-analysis/application/repository-context
 * - ../domains/accounts/application/auth-context
 * - ../domains/accounts/ui/github-callback-handler
 * - ../../shared/ui/panel
 * - ../../shared/ui/page-header
 * - ../../shared/ui/footer
 * - ../../shared/ui/error-boundary
 * - ../../shared/ui/splitter
 * - ../../shared/config
 * - lucide-react
 *
 * @outputs
 * - Exports the main `App` React component.
 *
 * @changelog
 * - v0.1.0 (2025-09-08): File created and documented.
 */
// FIX: Import CSSProperties to correctly type the style object.
import React, { FC, useReducer, useEffect, useMemo, useCallback, useRef, useState, CSSProperties } from "react";
import { GitHubFile, RepoInfo } from "../domains/repository-analysis/domain";
import { fetchRepoTree, parseGitHubUrl } from "../domains/repository-analysis/infrastructure/github-service";
import { ApiError } from "../../shared/errors/api-error";
import { RepoLoader } from "../domains/repository-analysis/ui/repo-loader";
import { FileTree } from "../domains/repository-analysis/ui/file-tree";
import { FileViewer } from "../domains/repository-analysis/ui/file-viewer";
import { AnalysisPanel } from "../domains/repository-analysis/ui/analysis-panel";
import { RepositoryProvider } from '../domains/repository-analysis/application/repository-context';
import { Panel } from "../../shared/ui/panel";
import { FolderKanban, X } from 'lucide-react';
import { PageHeader } from '../../shared/ui/page-header';
import { Footer } from '../../shared/ui/footer';
import { ErrorBoundary } from "../../shared/ui/error-boundary";
import { Splitter } from "../../shared/ui/splitter";
import { AuthProvider } from '../domains/accounts/application/auth-context';
import { GitHubCallbackHandler } from '../domains/accounts/ui/github-callback-handler';
import { SESSION_STORAGE_KEY, DEFAULT_PANEL_FLEX, MIN_PANEL_WIDTH_PX, AUTH_CALLBACK_PATH, UI_ERROR_TOAST_TIMEOUT_MS } from '../../shared/config';
import { SettingsPanel } from '../domains/settings/ui/settings-panel';
import { useMediaQuery } from "../shared/hooks/use-media-query";

type AppState = {
  repoUrl: string;
  repoInfo: RepoInfo | null;
  fileTree: GitHubFile[];
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  localStorageError: string | null;
  transientError: string | null;
  panelWidths: number[];
};

type AppAction =
  | { type: 'SET_REPO_URL'; payload: string }
  | { type: 'LOAD_REPO_START' }
  | { type: 'LOAD_REPO_SUCCESS'; payload: { repoInfo: RepoInfo, tree: GitHubFile[] } }
  | { type: 'LOAD_REPO_ERROR'; payload: string }
  | { type: 'RESET_STATE' }
  | { type: 'CLEAR_LOCAL_STORAGE_ERROR' }
  | { type: 'SET_TRANSIENT_ERROR'; payload: string | null }
  | { type: 'SET_PANEL_WIDTHS'; payload: number[] }
  | { type: 'RESET_PANEL_WIDTHS' };

const initialState: AppState = {
  repoUrl: '',
  repoInfo: null,
  fileTree: [],
  isLoading: false,
  loadingMessage: '',
  error: null,
  localStorageError: null,
  transientError: null,
  panelWidths: DEFAULT_PANEL_FLEX,
};

const getInitialState = (): AppState => {
  try {
    const item = localStorage.getItem(SESSION_STORAGE_KEY);
    if (item) {
      const parsed = JSON.parse(item);
      const panelWidths = Array.isArray(parsed.panelWidths) && parsed.panelWidths.every(Number.isFinite)
        ? parsed.panelWidths
        : initialState.panelWidths;

      return {
        ...initialState,
        repoUrl: parsed.repoUrl || '',
        repoInfo: parsed.repoInfo || null,
        fileTree: parsed.fileTree || [],
        panelWidths,
      };
    }
  } catch (error) {
    return {
      ...initialState,
      localStorageError: "Could not restore your previous session. The saved data was corrupted. Starting fresh.",
    };
  }
  return initialState;
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_REPO_URL':
      return { ...state, repoUrl: action.payload };
    case 'LOAD_REPO_START':
      return { ...initialState, repoUrl: state.repoUrl, isLoading: true };
    case 'LOAD_REPO_SUCCESS':
      return { ...state, isLoading: false, repoInfo: action.payload.repoInfo, fileTree: action.payload.tree, error: null };
    case 'LOAD_REPO_ERROR':
      return { ...state, isLoading: false, error: action.payload, repoInfo: null, fileTree: [] };
    case 'RESET_STATE':
        const cleanState = { ...initialState, panelWidths: state.panelWidths };
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return cleanState;
    case 'CLEAR_LOCAL_STORAGE_ERROR':
        return { ...state, localStorageError: null };
    case 'SET_TRANSIENT_ERROR':
        return { ...state, transientError: action.payload };
    case 'SET_PANEL_WIDTHS':
        return { ...state, panelWidths: action.payload };
    case 'RESET_PANEL_WIDTHS':
        return { ...state, panelWidths: initialState.panelWidths };
    default:
      return state;
  }
};

export const App: FC = () => {
    if (window.location.pathname === AUTH_CALLBACK_PATH) {
        return <GitHubCallbackHandler />;
    }

    const [state, dispatch] = useReducer(appReducer, undefined, getInitialState);
    const [rightPanelView, setRightPanelView] = useState<'viewer' | 'settings'>('viewer');
    const { repoInfo, fileTree, repoUrl, isLoading, error, localStorageError, transientError, panelWidths } = state;
    const mainGridRef = useRef<HTMLDivElement>(null);
    const animationFrameId = useRef<number | null>(null);
    const isRepoLoaded = !!repoInfo;
    const isMobile = useMediaQuery('(max-width: 1024px)');

    useEffect(() => {
        try {
            if (repoInfo || repoUrl) {
                const dataToStore = {
                    repoUrl: state.repoUrl,
                    repoInfo: state.repoInfo,
                    fileTree: state.fileTree,
                    panelWidths: state.panelWidths,
                };
                localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(dataToStore));
            }
        } catch (e) {
            dispatch({ type: 'SET_TRANSIENT_ERROR', payload: 'Failed to save session to local storage.' });
        }
    }, [state.repoUrl, state.repoInfo, state.fileTree, state.panelWidths]);

    useEffect(() => {
        if (transientError) {
            const timerId = setTimeout(() => {
                dispatch({ type: 'SET_TRANSIENT_ERROR', payload: null });
            }, UI_ERROR_TOAST_TIMEOUT_MS);
    
            return () => clearTimeout(timerId);
        }
    }, [transientError]);

    const handleLoadRepo = useCallback(async () => {
        const parsedInfo = parseGitHubUrl(repoUrl);
        if (!parsedInfo) {
            dispatch({ type: 'LOAD_REPO_ERROR', payload: 'Invalid GitHub URL format.' });
            return;
        }
        dispatch({ type: 'LOAD_REPO_START' });
        try {
            const tree = await fetchRepoTree(parsedInfo.owner, parsedInfo.repo);
            dispatch({ type: 'LOAD_REPO_SUCCESS', payload: { repoInfo: parsedInfo, tree } });
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'An unknown error occurred.';
            dispatch({ type: 'LOAD_REPO_ERROR', payload: message });
        }
    }, [repoUrl]);
    
    const handleReset = useCallback(() => {
        dispatch({ type: 'RESET_STATE' });
    }, []);

    const handleResize = useCallback((splitterIndex: number) => (deltaX: number) => {
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
    
        animationFrameId.current = requestAnimationFrame(() => {
            if (!mainGridRef.current) return;
            
            const grid = mainGridRef.current;
            const totalWidth = grid.clientWidth;
            const newWidths = [...panelWidths];
            const totalFlex = newWidths.reduce((sum, val) => sum + val, 0);
            let pixelWidths = newWidths.map(w => (w / totalFlex) * totalWidth);
            const minPixelWidth = MIN_PANEL_WIDTH_PX; 
    
            pixelWidths[splitterIndex] += deltaX;
            pixelWidths[splitterIndex + 1] -= deltaX;
    
            // Clamp to min width
            if (pixelWidths[splitterIndex] < minPixelWidth) {
                const adjustment = minPixelWidth - pixelWidths[splitterIndex];
                pixelWidths[splitterIndex] = minPixelWidth;
                pixelWidths[splitterIndex + 1] -= adjustment;
            }
            if (pixelWidths[splitterIndex + 1] < minPixelWidth) {
                const adjustment = minPixelWidth - pixelWidths[splitterIndex + 1];
                pixelWidths[splitterIndex + 1] = minPixelWidth;
                pixelWidths[splitterIndex] -= adjustment;
            }
    
            const newTotalWidth = pixelWidths.reduce((sum, val) => sum + val, 0);
            const newFlexWidths = pixelWidths.map(w => (w / newTotalWidth) * totalFlex);
    
            dispatch({ type: 'SET_PANEL_WIDTHS', payload: newFlexWidths });
            animationFrameId.current = null;
        });
    }, [panelWidths]);

    const handleResetLayout = useCallback(() => {
        dispatch({ type: 'RESET_PANEL_WIDTHS' });
    }, []);
    
    const handleRepositoryError = useCallback((msg: string) => {
        dispatch({ type: 'SET_TRANSIENT_ERROR', payload: msg });
    }, []);

    const handleClearError = useCallback(() => {
      if (localStorageError) dispatch({ type: 'CLEAR_LOCAL_STORAGE_ERROR' });
      if (transientError) dispatch({ type: 'SET_TRANSIENT_ERROR', payload: null });
      if (error) dispatch({ type: 'RESET_STATE' });
    }, [localStorageError, transientError, error]);

    const handleToggleSettings = useCallback(() => {
        setRightPanelView(prev => prev === 'viewer' ? 'settings' : 'viewer');
    }, []);

    const handleOpenSettings = useCallback(() => {
        setRightPanelView('settings');
    }, []);
    
    const handleCloseSettings = useCallback(() => {
        setRightPanelView('viewer');
    }, []);

    // FIX: Add CSSProperties as the return type for useMemo to fix the TypeScript error.
    const panelGridStyle = useMemo((): CSSProperties => {
        if (isMobile) {
            return { 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px', 
                height: '100%',
            };
        }
        return {
            display: 'grid',
            gridTemplateColumns: panelWidths.map(w => `${w}fr`).join(' 6px '),
            height: '100%',
        };
    }, [isMobile, panelWidths]);

    const displayError = localStorageError || transientError || error;

    return (
      <AuthProvider>
        <div className="main-app">
          <PageHeader onToggleSettings={handleToggleSettings}>
            <RepoLoader
              repoUrl={repoUrl}
              setRepoUrl={(url) => dispatch({ type: 'SET_REPO_URL', payload: url })}
              onLoad={handleLoadRepo}
              onReset={handleReset}
              isRepoLoading={isLoading}
              isRepoLoaded={isRepoLoaded}
            />
          </PageHeader>
          <RepositoryProvider 
            repoInfo={repoInfo} 
            fileTree={fileTree} 
            onError={handleRepositoryError}
            openSettingsPanel={handleOpenSettings}
          >
            <div 
                className="app-content-grid" 
                ref={mainGridRef} 
                style={panelGridStyle}
            >
                <ErrorBoundary name="File Tree Panel">
                    <Panel 
                        className="file-tree-panel"
                        title={isRepoLoaded ? <><FolderKanban size={14} />{repoInfo.repo}</> : "Repository"}
                    >
                        {isRepoLoaded ? <FileTree /> : <div className="placeholder"><p>Load a repository to see the file tree.</p></div>}
                    </Panel>
                </ErrorBoundary>
                {!isMobile && <Splitter onResize={handleResize(0)} />}
                <ErrorBoundary name="Analysis Panel">
                    <AnalysisPanel />
                </ErrorBoundary>
                {!isMobile && <Splitter onResize={handleResize(1)} />}
                <ErrorBoundary name="Right Panel">
                    {rightPanelView === 'viewer' ? (
                        <FileViewer onError={handleRepositoryError} />
                    ) : (
                        <SettingsPanel onClose={handleCloseSettings} />
                    )}
                </ErrorBoundary>
            </div>
          </RepositoryProvider>
          <Footer 
            onResetLayout={handleResetLayout}
            errorMessage={displayError}
            onClearError={handleClearError}
          />
        </div>
      </AuthProvider>
    );
};