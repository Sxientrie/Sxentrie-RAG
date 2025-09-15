import { useReducer, useEffect, useCallback, useState } from "react";
import { GitHubFile, RepoInfo } from "../domains/repository-analysis/domain";
import { fetchRepoTree, parseGitHubUrl } from "../domains/repository-analysis/infrastructure/github-service";
import { ApiError } from "../../shared/errors/api-error";
import {
    SESSION_STORAGE_KEY, UI_ERROR_TOAST_TIMEOUT_MS, RightPanelViewer, RightPanelSettings,
    ErrorCorruptedSession, ErrorLocalStorageSave, ErrorInvalidGitHubUrl, ErrorUnknown, MediaQuerySm
} from '../../shared/config';
import { useMediaQuery } from "../shared/hooks/use-media-query";

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

export const useAppShell = () => {
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

    const setRepoUrl = (url: string) => dispatch({ type: 'SET_REPO_URL', payload: url });

    const onToggleDrawer = () => setIsDrawerOpen(prev => !prev);

    const onCloseDrawer = () => setIsDrawerOpen(false);

    const displayError = localStorageError || transientError || error;

    return {
        // State
        repoInfo,
        fileTree,
        repoUrl,
        isLoading,
        displayError,
        footerTooltip,
        rightPanelView,
        isRepoLoaded,
        isMobile,
        isDrawerOpen,

        // Handlers
        setRepoUrl,
        handleLoadRepo,
        handleReset,
        handleRepositoryError,
        handleClearError,
        handleToggleSettings,
        handleOpenSettings,
        handleCloseSettings,
        onToggleDrawer,
        onCloseDrawer,
        dispatch,
    };
};
