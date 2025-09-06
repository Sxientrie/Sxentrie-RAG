import React, { FC, useReducer, useEffect, useMemo, useCallback } from "react";
import { GitHubFile, RepoInfo, AnalysisResults, AnalysisConfig, ANALYSIS_SCOPES } from "./constants";
import { MAX_DISPLAY_FILE_SIZE, MAX_FILE_CACHE_SIZE } from "./config";
import { ApiError } from "./errors/api-error";
import { fetchRepoTree, parseGitHubUrl } from "./services/github-service";
import { runCodeAnalysis } from "./services/gemini-service";
import { RepoLoader } from "./components/repo-loader";
import { FileTree } from "./components/file-tree";
import { FileViewer } from "./components/file-viewer";
import { AnalysisPanel } from "./components/analysis-panel";
import { Panel } from "./components/panel";
import { FolderKanban, Search } from 'lucide-react';
import { PageHeader } from './components/page-header';
import { Footer } from './components/footer';
import { ErrorBoundary } from "./components/error-boundary";

const LOCAL_STORAGE_KEY = 'sxentrie-session';

type AppState = {
    repoUrl: string;
    repoInfo: RepoInfo | null;
    fileTree: GitHubFile[];
    selectedFile: { path: string; content: string; url?: string; isImage?: boolean } | null;
    analysisResults: AnalysisResults | null;
    analysisConfig: AnalysisConfig;
    isLoading: boolean;
    loadingMessage: string;
    error: string | null;
    searchTerm: string;
    isAnalysisLoading: boolean;
    analysisProgressMessage: string;
    isTreeCollapsed: boolean;
    fileContentCache: Map<string, string>;
    localStorageError: string | null;
};

type AppAction =
    | { type: 'SET_REPO_URL'; payload: string }
    | { type: 'LOAD_REPO_START' }
    | { type: 'LOAD_REPO_SUCCESS'; payload: { repoInfo: RepoInfo, tree: GitHubFile[] } }
    | { type: 'LOAD_REPO_ERROR'; payload: string }
    | { type: 'SELECT_FILE_START'; payload: { path: string, isImage: boolean, url?: string } }
    | { type: 'SELECT_FILE_SUCCESS'; payload: { path: string, content: string, url?: string, isImage: boolean } }
    | { type: 'SELECT_FILE_ERROR'; payload: string }
    | { type: 'RUN_ANALYSIS_START' }
    | { type: 'SET_ANALYSIS_PROGRESS'; payload: string }
    | { type: 'RUN_ANALYSIS_SUCCESS'; payload: AnalysisResults }
    | { type: 'RUN_ANALYSIS_ERROR'; payload: string }
    | { type: 'SET_ANALYSIS_CONFIG'; payload: Partial<AnalysisConfig> }
    | { type: 'SET_SEARCH_TERM'; payload: string }
    | { type: 'TOGGLE_TREE_COLLAPSE' }
    | { type: 'RESET_STATE' }
    | { type: 'CLEAR_LOCAL_STORAGE_ERROR' };

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
                selectedFile: parsed.selectedFile || null,
                analysisResults: parsed.analysisResults || null,
                analysisConfig: parsed.analysisConfig || { customRules: '', scope: ANALYSIS_SCOPES.ALL },
            };
        }
    } catch (error) {
        console.error('Failed to parse state from localStorage', error);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        return { ...initialState, localStorageError: 'Your saved session was corrupted and has been reset.' };
    }
    return initialState;
};

