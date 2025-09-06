import React, { useState, useCallback, FC, useMemo, useEffect } from "react";
import { GitHubFile, RepoInfo, AnalysisResults, AnalysisConfig, ANALYSIS_SCOPES } from "./constants";
import { MAX_DISPLAY_FILE_SIZE } from "./config";
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

const getInitialState = () => {
    try {
        const item = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (item) {
            const parsed = JSON.parse(item);
            return {
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
    }

    return {
        repoUrl: '',
        repoInfo: null,
        fileTree: [],
        selectedFile: null,
        analysisResults: null,
        analysisConfig: { customRules: '', scope: ANALYSIS_SCOPES.ALL },
    };
};

const initialState = getInitialState();

const isImagePath = (path: string): boolean => /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(path);

const filterFileTree = (nodes: GitHubFile[], term: string): GitHubFile[] => {
    if (!term.trim()) {
        return nodes;
    }

    const lowerCaseTerm = term.toLowerCase().trim();

    return nodes.reduce<GitHubFile[]>((acc, node) => {
        if (node.type === 'dir') {
            const children = filterFileTree(node.content || [], term);
            if (node.name.toLowerCase().includes(lowerCaseTerm) || children.length > 0) {
                const content = node.name.toLowerCase().includes(lowerCaseTerm) ? node.content : children;
                acc.push({ ...node, content });
            }
        } else {
            if (node.name.toLowerCase().includes(lowerCaseTerm)) {
                acc.push(node);
            }
        }
        return acc;
    }, []);
};


export const App: FC = () => {
  const [repoUrl, setRepoUrl] = useState(initialState.repoUrl);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(initialState.repoInfo);
  const [fileTree, setFileTree] = useState<GitHubFile[]>(initialState.fileTree);
  const [selectedFile, setSelectedFile] = useState<{path: string; content: string; url?: string; isImage?: boolean;} | null>(initialState.selectedFile);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(initialState.analysisResults);
  const [analysisConfig, setAnalysisConfig] = useState<AnalysisConfig>(initialState.analysisConfig);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [analysisProgressMessage, setAnalysisProgressMessage] = useState('');
  const [isTreeCollapsed, setTreeCollapsed] = useState(false);
  const [fileContentCache, setFileContentCache] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const stateToSave = {
      repoUrl,
      repoInfo,
      fileTree,
      selectedFile,
      analysisResults,
      analysisConfig,
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Failed to save state to localStorage', error);
    }
  }, [repoUrl, repoInfo, fileTree, selectedFile, analysisResults, analysisConfig]);

  const filteredFileTree = useMemo(() => filterFileTree(fileTree, searchTerm), [fileTree, searchTerm]);
  const isRepoLoaded = useMemo(() => !!repoInfo && fileTree.length > 0, [repoInfo, fileTree]);

  const gridStyle = {
    gridTemplateColumns: `${isTreeCollapsed ? '40px' : 'minmax(280px, 1.2fr)'} 2fr 2fr`,
  };
  
  const resetState = useCallback(() => {
    setRepoUrl("");
    setRepoInfo(null);
    setFileTree([]);
    setSelectedFile(null);
    setIsLoading(false);
    setLoadingMessage('');
    setError(null);
    setAnalysisResults(null);
    setAnalysisConfig({ customRules: '', scope: ANALYSIS_SCOPES.ALL });
    setIsAnalysisLoading(false);
    setAnalysisProgressMessage('');
    setSearchTerm('');
    setFileContentCache(new Map());
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }, []);

  const handleLoadRepo = async (): Promise<void> => {
    setIsLoading(true);
    setLoadingMessage('Parsing URL...');
    setError(null);
    setFileTree([]);
    setSelectedFile(null);
    setAnalysisResults(null);
    setRepoInfo(null);
    setSearchTerm('');
    setFileContentCache(new Map());
    setAnalysisConfig(prev => ({ ...prev, scope: ANALYSIS_SCOPES.ALL }));
    
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      setError("Invalid GitHub repository URL. Please use the format 'https://github.com/owner/repo'.");
      setIsLoading(false);
      return;
    }
    
    setRepoInfo(parsed);

    try {
      setLoadingMessage('Fetching repository tree...');
      const tree = await fetchRepoTree(parsed.owner, parsed.repo);
      setFileTree(tree);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("An unknown error occurred while fetching the repository.");
        console.error(err);
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleRunAnalysis = async (): Promise<void> => {
    if (!repoInfo) {
        setError("A repository must be loaded before running analysis.");
        return;
    }
    setIsAnalysisLoading(true);
    setError(null);
    setAnalysisResults(null);
    setAnalysisProgressMessage('Preparing for analysis...');
    
    try {
        const results = await runCodeAnalysis(
            repoInfo.repo, 
            fileTree, 
            analysisConfig, 
            selectedFile, 
            setAnalysisProgressMessage
        );
        setAnalysisResults(results);
    } catch (err) {
        console.error("Analysis failed:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred during analysis.");
    } finally {
        setIsAnalysisLoading(false);
        setAnalysisProgressMessage('');
    }
  };

  const handleFileClick = useCallback(async (file: GitHubFile): Promise<void> => {
    if (isImagePath(file.path) && file.download_url) {
        setSelectedFile({
            path: file.path,
            content: `Image file: ${file.path}`,
            url: file.download_url,
            isImage: true,
        });
        setAnalysisConfig(prev => ({ ...prev, scope: ANALYSIS_SCOPES.ALL }));
        return;
    }
    
    if (!file.download_url) return;

    setAnalysisConfig(prev => ({ ...prev, scope: ANALYSIS_SCOPES.FILE }));
    
    if (fileContentCache.has(file.path)) {
        setSelectedFile({
            path: file.path,
            content: fileContentCache.get(file.path)!,
            isImage: false,
            url: file.download_url,
        });
        return;
    }

    setSelectedFile({path: file.path, content: 'Loading...', isImage: false});
    try {
      const response = await fetch(file.download_url);
      if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`);
      const text = await response.text();
      const cappedText = text.length > MAX_DISPLAY_FILE_SIZE 
        ? text.substring(0, MAX_DISPLAY_FILE_SIZE) + "\n\n... (file truncated for display)" 
        : text;
      
      setSelectedFile({ path: file.path, content: cappedText, isImage: false, url: file.download_url });
      setFileContentCache(prevCache => new Map(prevCache).set(file.path, cappedText));
    } catch (err) {
      const errorMessage = err instanceof Error ? `Could not load file content: ${err.message}` : "Could not load file content.";
      setError(errorMessage);
      setSelectedFile(null);
      setAnalysisConfig(prev => ({ ...prev, scope: ANALYSIS_SCOPES.ALL }));
    }
  }, [fileContentCache]);

  return (
    <div className="main-app" style={gridStyle}>
      <PageHeader>
        <RepoLoader
          repoUrl={repoUrl}
          setRepoUrl={setRepoUrl}
          onLoad={handleLoadRepo}
          onReset={resetState}
          isRepoLoading={isLoading}
          isRepoLoaded={isRepoLoaded}
          loadingMessage={loadingMessage}
        />
      </PageHeader>
      
      <Panel
        className="file-tree-panel"
        title={<><FolderKanban size={14} /> {repoInfo ? `${repoInfo.repo}` : 'Repository Files'}</>}
        isCollapsed={isTreeCollapsed}
        onToggleCollapse={() => setTreeCollapsed(prev => !prev)}
        collapseDirection="left"
      >
        <div className="file-search-input-wrapper">
            <Search size={12} />
            <input
                type="text"
                className="file-search-input"
                placeholder="Search files and folders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={fileTree.length === 0}
                aria-label="Search files in repository"
            />
        </div>
        
        {isLoading && !fileTree.length && (
            <div className="placeholder">
                <div className="loading-spinner"></div>
                {loadingMessage}
            </div>
        )}
        {error && !fileTree.length && <div className="error-message">{error}</div>}
        {!isLoading && fileTree.length === 0 && !error && (
            <div className="placeholder">
                Load a repository to see its file structure here.
            </div>
        )}
        {fileTree.length > 0 && (
          <ErrorBoundary name="File Tree">
            <FileTree 
                files={filteredFileTree} 
                onFileClick={handleFileClick} 
                selectedPath={selectedFile?.path ?? null}
                searchTerm={searchTerm}
             />
             {searchTerm && filteredFileTree.length === 0 && (
                <div className="placeholder">No files found matching "{searchTerm}".</div>
            )}
          </ErrorBoundary>
        )}
      </Panel>

      <ErrorBoundary name="File Viewer">
        <FileViewer 
          file={selectedFile}
          isRepoLoaded={isRepoLoaded}
        />
      </ErrorBoundary>
      
      <ErrorBoundary name="Analysis Panel">
       <AnalysisPanel
        results={analysisResults}
        config={analysisConfig}
        setConfig={setAnalysisConfig}
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
