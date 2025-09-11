import { FC, useReducer, useEffect, useMemo, useCallback, useRef, useState, CSSProperties } from "react";
import { GitHubFile, RepoInfo } from "../domains/repository-analysis/domain";
import { fetchRepoTree, parseGitHubUrl } from "../domains/repository-analysis/infrastructure/github-service";
import { ApiError } from "../../shared/errors/api-error";
import { RepoLoader } from "../domains/repository-analysis/ui/repo-loader";
import { FileTree } from "../domains/repository-analysis/ui/file-tree";
import { FileViewer } from "../domains/repository-analysis/ui/file-viewer";
import { AnalysisPanel } from "../domains/repository-analysis/ui/analysis-panel";
import { RepositoryProvider } from '../domains/repository-analysis/application/repository-context';
import { Panel } from "../../shared/ui/panel";
import { FolderKanban } from 'lucide-react';
import { PageHeader } from '../../shared/ui/page-header';
import { Footer } from '../../shared/ui/footer';
import { ICON_SIZE_SM } from '../../shared/config';
import { ErrorBoundary } from "../../shared/ui/error-boundary";
import { Splitter } from "../../shared/ui/splitter";
import { AuthProvider } from '../domains/accounts/application/auth-context';
import { GitHubCallbackHandler } from '../domains/accounts/ui/github-callback-handler';
import {
    SESSION_STORAGE_KEY, DEFAULT_PANEL_FLEX, MIN_PANEL_WIDTH_PX, AUTH_CALLBACK_PATH, UI_ERROR_TOAST_TIMEOUT_MS,
    RightPanelViewer, RightPanelSettings, MediaQueryMobile, UiGapMobile, UiSplitterGap, DefaultRepoTitle,
    FileTreePlaceholder, ErrorBoundaryFileTree, ErrorBoundaryAnalysis, ErrorBoundaryRightPanel,
    ErrorCorruptedSession, ErrorLocalStorageSave, ErrorInvalidGitHubUrl, ErrorUnknown
} from '../../shared/config';
import { SettingsPanel } from '../domains/settings/ui/settings-panel';
import { useMediaQuery } from "../shared/hooks/use-media-query";
type AppState = {
  repoUrl: string;
  repoInfo: RepoInfo | null;
  fileTree: GitHubFile[];
  isLoading: boolean;
  error: string | null;
  localStorageError: string | null;
  transientError: string | null;
  panelWidths: number[];
  footerTooltip: string | null;
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
  | { type: 'RESET_PANEL_WIDTHS' }
  | { type: 'SET_FOOTER_TOOLTIP'; payload: string | null };
const initialState: AppState = {
  repoUrl: '',
  repoInfo: null,
  fileTree: [],
  isLoading: false,
  error: null,
  localStorageError: null,
  transientError: null,
  panelWidths: DEFAULT_PANEL_FLEX,
  footerTooltip: null,
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
      localStorageError: ErrorCorruptedSession,
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
    case 'SET_FOOTER_TOOLTIP':
        return { ...state, footerTooltip: action.payload };
    default:
      return state;
  }
};
export const App: FC = () => {
    if (window.location.pathname === AUTH_CALLBACK_PATH) {
        return <GitHubCallbackHandler />;
    }
    const [state, dispatch] = useReducer(appReducer, undefined, getInitialState);
    const [rightPanelView, setRightPanelView] = useState<string>(RightPanelViewer);
    const { repoInfo, fileTree, repoUrl, isLoading, error, localStorageError, transientError, panelWidths, footerTooltip } = state;
    const mainGridRef = useRef<HTMLDivElement>(null);
    const animationFrameId = useRef<number | null>(null);
    const isRepoLoaded = !!repoInfo;
    const isMobile = useMediaQuery(MediaQueryMobile);
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
            dispatch({ type: 'SET_TRANSIENT_ERROR', payload: ErrorLocalStorageSave });
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
            dispatch({ type: 'LOAD_REPO_ERROR', payload: ErrorInvalidGitHubUrl });
            return;
        }
        dispatch({ type: 'LOAD_REPO_START' });
        try {
            const tree = await fetchRepoTree(parsedInfo.owner, parsedInfo.repo);
            dispatch({ type: 'LOAD_REPO_SUCCESS', payload: { repoInfo: parsedInfo, tree } });
        } catch (err) {
            const message = err instanceof ApiError ? err.message : ErrorUnknown;
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
        setRightPanelView(prev => prev === RightPanelViewer ? RightPanelSettings : RightPanelViewer);
    }, []);
    const handleOpenSettings = useCallback(() => {
        setRightPanelView(RightPanelSettings);
    }, []);
    const handleCloseSettings = useCallback(() => {
        setRightPanelView(RightPanelViewer);
    }, []);
    const panelGridStyle = useMemo((): CSSProperties => {
        if (isMobile) {
            return {
                display: 'flex',
                flexDirection: 'column',
                gap: UiGapMobile,
                height: '100%',
            };
        }
        return {
            display: 'grid',
            gridTemplateColumns: panelWidths.map(w => `${w}fr`).join(` ${UiSplitterGap} `),
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
              dispatch={dispatch}
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
                <ErrorBoundary name={ErrorBoundaryFileTree}>
                    <Panel
                        className="file-tree-panel"
                        title={isRepoLoaded ? <><FolderKanban size={ICON_SIZE_SM} />{repoInfo.repo}</> : DefaultRepoTitle}
                    >
                        {isRepoLoaded ? <FileTree /> : <div className="placeholder"><p>{FileTreePlaceholder}</p></div>}
                    </Panel>
                </ErrorBoundary>
                {!isMobile && <Splitter onResize={handleResize(0)} />}
                <ErrorBoundary name={ErrorBoundaryAnalysis}>
                    <AnalysisPanel />
                </ErrorBoundary>
                {!isMobile && <Splitter onResize={handleResize(1)} />}
                <ErrorBoundary name={ErrorBoundaryRightPanel}>
                    {rightPanelView === RightPanelViewer ? (
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
            tooltipMessage={footerTooltip}
          />
        </div>
      </AuthProvider>
    );
};