const initialState: AppState = {
    repoUrl: '',
    repoInfo: null,
    fileTree: [],
    selectedFile: null,
    analysisResults: null,
    analysisConfig: { customRules: '', scope: ANALYSIS_SCOPES.ALL },
    isLoading: false,
    loadingMessage: '',
    error: null,
    searchTerm: '',
    isAnalysisLoading: false,
    analysisProgressMessage: '',
    isTreeCollapsed: false,
    fileContentCache: new Map(),
    localStorageError: null,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
    switch (action.type) {
        case 'SET_REPO_URL':
            return { ...state, repoUrl: action.payload };
        case 'LOAD_REPO_START':
            return {
                ...state,
                isLoading: true,
                loadingMessage: 'Parsing URL...',
                error: null,
                fileTree: [],
                selectedFile: null,
                analysisResults: null,
                repoInfo: null,
                searchTerm: '',
                fileContentCache: new Map(),
                analysisConfig: { ...state.analysisConfig, scope: ANALYSIS_SCOPES.ALL }
            };
        case 'LOAD_REPO_SUCCESS':
            return { ...state, isLoading: false, loadingMessage: '', repoInfo: action.payload.repoInfo, fileTree: action.payload.tree };
        case 'LOAD_REPO_ERROR':
            return { ...state, isLoading: false, loadingMessage: '', error: action.payload };
        case 'SELECT_FILE_START':
            return {
                ...state,
                selectedFile: { path: action.payload.path, content: 'Loading...', isImage: action.payload.isImage, url: action.payload.url },
                analysisConfig: { ...state.analysisConfig, scope: action.payload.isImage ? ANALYSIS_SCOPES.ALL : ANALYSIS_SCOPES.FILE }
            };
        case 'SELECT_FILE_SUCCESS': {
            const newCache = new Map(state.fileContentCache);
            if (!action.payload.isImage) {
                newCache.set(action.payload.path, action.payload.content);
                if (newCache.size > MAX_FILE_CACHE_SIZE) {
                    const oldestKey = newCache.keys().next().value;
                    newCache.delete(oldestKey);
                }
            }
            return { ...state, selectedFile: action.payload, fileContentCache: newCache };
        }
        case 'SELECT_FILE_ERROR':
            return { ...state, error: action.payload, selectedFile: null, analysisConfig: { ...state.analysisConfig, scope: ANALYSIS_SCOPES.ALL } };
        case 'RUN_ANALYSIS_START':
            return { ...state, isAnalysisLoading: true, analysisProgressMessage: 'Preparing for analysis...', error: null, analysisResults: null };
        case 'SET_ANALYSIS_PROGRESS':
            return { ...state, analysisProgressMessage: action.payload };
        case 'RUN_ANALYSIS_SUCCESS':
            return { ...state, isAnalysisLoading: false, analysisProgressMessage: '', analysisResults: action.payload };
        case 'RUN_ANALYSIS_ERROR':
            return { ...state, isAnalysisLoading: false, analysisProgressMessage: '', error: action.payload };
        case 'SET_ANALYSIS_CONFIG':
            return { ...state, analysisConfig: { ...state.analysisConfig, ...action.payload } };
        case 'SET_SEARCH_TERM':
            return { ...state, searchTerm: action.payload };
        case 'TOGGLE_TREE_COLLAPSE':
            return { ...state, isTreeCollapsed: !state.isTreeCollapsed };
        case 'RESET_STATE':
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            return { ...initialState, fileContentCache: new Map() };
        case 'CLEAR_LOCAL_STORAGE_ERROR':
            return { ...state, localStorageError: null };
        default:
            return state;
    }
};


const isImagePath = (path: string): boolean => /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(path);

const filterFileTree = (nodes: GitHubFile[], term: string): GitHubFile[] => {
    if (!term.trim()) return nodes;
    const lowerCaseTerm = term.toLowerCase().trim();
    return nodes.reduce<GitHubFile[]>((acc, node) => {
        if (node.type === 'dir') {
            const children = filterFileTree(node.content || [], term);
            if (node.name.toLowerCase().includes(lowerCaseTerm) || children.length > 0) {
                acc.push({ ...node, content: children });
            }
        } else if (node.name.toLowerCase().includes(lowerCaseTerm)) {
            acc.push(node);
        }
        return acc;
    }, []);
};

