import React, { FC, useReducer, useEffect, useMemo, useCallback, useRef, useState } from "react";
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

const LOCAL_STORAGE_KEY = 'sxentrie-session';

type AppState = {
  repoUrl: string;
  repoInfo: RepoInfo | null;
  fileTree: GitHubFile[];
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  isTreeCollapsed: boolean;
  localStorageError: string | null;
  transientError: string | null;
  panelWidths: number[];
};

type AppAction =
  | { type: 'SET_REPO_URL'; payload: string }
  | { type: 'LOAD_REPO_START' }
  | { type: 'LOAD_REPO_SUCCESS'; payload: { repoInfo: RepoInfo, tree: GitHubFile[] } }
  | { type: 'LOAD_REPO_ERROR'; payload: string }
  | { type: 'TOGGLE_TREE_COLLAPSE' }
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
  isTreeCollapsed: false,
  localStorageError: null,
  transientError: null,
  panelWidths: [1, 2, 1],
};

const getInitialState = (): AppState => {
  try {
    const item = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (item) {
      const parsed = JSON.parse(item);
      return {
        ...initialState,
        repoUrl: parsed.repoUrl || '',
        repoInfo: parsed.repoInfo || null,
        fileTree: parsed.fileTree || [],
        panelWidths: parsed.panelWidths || initialState.panelWidths,
      };
    }
  } catch (error) {
    return { ...initialState, localStorageError: 'Your saved session was corrupted and has been reset.' };
  }
  return initialState;
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_REPO_URL':
      return { ...state, repoUrl: action.payload };
    case 'LOAD_REPO_START':
      return { ...state, isLoading: true, loadingMessage: 'Parsing URL...', error: null, fileTree: [], repoInfo: null };
    case 'LOAD_REPO_SUCCESS':
      return { ...state, isLoading: false, loadingMessage: '', repoInfo: action.payload.repoInfo, fileTree: action.payload.tree };
    case 'LOAD_REPO_ERROR':
      return { ...state, isLoading: false, loadingMessage: '', error: action.payload };
    case 'TOGGLE_TREE_COLLAPSE':
      return { ...state, isTreeCollapsed: !state.isTreeCollapsed };
    case 'RESET_STATE':
      return { ...initialState };
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

const MainLayout: FC = () => {
  const [state, dispatch] = useReducer(appReducer, undefined, getInitialState);
  const {
    repoUrl, repoInfo, fileTree, isLoading, loadingMessage, error,
    isTreeCollapsed, localStorageError, transientError, panelWidths
  } = state;

  useEffect(() => {
    try {
      // On state reset, clear the localStorage item
      if (repoUrl === '' && repoInfo === null && fileTree.length === 0) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } else { // Otherwise, save the relevant state
        const stateToSave = {
          repoUrl,
          repoInfo,
          fileTree,
          panelWidths,
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
      }
    } catch (e) {
      // Unable to save state, but don't crash the app.
    }
  }, [repoUrl, repoInfo, fileTree, panelWidths]);


  const mainAppRef = useRef<HTMLDivElement>(null);

  const isRepoLoaded = useMemo(() => !!repoInfo && fileTree.length > 0, [repoInfo, fileTree]);

  const handleLoadRepo = async (): Promise<void> => {
    dispatch({ type: 'LOAD_REPO_START' });
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      dispatch({ type: 'LOAD_REPO_ERROR', payload: "Invalid GitHub URL." });
      return;
    }
    try {
      dispatch({ type: 'SET_REPO_URL', payload: repoUrl });
      const tree = await fetchRepoTree(parsed.owner, parsed.repo);
      dispatch({ type: 'LOAD_REPO_SUCCESS', payload: { repoInfo: parsed, tree } });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Error fetching repository.";
      dispatch({ type: 'LOAD_REPO_ERROR', payload: message });
    }
  };

  const handleError = useCallback((message: string) => {
    dispatch({ type: 'SET_TRANSIENT_ERROR', payload: message });
    setTimeout(() => dispatch({ type: 'SET_TRANSIENT_ERROR', payload: null }), 5000);
  }, []);

  const handleResize = useCallback((splitterIndex: number, deltaX: number) => {
    if (!mainAppRef.current) return;
    if (isTreeCollapsed && splitterIndex === 0) return;

    const { width } = mainAppRef.current.getBoundingClientRect();
    const splitterWidth = 8;
    const totalSplitterWidth = 2 * splitterWidth;
    const containerPadding = 16;
    const availableWidth = width - totalSplitterWidth - containerPadding;

    const totalFr = panelWidths.reduce((a, b) => a + b, 0);
    const deltaFr = (deltaX / availableWidth) * totalFr;

    const newWidths = [...panelWidths];
    newWidths[splitterIndex] += deltaFr;
    newWidths[splitterIndex + 1] -= deltaFr;

    const minFr = 0.5;
    if (newWidths.some(w => w < minFr)) {
      return;
    }

    dispatch({ type: 'SET_PANEL_WIDTHS', payload: newWidths });
  }, [panelWidths, isTreeCollapsed]);
  
  const handleResetLayout = useCallback(() => {
    dispatch({ type: 'RESET_PANEL_WIDTHS' });
  }, []);

  const gridTemplateColumns = useMemo(() => {
    const splitterWidth = 8;
    if (isTreeCollapsed) {
      const totalFr = panelWidths[1] + panelWidths[2];
      return `40px ${splitterWidth}px ${panelWidths[1] / totalFr}fr ${splitterWidth}px ${panelWidths[2] / totalFr}fr`;
    }
    return `${panelWidths[0]}fr ${splitterWidth}px ${panelWidths[1]}fr ${splitterWidth}px ${panelWidths[2]}fr`;
  }, [isTreeCollapsed, panelWidths]);

  return (
    <div className="main-app" ref={mainAppRef} style={{ gridTemplateColumns }}>
      {localStorageError && (
        <div className="error-banner" role="alert">
          <span>{localStorageError}</span>
          <button
            className="error-banner-close-btn"
            onClick={() => dispatch({ type: 'CLEAR_LOCAL_STORAGE_ERROR' })}
            aria-label="Dismiss error message"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {transientError && (
        <div className="error-banner" role="alert">
          <span>{transientError}</span>
          <button
            className="error-banner-close-btn"
            onClick={() => dispatch({ type: 'SET_TRANSIENT_ERROR', payload: null })}
            aria-label="Dismiss error message"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <PageHeader>
        <RepoLoader
          repoUrl={repoUrl}
          setRepoUrl={(url) => dispatch({ type: 'SET_REPO_URL', payload: url })}
          onLoad={handleLoadRepo}
          onReset={() => dispatch({ type: 'RESET_STATE' })}
          isRepoLoading={isLoading}
          isRepoLoaded={isRepoLoaded}
        />
      </PageHeader>
      <RepositoryProvider repoInfo={repoInfo} fileTree={fileTree} onError={handleError}>
        <Panel
          className="file-tree-panel"
          title={<><FolderKanban size={14} /> {repoInfo ? `${repoInfo.repo}` : 'Repository'}</>}
          isCollapsed={isTreeCollapsed}
          onToggleCollapse={() => dispatch({ type: 'TOGGLE_TREE_COLLAPSE' })}
          collapseDirection="left"
        >
          {isRepoLoaded ? (
            <ErrorBoundary name="File Tree"><FileTree /></ErrorBoundary>
          ) : (
            <>
              {isLoading && (<div className="placeholder"><div className="loading-spinner"></div>{loadingMessage}</div>)}
              {error && <div className="error-message">{error}</div>}
              {!isLoading && !error && (<div className="placeholder">Load a repository to see its file structure here.</div>)}
            </>
          )}
        </Panel>
        <Splitter onResize={(delta) => handleResize(0, delta)} />
        <ErrorBoundary name="Analysis Panel"><AnalysisPanel /></ErrorBoundary>
        <Splitter onResize={(delta) => handleResize(1, delta)} />
        <ErrorBoundary name="File Viewer"><FileViewer onError={handleError} /></ErrorBoundary>
      </RepositoryProvider>
      <Footer onResetLayout={handleResetLayout} />
    </div>
  );
};

const Router: FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const onLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', onLocationChange);
    return () => window.removeEventListener('popstate', onLocationChange);
  }, []);

  if (currentPath === '/auth/callback') {
    return <GitHubCallbackHandler />;
  }

  return <>{children}</>;
};

export const App: FC = () => {
  return (
    <AuthProvider>
      <Router>
        <MainLayout />
      </Router>
    </AuthProvider>
  );
};