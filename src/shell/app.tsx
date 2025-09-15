import { FC, useReducer, useEffect, useCallback, useState } from "react";
import { GitHubFile, RepoInfo, ANALYSIS_SCOPES } from "../domains/repository-analysis/domain";
import { fetchRepoTree, parseGitHubUrl } from "../domains/repository-analysis/infrastructure/github-service";
import { ApiError } from "../../shared/errors/api-error";
import { RepoLoader } from "../domains/repository-analysis/ui/repo-loader";
import { FileTree } from "../domains/repository-analysis/ui/file-tree";
import { AnalysisPanel } from "../domains/repository-analysis/ui/analysis-panel";
import { RepositoryProvider, useRepository } from '../domains/repository-analysis/application/repository-context';
import { Panel } from "../../shared/ui/panel";
import { FolderKanban, Download, RotateCw } from 'lucide-react';
import { PageHeader } from '../../shared/ui/page-header';
import { Footer } from '../../shared/ui/footer';
import { ICON_SIZE_SM } from '../../shared/config';
import { ErrorBoundary } from "../../shared/ui/error-boundary";
import { AuthProvider } from '../domains/accounts/application/auth-context';
import { GitHubCallbackHandler } from '../domains/accounts/ui/github-callback-handler';
import {
    SESSION_STORAGE_KEY, AUTH_CALLBACK_PATH, UI_ERROR_TOAST_TIMEOUT_MS,
    RightPanelViewer, RightPanelSettings, DefaultRepoTitle, FileTreePlaceholder, ErrorBoundaryFileTree,
    ErrorBoundaryAnalysis, ErrorBoundaryRightPanel, ErrorCorruptedSession, ErrorLocalStorageSave,
    ErrorInvalidGitHubUrl, ErrorUnknown, MARKDOWN_FILE_EXTENSION, REPORT_FILE_MIMETYPE, ReportHeaderTemplate,
    ReportRepoUrlTemplate, ReportDateTemplate, ReportHorizontalRule, ReportConfigHeader, ReportScopeFileTemplate,
    ReportScopeRepo, ReportModeTemplate, ReportCustomDirectivesTemplate, ReportNoCustomDirectives,
    ReportOverviewHeader, ReportReviewHeader, ReportNoIssuesFound, ReportSummaryTableHeader,
    ReportSummaryTableRowTemplate, ReportDetailsHeader, ReportFindingHeaderTemplate, ReportDetailsTableHeader,
    ReportDetailsTableRowTemplate, ReportLineRangeTemplate, ReportNotApplicable, ReportQuoteTemplate,
    ReportCodeBlockTemplate, ReportFileNameTemplate, TitleShowDismissedFindingsTemplate, AriaLabelRestoreDismissed,
    TitleDownloadReport, AriaLabelDownloadReport, MediaQuerySm
} from '../../shared/config';
import { SettingsPanel } from '../domains/settings/ui/settings-panel';
import { useMediaQuery } from "../shared/hooks/use-media-query";
import { SettingsProvider } from "../domains/settings/application/settings-context";
import { MainContent } from "./main-content";