export const App: FC = () => {
    const [state, dispatch] = useReducer(appReducer, undefined, getInitialState);
    const {
        repoUrl, repoInfo, fileTree, selectedFile, analysisResults, analysisConfig,
        isLoading, loadingMessage, error, searchTerm, isAnalysisLoading, analysisProgressMessage,
        isTreeCollapsed, fileContentCache, localStorageError
    } = state;

    useEffect(() => {
        const stateToSave = { repoUrl, repoInfo, fileTree, selectedFile, analysisResults, analysisConfig };
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (e) { console.error('Failed to save state to localStorage', e); }
    }, [repoUrl, repoInfo, fileTree, selectedFile, analysisResults, analysisConfig]);

    useEffect(() => {
        if (localStorageError) {
            alert(localStorageError);
            dispatch({ type: 'CLEAR_LOCAL_STORAGE_ERROR' });
        }
    }, [localStorageError]);

    const filteredFileTree = useMemo(() => filterFileTree(fileTree, searchTerm), [fileTree, searchTerm]);
    const isRepoLoaded = useMemo(() => !!repoInfo && fileTree.length > 0, [repoInfo, fileTree]);

    const handleLoadRepo = async (): Promise<void> => {
        dispatch({ type: 'LOAD_REPO_START' });
        const parsed = parseGitHubUrl(repoUrl);
        if (!parsed) {
            dispatch({ type: 'LOAD_REPO_ERROR', payload: "Invalid GitHub repository URL. Please use the format 'https://github.com/owner/repo'." });
            return;
        }
        try {
            dispatch({ type: 'SET_REPO_URL', payload: repoUrl });
            dispatch({ type: 'SET_ANALYSIS_PROGRESS', payload: 'Fetching repository tree...' });
            const tree = await fetchRepoTree(parsed.owner, parsed.repo);
            dispatch({ type: 'LOAD_REPO_SUCCESS', payload: { repoInfo: parsed, tree } });
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "An unknown error occurred while fetching the repository.";
            dispatch({ type: 'LOAD_REPO_ERROR', payload: message });
            console.error(err);
        }
    };

    const handleRunAnalysis = async (): Promise<void> => {
        if (!repoInfo) {
            dispatch({ type: 'RUN_ANALYSIS_ERROR', payload: "A repository must be loaded before running analysis." });
            return;
        }
        dispatch({ type: 'RUN_ANALYSIS_START' });
        try {
            const results = await runCodeAnalysis(
                repoInfo.repo, fileTree, analysisConfig, selectedFile,
                (msg) => dispatch({ type: 'SET_ANALYSIS_PROGRESS', payload: msg })
            );
            dispatch({ type: 'RUN_ANALYSIS_SUCCESS', payload: results });
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred during analysis.";
            dispatch({ type: 'RUN_ANALYSIS_ERROR', payload: message });
            console.error("Analysis failed:", err);
        }
    };

    const handleFileClick = useCallback(async (file: GitHubFile): Promise<void> => {
        const isImage = isImagePath(file.path);
        if (isImage && file.download_url) {
            dispatch({ type: 'SELECT_FILE_SUCCESS', payload: { path: file.path, content: `Image file: ${file.path}`, url: file.download_url, isImage: true } });
            dispatch({ type: 'SET_ANALYSIS_CONFIG', payload: { scope: ANALYSIS_SCOPES.ALL } });
            return;
        }
        if (!file.download_url) return;

        if (fileContentCache.has(file.path)) {
            dispatch({ type: 'SELECT_FILE_SUCCESS', payload: { path: file.path, content: fileContentCache.get(file.path)!, isImage: false, url: file.download_url } });
            dispatch({ type: 'SET_ANALYSIS_CONFIG', payload: { scope: ANALYSIS_SCOPES.FILE } });
            return;
        }

        dispatch({ type: 'SELECT_FILE_START', payload: { path: file.path, isImage: false, url: file.download_url } });
        try {
            const response = await fetch(file.download_url);
            if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`);
            const text = await response.text();
            const cappedText = text.length > MAX_DISPLAY_FILE_SIZE
                ? text.substring(0, MAX_DISPLAY_FILE_SIZE) + "\n\n... (file truncated for display)"
                : text;
            dispatch({ type: 'SELECT_FILE_SUCCESS', payload: { path: file.path, content: cappedText, isImage: false, url: file.download_url } });
        } catch (err) {
            const message = err instanceof Error ? `Could not load file content: ${err.message}` : "Could not load file content.";
            dispatch({ type: 'SELECT_FILE_ERROR', payload: message });
        }
    }, [fileContentCache]);

    return (
        <div className="main-app" style={{ gridTemplateColumns: `${isTreeCollapsed ? '40px' : 'minmax(280px, 1.2fr)'} 2fr 2fr` }}>
            <PageHeader>
                <RepoLoader
                    repoUrl={repoUrl}
                    setRepoUrl={(url) => dispatch({ type: 'SET_REPO_URL', payload: url })}
                    onLoad={handleLoadRepo}
                    onReset={() => dispatch({ type: 'RESET_STATE' })}
                    isRepoLoading={isLoading}
                    isRepoLoaded={isRepoLoaded}
                    loadingMessage={loadingMessage}
                />
            </PageHeader>
            <Panel
                className="file-tree-panel"
                title={<><FolderKanban size={14} /> {repoInfo ? `${repoInfo.repo}` : 'Repository Files'}</>}
                isCollapsed={isTreeCollapsed}
                onToggleCollapse={() => dispatch({ type: 'TOGGLE_TREE_COLLAPSE' })}
                collapseDirection="left"
            >
                <div className="file-search-input-wrapper">
                    <Search size={12} />
                    <input
                        type="text"
                        className="file-search-input"
                        placeholder="Search files and folders..."
                        value={searchTerm}
                        onChange={(e) => dispatch({ type: 'SET_SEARCH_TERM', payload: e.target.value })}
                        disabled={fileTree.length === 0}
                        aria-label="Search files in repository"
                    />
                </div>
                {isLoading && !fileTree.length && (<div className="placeholder"><div className="loading-spinner"></div>{loadingMessage}</div>)}
                {error && !fileTree.length && <div className="error-message">{error}</div>}
                {!isLoading && fileTree.length === 0 && !error && (<div className="placeholder">Load a repository to see its file structure here.</div>)}
                {fileTree.length > 0 && (
                    <ErrorBoundary name="File Tree">
                        <FileTree files={filteredFileTree} onFileClick={handleFileClick} selectedPath={selectedFile?.path ?? null} searchTerm={searchTerm} />
                        {searchTerm && filteredFileTree.length === 0 && (<div className="placeholder">No files found matching "{searchTerm}".</div>)}
                    </ErrorBoundary>
                )}
            </Panel>
            <ErrorBoundary name="File Viewer"><FileViewer file={selectedFile} isRepoLoaded={isRepoLoaded} /></ErrorBoundary>
            <ErrorBoundary name="Analysis Panel">
                <AnalysisPanel
                    results={analysisResults}
                    config={analysisConfig}
                    setConfig={(cfg) => dispatch({ type: 'SET_ANALYSIS_CONFIG', payload: cfg })}
                    isLoading={isAnalysisLoading}
                    loadingMessage={analysisProgressMessage}
                    error={error}
                    onRunAnalysis={handleRunAnalysis}
                    isRepoLoaded={isRepoLoaded}
                    selectedFile={selectedFile}
                    repoInfo={repoInfo}
                />
            </ErrorBoundary>
            <Footer />
        </div>
    );
};
