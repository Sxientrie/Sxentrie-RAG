import React, { createContext, useReducer, FC, ReactNode, useContext, useCallback, useEffect, useMemo } from 'react';
import { GitHubFile, RepoInfo, ANALYSIS_SCOPES, AnalysisResults, AnalysisConfig, GEMINI_MODELS, TechnicalReviewFinding, ANALYSIS_MODES, ANALYSIS_TABS } from '../domain';
import {
    MAX_DISPLAY_FILE_SIZE, MAX_FILE_CACHE_SIZE, TRUNCATED_DISPLAY_MESSAGE, ImageFileRegex, LabelLoading,
    LabelPreparingAnalysis, LabelPreparingDocumentation, ImageFileLabelTemplate, ErrorFetchFailedTemplate,
    ErrorCouldNotLoadFileContentTemplate, ErrorCouldNotLoadFileContent, ErrorFileNotFoundTemplate,
    ErrorUseRepositoryOutsideProvider
} from '../../../../shared/config';
import { collectAllFiles } from './file-tree-utils';
const isImagePath = (path: string): boolean => ImageFileRegex.test(path);
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
  activeLineRange: { start: number; end: number } | null;
  findingsMap: Map<string, Map<number, TechnicalReviewFinding>>;
  dismissedFindings: Set<string>;
  error: string | null;
  isDocLoading: boolean;
  docProgressMessage: string;
  generatedDoc: string | null;
  docError: string | null;
  totalAnalyzableFiles: number;
  analysisPreviewPaths: Set<string>;
  activeTab: string;
};
export type RepositoryAction =
  | { type: 'INITIALIZE_STATE'; payload: { repoInfo: RepoInfo, fileTree: GitHubFile[] } }
  | { type: 'SELECT_FILE_START'; payload: { path: string, isImage: boolean, url?: string } }
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'SELECT_FILE_SUCCESS'; payload: { path: string, content: string, url?: string, isImage: boolean } }
  | { type: 'SELECT_FILE_ERROR'; payload: string }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'RUN_ANALYSIS_START' }
  | { type: 'SET_ANALYSIS_PROGRESS'; payload: string }
  | { type: 'RUN_ANALYSIS_SUCCESS'; payload: AnalysisResults }
  | { type: 'RUN_ANALYSIS_ERROR'; payload: string }
  | { type: 'SET_ANALYSIS_CONFIG'; payload: Partial<AnalysisConfig> }
  | { type: 'SET_ACTIVE_LINE_RANGE'; payload: { start: number; end: number } | null }
  | { type: 'DISMISS_FINDING'; payload: string }
  | { type: 'RESET_DISMISSED_FINDINGS' }
  | { type: 'RESET' }
  | { type: 'RUN_DOC_GEN_START' }
  | { type: 'SET_DOC_GEN_PROGRESS'; payload: string }
  | { type: 'RUN_DOC_GEN_SUCCESS'; payload: string }
  | { type: 'RUN_DOC_GEN_ERROR'; payload: string }
  | { type: 'CLEAR_DOC' }
  | { type: 'SET_ANALYSIS_PREVIEW_PATHS'; payload: Set<string> };
