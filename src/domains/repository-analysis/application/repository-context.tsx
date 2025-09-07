import React, { createContext, useReducer, FC, ReactNode, useContext, useCallback, useEffect } from 'react';
import { GitHubFile, RepoInfo, ANALYSIS_SCOPES, AnalysisResults, AnalysisConfig, GEMINI_MODELS } from '../domain';
import { MAX_DISPLAY_FILE_SIZE, MAX_FILE_CACHE_SIZE } from '../../../../shared/config';

// --- UTILITY FUNCTIONS (MOVED FROM app.tsx) ---

const isImagePath = (path: string): boolean => /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(path);

const findFileInTree = (path: string, tree: GitHubFile[]): GitHubFile | null => {
    for (const node of tree) {
        if (node.path === path) {
            return node;
        }
        if (node.type === 'dir' && node.content) {
            const found = findFileInTree(path, node.content);
            if (found) {
                return found;
            }
        }
    }
    return null;
};

// --- STATE AND ACTION TYPES ---

type RepositoryState = {
    repoInfo: RepoInfo | null;
    fileTree: GitHubFile[];
    selectedFile: { path: string; content: string; url?: string; isImage?: boolean } | null;
    fileContentCache: Map<string, string>;
    searchTerm: string;
    analysisResults: AnalysisResults | null;
    analysisConfig: AnalysisConfig;
    isAnalysisLoading: boolean;
    analysisProgressMessage: string;
    error: string | null;
};

type RepositoryAction =
    | { type: 'INITIALIZE_STATE'; payload: { repoInfo: RepoInfo, fileTree: GitHubFile[] } }
    | { type: 'SELECT_FILE_START'; payload: { path: string, isImage: boolean, url?: string } }
    | { type: 'SELECT_FILE_SUCCESS'; payload: { path: string, content: string, url?: string, isImage: boolean } }
    | { type: 'SELECT_FILE_ERROR'; payload: string }
    | { type: 'SET_SEARCH_TERM'; payload: string }
    | { type: 'RUN_ANALYSIS_START' }
    | { type: 'SET_ANALYSIS_PROGRESS'; payload: string }
    | { type: 'RUN_ANALYSIS_SUCCESS'; payload: AnalysisResults }
    | { type: 'RUN_ANALYSIS_ERROR'; payload: string }
    | { type: 'SET_ANALYSIS_CONFIG'; payload: Partial<AnalysisConfig> }
    | { type: 'RESET' };

// --- REDUCER ---

const initialState: RepositoryState = {
    repoInfo: null,
    fileTree: [],
    selectedFile: null,
    fileContentCache: new Map(),
    searchTerm: '',
    analysisResults: null,
    analysisConfig: { customRules: '', scope: ANALYSIS_SCOPES.ALL, model: GEMINI_MODELS.PRO },
    isAnalysisLoading: false,
    analysisProgressMessage: '',
    error: null,
};

