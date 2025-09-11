import { FC, useReducer, useEffect, useMemo, useCallback, useRef, useState, CSSProperties } from "react";
import { GitHubFile, RepoInfo, ANALYSIS_SCOPES } from "../domains/repository-analysis/domain";
import { fetchRepoTree, parseGitHubUrl } from "../domains/repository-analysis/infrastructure/github-service";
import { ApiError } from "../../shared/errors/api-error";
import { RepoLoader } from "../domains/repository-analysis/ui/repo-loader";
import { FileTree } from "../domains/repository-analysis/ui/file-tree";
import { FileViewer } from "../domains/repository-analysis/ui/file-viewer";
import { AnalysisPanel } from "../domains/repository-analysis/ui/analysis-panel";
import { RepositoryProvider, useRepository } from '../domains/repository-analysis/application/repository-context';
import { Panel } from "../../shared/ui/panel";
import { FolderKanban, Download, RotateCw } from 'lucide-react';
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
    ErrorCorruptedSession, ErrorLocalStorageSave, ErrorInvalidGitHubUrl, ErrorUnknown,
    MARKDOWN_FILE_EXTENSION, REPORT_FILE_MIMETYPE, ReportHeaderTemplate, ReportRepoUrlTemplate,
    ReportDateTemplate, ReportHorizontalRule, ReportConfigHeader, ReportScopeFileTemplate, ReportScopeRepo,
    ReportModeTemplate, ReportCustomDirectivesTemplate, ReportNoCustomDirectives, ReportOverviewHeader,
    ReportReviewHeader, ReportNoIssuesFound, ReportSummaryTableHeader, ReportSummaryTableRowTemplate,
    ReportDetailsHeader, ReportFindingHeaderTemplate, ReportDetailsTableHeader, ReportDetailsTableRowTemplate,
    ReportLineRangeTemplate, ReportNotApplicable, ReportQuoteTemplate, ReportCodeBlockTemplate, ReportFileNameTemplate,
    TitleShowDismissedFindingsTemplate, AriaLabelRestoreDismissed, TitleDownloadReport, AriaLabelDownloadReport
} from '../../shared/config';
import { SettingsPanel } from '../domains/settings/ui/settings-panel';
import { useMediaQuery } from "../shared/hooks/use-media-query";
import { AnalysisReportView } from "../domains/repository-analysis/ui/analysis-report-view";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getLanguage } from "../../shared/lib/get-language";

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