const createInitialState = (): RepositoryState => ({
  repoInfo: null,
  fileTree: [],
  selectedFile: null,
  fileContentCache: new Map(),
  searchTerm: '',
  analysisResults: null,
  analysisConfig: { customRules: '', scope: ANALYSIS_SCOPES.ALL, model: GEMINI_MODELS.FLASH, mode: ANALYSIS_MODES.FAST, includePatterns: '', excludePatterns: '' },
  isAnalysisLoading: false,
  analysisProgressMessage: '',
  activeLineRange: null,
  findingsMap: new Map(),
  dismissedFindings: new Set(),
  error: null,
  isDocLoading: false,
  docProgressMessage: '',
  generatedDoc: null,
  docError: null,
  totalAnalyzableFiles: 0,
  analysisPreviewPaths: new Set(),
  activeTab: ANALYSIS_TABS.EDITOR,
});
const repositoryReducer = (state: RepositoryState, action: RepositoryAction): RepositoryState => {
  switch (action.type) {
    case 'RESET':
      return createInitialState();
    case 'SET_ACTIVE_TAB':
        return { ...state, activeTab: action.payload };
    case 'INITIALIZE_STATE': {
      const totalAnalyzableFiles = collectAllFiles(action.payload.fileTree).length;
      return {
        ...createInitialState(),
        repoInfo: action.payload.repoInfo,
        fileTree: action.payload.fileTree,
        totalAnalyzableFiles,
      };
    }
    case 'SELECT_FILE_START':
      return {
        ...state,
        selectedFile: { path: action.payload.path, content: LabelLoading, isImage: action.payload.isImage, url: action.payload.url },
        error: null,
        activeLineRange: null,
        activeTab: ANALYSIS_TABS.EDITOR,
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
      return {
        ...state,
        isAnalysisLoading: true,
        analysisProgressMessage: LabelPreparingAnalysis,
        error: null,
        analysisResults: null,
        findingsMap: new Map(),
        dismissedFindings: new Set(),
        generatedDoc: null,
        docError: null,
      };
    case 'SET_ANALYSIS_PROGRESS':
      return { ...state, analysisProgressMessage: action.payload };
    case 'RUN_ANALYSIS_SUCCESS': {
      const findingsMap = new Map<string, Map<number, TechnicalReviewFinding>>();
      action.payload.review.forEach(finding => {
        if (finding.startLine) {
          if (!findingsMap.has(finding.fileName)) {
            findingsMap.set(finding.fileName, new Map());
          }
          findingsMap.get(finding.fileName)!.set(finding.startLine, finding);
        }
      });
      return {
        ...state,
        isAnalysisLoading: false,
        analysisProgressMessage: '',
        analysisResults: action.payload,
        findingsMap: findingsMap,
        activeTab: ANALYSIS_TABS.OVERVIEW,
      };
    }
    case 'RUN_ANALYSIS_ERROR':
      return { ...state, isAnalysisLoading: false, analysisProgressMessage: '', error: action.payload };
    case 'SET_ANALYSIS_CONFIG': {
      const newConfig = { ...state.analysisConfig, ...action.payload };
      return { ...state, analysisConfig: newConfig };
    }
    case 'SET_ACTIVE_LINE_RANGE':
      return { ...state, activeLineRange: action.payload };
    case 'DISMISS_FINDING': {
      const newDismissed = new Set(state.dismissedFindings);
      newDismissed.add(action.payload);
      return { ...state, dismissedFindings: newDismissed };
    }
    case 'RESET_DISMISSED_FINDINGS':
      return { ...state, dismissedFindings: new Set() };
    case 'RUN_DOC_GEN_START':
      return {
        ...state,
        isDocLoading: true,
        docProgressMessage: LabelPreparingDocumentation,
        generatedDoc: null,
        docError: null,
        analysisResults: null,
        error: null,
      };
    case 'SET_DOC_GEN_PROGRESS':
      return { ...state, docProgressMessage: action.payload };
    case 'RUN_DOC_GEN_SUCCESS':
      return {
        ...state,
        isDocLoading: false,
        generatedDoc: action.payload,
      };
    case 'RUN_DOC_GEN_ERROR':
      return {
        ...state,
        isDocLoading: false,
        docError: action.payload,
      };
    case 'CLEAR_DOC':
      return {
        ...state,
        isDocLoading: false,
        docProgressMessage: '',
        generatedDoc: null,
        docError: null,
      };
    case 'SET_ANALYSIS_PREVIEW_PATHS':
      return { ...state, analysisPreviewPaths: action.payload };
    default:
      return state;
  }
};
type RepositoryContextType = {
  state: RepositoryState;
  dispatch: React.Dispatch<RepositoryAction>;
  handleFileClick: (file: GitHubFile) => Promise<void>;
  selectFileByPath: (path: string) => void;
  onError: (message: string) => void;
  openSettingsPanel?: () => void;
};
const RepositoryContext = createContext<RepositoryContextType | undefined>(undefined);
interface RepositoryProviderProps {
  children: ReactNode;
  repoInfo: RepoInfo | null;
  fileTree: GitHubFile[];
  onError?: (message: string) => void;
  openSettingsPanel?: () => void;
}
export const RepositoryProvider: FC<RepositoryProviderProps> = ({ children, repoInfo, fileTree, onError = () => { }, openSettingsPanel }) => {
  const [state, dispatch] = useReducer(repositoryReducer, undefined, createInitialState);
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
      dispatch({ type: 'SELECT_FILE_SUCCESS', payload: { path: file.path, content: ImageFileLabelTemplate.replace('{0}', file.path), url: file.download_url, isImage: true } });
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
      if (!response.ok) throw new Error(ErrorFetchFailedTemplate.replace('{0}', response.statusText));
      const text = await response.text();
      const cappedText = text.length > MAX_DISPLAY_FILE_SIZE
        ? text.substring(0, MAX_DISPLAY_FILE_SIZE) + TRUNCATED_DISPLAY_MESSAGE
        : text;
      dispatch({ type: 'SELECT_FILE_SUCCESS', payload: { path: file.path, content: cappedText, isImage: false, url: file.download_url } });
    } catch (err) {
      const message = err instanceof Error ? ErrorCouldNotLoadFileContentTemplate.replace('{0}', err.message) : ErrorCouldNotLoadFileContent;
      dispatch({ type: 'SELECT_FILE_ERROR', payload: message });
      onError(message);
    }
  }, [state.fileContentCache, onError, dispatch]);
  const selectFileByPath = useCallback((path: string): void => {
    const file = findFileInTree(path, state.fileTree);
    if (file) {
      handleFileClick(file);
    } else {
      onError(ErrorFileNotFoundTemplate.replace('{0}', path));
    }
  }, [state.fileTree, handleFileClick, onError]);
  const contextValue = useMemo(() => ({
    state,
    dispatch,
    handleFileClick,
    selectFileByPath,
    onError,
    openSettingsPanel,
  }), [state, dispatch, handleFileClick, selectFileByPath, onError, openSettingsPanel]);
  return (
    <RepositoryContext.Provider value={contextValue}>
      {children}
    </RepositoryContext.Provider>
  );
};
export const useRepository = (): RepositoryContextType => {
  const context = useContext(RepositoryContext);
  if (context === undefined) {
    throw new Error(ErrorUseRepositoryOutsideProvider);
  }
  return context;
};