type AppState = {
  repoUrl: string;
  repoInfo: RepoInfo | null;
  fileTree: GitHubFile[];
  isLoading: boolean;
  error: string | null;
  localStorageError: string | null;
  transientError: string | null;
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
  | { type: 'SET_FOOTER_TOOLTIP'; payload: string | null };
const initialState: AppState = {
  repoUrl: '',
  repoInfo: null,
  fileTree: [],
  isLoading: false,
  error: null,
  localStorageError: null,
  transientError: null,
  footerTooltip: null,
};
const getInitialState = (): AppState => {
  try {
    const item = localStorage.getItem(SESSION_STORAGE_KEY);
    if (item) {
      const parsed = JSON.parse(item);
      return {
        ...initialState,
        repoUrl: parsed.repoUrl || '',
        repoInfo: parsed.repoInfo || null,
        fileTree: parsed.fileTree || [],
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
        const cleanState = { ...initialState };
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return cleanState;
    case 'CLEAR_LOCAL_STORAGE_ERROR':
        return { ...state, localStorageError: null };
    case 'SET_TRANSIENT_ERROR':
        return { ...state, transientError: action.payload };
    case 'SET_FOOTER_TOOLTIP':
        return { ...state, footerTooltip: action.payload };
    default:
      return state;
  }
};

const FileTreeDrawer = ({ repoInfo, isRepoLoaded, isDrawerOpen, onClose }: { repoInfo: RepoInfo | null; isRepoLoaded: boolean; isDrawerOpen: boolean; onClose: () => void; }) => (
    <div className={`drawer-container ${isDrawerOpen ? 'open' : ''}`}>
        <div className="drawer-overlay" onClick={onClose} />
        <div className="drawer-content">
            <ErrorBoundary name={ErrorBoundaryFileTree}>
                <Panel
                    className="file-tree-panel"
                    title={isRepoLoaded ? <><FolderKanban size={ICON_SIZE_SM} />{repoInfo!.repo}</> : DefaultRepoTitle}
                >
                    {isRepoLoaded ? <FileTree /> : <div className="placeholder"><p>{FileTreePlaceholder}</p></div>}
                </Panel>
            </ErrorBoundary>
        </div>
    </div>
);

export const App: FC = () => {
    if (window.location.pathname === AUTH_CALLBACK_PATH) {
        return <GitHubCallbackHandler />;
    }
    const [state, dispatch] = useReducer(appReducer, undefined, getInitialState);
    const [rightPanelView, setRightPanelView] = useState<string>(RightPanelViewer);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const { repoInfo, fileTree, repoUrl, isLoading, error, localStorageError, transientError, footerTooltip } = state;
    const isRepoLoaded = !!repoInfo;
    const isMobile = useMediaQuery(MediaQuerySm);
    
    useEffect(() => {
        try {
            if (repoInfo || repoUrl) {
                const dataToStore = { repoUrl: state.repoUrl, repoInfo: state.repoInfo, fileTree: state.fileTree };
                localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(dataToStore));
            }
        } catch (e) {
            dispatch({ type: 'SET_TRANSIENT_ERROR', payload: ErrorLocalStorageSave });
        }
    }, [state.repoUrl, state.repoInfo, state.fileTree]);
    
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

    const displayError = localStorageError || transientError || error;

    return (
      <AuthProvider>
        <SettingsProvider>
            <div className="main-app">
            <PageHeader
                onToggleSettings={handleToggleSettings}
                isMobile={isMobile}
                onToggleDrawer={() => setIsDrawerOpen(prev => !prev)}
            >
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
                <main className="app-content-grid">
                    {isMobile ? (
                        <FileTreeDrawer repoInfo={repoInfo} isRepoLoaded={isRepoLoaded} isDrawerOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
                    ) : (
                        <ErrorBoundary name={ErrorBoundaryFileTree}>
                            <Panel
                                className="file-tree-panel"
                                title={isRepoLoaded ? <><FolderKanban size={ICON_SIZE_SM} />{repoInfo.repo}</> : DefaultRepoTitle}
                            >
                                {isRepoLoaded ? <FileTree /> : <div className="placeholder"><p>{FileTreePlaceholder}</p></div>}
                            </Panel>
                        </ErrorBoundary>
                    )}
                    <ErrorBoundary name={ErrorBoundaryAnalysis}>
                        <MainContent />
                    </ErrorBoundary>
                    <ErrorBoundary name={ErrorBoundaryRightPanel}>
                        {rightPanelView === RightPanelViewer ? (
                            <AnalysisPanel />
                        ) : (
                            <SettingsPanel onClose={handleCloseSettings} />
                        )}
                    </ErrorBoundary>
                </main>
            </RepositoryProvider>
            <Footer
                errorMessage={displayError}
                onClearError={handleClearError}
                tooltipMessage={footerTooltip}
            />
            </div>
        </SettingsProvider>
      </AuthProvider>
    );
};