const repositoryReducer = (state: RepositoryState, action: RepositoryAction): RepositoryState => {
    switch (action.type) {
        case 'RESET':
            return initialState;
        case 'INITIALIZE_STATE':
            return {
                ...initialState,
                repoInfo: action.payload.repoInfo,
                fileTree: action.payload.fileTree,
            };
        case 'SELECT_FILE_START':
            return {
                ...state,
                selectedFile: { path: action.payload.path, content: 'Loading...', isImage: action.payload.isImage, url: action.payload.url },
                analysisConfig: { ...state.analysisConfig, scope: action.payload.isImage ? ANALYSIS_SCOPES.ALL : ANALYSIS_SCOPES.FILE },
                error: null,
            };
        case 'SELECT_FILE_SUCCESS': {
            const newCache = new Map(state.fileContentCache);
            if (!action.payload.isImage) {
                if (newCache.has(action.payload.path)) {
                    newCache.delete(action.payload.path);
                }
                newCache.set(action.payload.path, action.payload.content);
                if (newCache.size > MAX_FILE_CACHE_SIZE) {
                    const oldestKey = newCache.keys().next().value;
                    newCache.delete(oldestKey);
                }
            }
            return { ...state, selectedFile: action.payload, fileContentCache: newCache, error: null };
        }
        case 'SELECT_FILE_ERROR':
            return { ...state, selectedFile: null, error: action.payload };
        case 'SET_SEARCH_TERM':
            return { ...state, searchTerm: action.payload };
        
        case 'RUN_ANALYSIS_START':
            return { ...state, isAnalysisLoading: true, analysisProgressMessage: 'Preparing for analysis...', error: null, analysisResults: null };
        case 'SET_ANALYSIS_PROGRESS':
            return { ...state, analysisProgressMessage: action.payload };
        case 'RUN_ANALYSIS_SUCCESS':
            return { ...state, isAnalysisLoading: false, analysisProgressMessage: '', analysisResults: action.payload };
        case 'RUN_ANALYSIS_ERROR':
            return { ...state, isAnalysisLoading: false, analysisProgressMessage: '', error: action.payload };
        case 'SET_ANALYSIS_CONFIG': {
            const newConfig = { ...state.analysisConfig, ...action.payload };
            return { ...state, analysisConfig: newConfig };
        }
        default:
            return state;
    }
};

// --- CONTEXT AND PROVIDER ---

type RepositoryContextType = {
    state: RepositoryState;
    dispatch: React.Dispatch<RepositoryAction>;
    handleFileClick: (file: GitHubFile) => Promise<void>;
    selectFileByPath: (path: string) => void;
    onError: (message: string) => void; // For bubbling errors to the shell
};

const RepositoryContext = createContext<RepositoryContextType | undefined>(undefined);

interface RepositoryProviderProps {
    children: ReactNode;
    repoInfo: RepoInfo | null;
    fileTree: GitHubFile[];
    onError?: (message: string) => void;
}

export const RepositoryProvider: FC<RepositoryProviderProps> = ({ children, repoInfo, fileTree, onError = () => {} }) => {
    const [state, dispatch] = useReducer(repositoryReducer, initialState);

    useEffect(() => {
        if (repoInfo) {
            dispatch({ type: 'INITIALIZE_STATE', payload: { repoInfo, fileTree } });
        } else {
            dispatch({ type: 'RESET' });
        }
    }, [repoInfo, fileTree]);

    const handleFileClick = useCallback(async (file: GitHubFile): Promise<void> => {
        const isImage = isImagePath(file.path);
        if (isImage && file.download_url) {
            dispatch({ type: 'SELECT_FILE_SUCCESS', payload: { path: file.path, content: `Image file: ${file.path}`, url: file.download_url, isImage: true } });
            return;
        }
        if (!file.download_url) return;

        if (state.fileContentCache.has(file.path)) {
            dispatch({ type: 'SELECT_FILE_SUCCESS', payload: { path: file.path, content: state.fileContentCache.get(file.path)!, isImage: false, url: file.download_url } });
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
            onError(message); // Also bubble up to shell for transient display
        }
    }, [state.fileContentCache, onError]);

    const selectFileByPath = useCallback((path: string): void => {
        const file = findFileInTree(path, state.fileTree);
        if (file) {
            handleFileClick(file);
        } else {
            onError(`Could not find file '${path}' in the current repository tree.`);
        }
    }, [state.fileTree, handleFileClick, onError]);

    return (
        <RepositoryContext.Provider value={{ state, dispatch, handleFileClick, selectFileByPath, onError }}>
            {children}
        </RepositoryContext.Provider>
    );
};

// --- HOOK ---

export const useRepository = (): RepositoryContextType => {
    const context = useContext(RepositoryContext);
    if (context === undefined) {
        throw new Error('useRepository must be used within a RepositoryProvider');
    }
    return context;
};