const MainContent = () => {
    const { state, dispatch, selectFileByPath } = useRepository();
    const { analysisResults, activeTab, repoInfo, analysisConfig, selectedFile, dismissedFindings } = state;

    const handleDownloadReport = useCallback((): void => {
        if (!analysisResults || !repoInfo) return;
        const reportDate = new Date().toUTCString();
        const reportParts: string[] = [];
        const findings = analysisResults.review;
        reportParts.push(ReportHeaderTemplate.replace('{0}', repoInfo.repo));
        reportParts.push(ReportRepoUrlTemplate.replace('{0}', repoInfo.owner).replace('{1}', repoInfo.repo));
        reportParts.push(ReportDateTemplate.replace('{0}', reportDate));
        reportParts.push(ReportHorizontalRule);
        reportParts.push(ReportConfigHeader);
        if (analysisConfig.scope === ANALYSIS_SCOPES.FILE && selectedFile) {
          reportParts.push(ReportScopeFileTemplate.replace('{0}', selectedFile.path));
        } else {
          reportParts.push(ReportScopeRepo);
        }
        reportParts.push(ReportModeTemplate.replace('{0}', analysisConfig.mode.charAt(0).toUpperCase() + analysisConfig.mode.slice(1)));
        if (analysisConfig.customRules) {
          reportParts.push(ReportCustomDirectivesTemplate.replace('{0}', analysisConfig.customRules));
        } else {
          reportParts.push(ReportNoCustomDirectives);
        }
        reportParts.push(`\n${ReportHorizontalRule}`);
        reportParts.push(ReportOverviewHeader);
        reportParts.push(`${analysisResults.overview}\n\n${ReportHorizontalRule}\n`);
        reportParts.push(ReportReviewHeader);
        if (findings.length === 0) {
          reportParts.push(ReportNoIssuesFound);
        } else {
          const summaryTable = [
            ReportSummaryTableHeader,
            ...findings.map(f => ReportSummaryTableRowTemplate.replace('{0}', f.severity).replace('{1}', f.finding).replace('{2}', f.fileName)).join('\n'),
          ].join('\n');
          reportParts.push(summaryTable);
          reportParts.push(`\n\n${ReportHorizontalRule}\n`);
          reportParts.push(ReportDetailsHeader);
          findings.forEach((finding, index) => {
            reportParts.push(ReportFindingHeaderTemplate.replace('{0}', String(index + 1)).replace('{1}', finding.finding));
            const detailsTable = [
              ReportDetailsTableHeader,
              ReportDetailsTableRowTemplate
                .replace('{0}', finding.severity)
                .replace('{1}', finding.fileName)
                .replace('{2}', finding.startLine ? ReportLineRangeTemplate.replace('{0}', String(finding.startLine)).replace('{1}', String(finding.endLine)) : ReportNotApplicable)
            ].join('\n');
            reportParts.push(detailsTable);
            reportParts.push('\n\n');
            finding.explanation.forEach(step => {
              if (step.type === 'text') {
                reportParts.push(ReportQuoteTemplate.replace('{0}', step.content));
              } else if (step.type === 'code') {
                const language = getLanguage(finding.fileName);
                reportParts.push(ReportCodeBlockTemplate.replace('{0}', language).replace('{1}', step.content));
              }
            });
            reportParts.push(`\n`);
          });
        }
        const md = reportParts.join('');
        const blob = new Blob([md], { type: REPORT_FILE_MIMETYPE });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = ReportFileNameTemplate.replace('{0}', repoInfo.repo).replace('{1}', MARKDOWN_FILE_EXTENSION);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, [analysisResults, repoInfo, analysisConfig, selectedFile]);

      const dismissedCount = dismissedFindings.size;

      const tabs = useMemo(() => [
        {
          title: 'Editor',
          content: <FileViewer onError={() => {}} />
        },
        {
          title: 'Project Overview',
          content: (
            <div className="tab-content markdown-content" aria-live="polite">
              {analysisResults ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysisResults.overview}</ReactMarkdown>
              ) : (
                <p>Run an analysis to see the project overview.</p>
              )}
            </div>
          )
        },
        {
          title: 'Technical Review',
          content: (
            <>
              {analysisResults ? (
                <AnalysisReportView analysisResults={analysisResults} onFileSelect={selectFileByPath} />
              ) : (
                <p>Run an analysis to see the technical review.</p>
              )}
            </>
          )
        }
      ], [analysisResults, selectFileByPath]);

      const activeTabIndex = useMemo(() => {
        const index = tabs.findIndex(tab => tab.title === activeTab);
        return index === -1 ? 0 : index;
      }, [activeTab, tabs]);

      const handleTabChange = (index: number) => {
        dispatch({ type: 'SET_ACTIVE_TAB', payload: tabs[index].title });
      };

      const TabActions = (
        <>
          {dismissedCount > 0 && (
            <button
              className="panel-action-btn"
              onClick={() => dispatch({ type: 'RESET_DISMISSED_FINDINGS' })}
              title={TitleShowDismissedFindingsTemplate.replace('{0}', String(dismissedCount))}
              aria-label={AriaLabelRestoreDismissed}
            >
              <RotateCw size={ICON_SIZE_SM} />
            </button>
          )}
          {analysisResults && repoInfo && (
            <button
              className="panel-action-btn"
              onClick={handleDownloadReport}
              disabled={!analysisResults || !repoInfo}
              title={TitleDownloadReport}
              aria-label={AriaLabelDownloadReport}
            >
              <Download size={ICON_SIZE_SM} />
            </button>
          )}
        </>
      );

      return (
        <Panel
            tabs={tabs}
            activeTab={activeTabIndex}
            onTabChange={handleTabChange}
            actions={activeTabIndex === 2 ? TabActions : null}
        >
            {tabs[activeTabIndex].content}
        </Panel>
      );
}


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
                    <MainContent />
                </ErrorBoundary>
                {!isMobile && <Splitter onResize={handleResize(1)} />}
                <ErrorBoundary name={ErrorBoundaryRightPanel}>
                    {rightPanelView === RightPanelViewer ? (
                        <AnalysisPanel />
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
