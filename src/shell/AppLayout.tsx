import { FC } from "react";
import { GitHubFile, RepoInfo } from "../domains/repository-analysis/domain";
import { RepoLoader } from "../domains/repository-analysis/ui/repo-loader";
import { FileTree } from "../domains/repository-analysis/ui/file-tree";
import { AnalysisPanel } from "../domains/repository-analysis/ui/analysis-panel";
import { Panel } from "../../shared/ui/panel";
import { FolderKanban } from 'lucide-react';
import { PageHeader } from '../../shared/ui/page-header';
import { Footer } from '../../shared/ui/footer';
import { ICON_SIZE_SM } from '../../shared/config';
import { ErrorBoundary } from "../../shared/ui/error-boundary";
import {
    RightPanelViewer, DefaultRepoTitle, FileTreePlaceholder, ErrorBoundaryFileTree,
    ErrorBoundaryAnalysis, ErrorBoundaryRightPanel
} from '../../shared/config';
import { SettingsPanel } from '../domains/settings/ui/settings-panel';
import { MainContent } from "./main-content";

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

type AppLayoutProps = {
    repoInfo: RepoInfo | null;
    fileTree: GitHubFile[];
    repoUrl: string;
    isLoading: boolean;
    displayError: string | null;
    footerTooltip: string | null;
    rightPanelView: string;
    isRepoLoaded: boolean;
    isMobile: boolean;
    isDrawerOpen: boolean;
    dispatch: React.Dispatch<any>;
    setRepoUrl: (url: string) => void;
    handleLoadRepo: () => void;
    handleReset: () => void;
    handleClearError: () => void;
    handleToggleSettings: () => void;
    handleCloseSettings: () => void;
    onToggleDrawer: () => void;
    onCloseDrawer: () => void;
};

export const AppLayout: FC<AppLayoutProps> = ({
    repoInfo,
    repoUrl,
    isLoading,
    displayError,
    footerTooltip,
    rightPanelView,
    isRepoLoaded,
    isMobile,
    isDrawerOpen,
    dispatch,
    setRepoUrl,
    handleLoadRepo,
    handleReset,
    handleClearError,
    handleToggleSettings,
    handleCloseSettings,
    onToggleDrawer,
    onCloseDrawer,
}) => {
    return (
        <div className="main-app">
            <PageHeader
                onToggleSettings={handleToggleSettings}
                isMobile={isMobile}
                onToggleDrawer={onToggleDrawer}
            >
                <RepoLoader
                    repoUrl={repoUrl}
                    setRepoUrl={setRepoUrl}
                    onLoad={handleLoadRepo}
                    onReset={handleReset}
                    isRepoLoading={isLoading}
                    isRepoLoaded={isRepoLoaded}
                    dispatch={dispatch}
                />
            </PageHeader>
            <main className="app-content-grid">
                {isMobile ? (
                    <FileTreeDrawer repoInfo={repoInfo} isRepoLoaded={isRepoLoaded} isDrawerOpen={isDrawerOpen} onClose={onCloseDrawer} />
                ) : (
                    <ErrorBoundary name={ErrorBoundaryFileTree}>
                        <Panel
                            className="file-tree-panel"
                            title={isRepoLoaded ? <><FolderKanban size={ICON_SIZE_SM} />{repoInfo!.repo}</> : DefaultRepoTitle}
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
            <Footer
                errorMessage={displayError}
                onClearError={handleClearError}
                tooltipMessage={footerTooltip}
            />
        </div>
    );
};
