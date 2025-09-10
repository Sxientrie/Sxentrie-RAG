import React, { FC, useState, useEffect, useMemo, useCallback } from "react";
import { GitHubFile } from "../domain";
import {
    File, Folder, ChevronRight, FileCode2, FileJson, FileText, Image as ImageIcon, FileCog, ShieldBan,
    Lock, FileBox, FileCode, FileType
} from 'lucide-react';
import { useRepository } from "../application/repository-context";
import { Search, X } from 'lucide-react';
import { ErrorBoundary } from "../../../../shared/ui/error-boundary";
import {
    UI_DEBOUNCE_DELAY_MS, ICON_SIZE_XS, ICON_SIZE_SM, ImageFileRegex, Gitignore, Lockfile, DockerCompose,
    AriaLabelSelectDirectoryTemplate, AriaLabelSelectFileTemplate, PlaceholderSearchFiles, AriaLabelSearchFiles,
    AriaLabelClearSearch, ErrorBoundaryFileTreeName, NoFilesFoundTemplate
} from "../../../../shared/config";
import { SpecificFilenames } from "../../../../shared/config";
const getFileIcon = (fileName: string): JSX.Element => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const lowerCaseFileName = fileName.toLowerCase();
    if (ImageFileRegex.test(fileName)) {
        return <ImageIcon size={ICON_SIZE_XS} />;
    }
    if (lowerCaseFileName === Gitignore) {
        return <ShieldBan size={ICON_SIZE_XS} />;
    }
    if (lowerCaseFileName.endsWith(Lockfile)) {
        return <Lock size={ICON_SIZE_XS} />;
    }
    if (SpecificFilenames.has(lowerCaseFileName) || lowerCaseFileName.startsWith(DockerCompose)) {
        return <FileBox size={ICON_SIZE_XS} />;
    }
    switch (extension) {
        case 'js':
        case 'ts':
        case 'jsx':
        case 'tsx':
        case 'py':
        case 'go':
        case 'rb':
        case 'php':
        case 'java':
        case 'cs':
        case 'rs':
        case 'sh':
            return <FileCode2 size={ICON_SIZE_XS} />;
        case 'json':
            return <FileJson size={ICON_SIZE_XS} />;
        case 'md':
        case 'txt':
            return <FileText size={ICON_SIZE_XS} />;
        case 'yml':
        case 'yaml':
            return <FileCog size={ICON_SIZE_XS} />;
        case 'html':
            return <FileCode size={ICON_SIZE_XS} />;
        case 'css':
        case 'scss':
            return <FileType size={ICON_SIZE_XS} />;
        default:
            return <File size={ICON_SIZE_XS} />;
    }
};
interface TreeItemProps {
    item: GitHubFile;
    onFileClick: (file: GitHubFile) => void;
    selectedPath: string | null;
    openDirs: Set<string>;
    onToggle: (path: string) => void;
    searchTerm: string;
    analysisPreviewPaths: Set<string>;
}
const TreeItem: FC<TreeItemProps> = ({ item, onFileClick, selectedPath, openDirs, onToggle, searchTerm, analysisPreviewPaths }) => {
    const isDir = item.type === 'dir';
    const isOpen = !!searchTerm.trim() || openDirs.has(item.path);
    const isAnalysisTarget = item.type === 'file' && analysisPreviewPaths.has(item.path);
    const classNames = ['tree-item'];
    if (selectedPath === item.path) classNames.push('selected');
    if (isAnalysisTarget) classNames.push('analysis-target');
    const handleItemClick = () => {
        if (isDir) {
            onToggle(item.path);
        } else {
            onFileClick(item);
        }
    };
    return (
        <li>
            <div
                className={classNames.join(' ')}
                onClick={handleItemClick}
                role="button"
                tabIndex={0}
                aria-label={isDir ? AriaLabelSelectDirectoryTemplate.replace('{0}', item.name) : AriaLabelSelectFileTemplate.replace('{0}', item.name)}
                data-path={item.path}
            >
                {isDir ? <ChevronRight size={ICON_SIZE_XS} className={`tree-item-icon ${isOpen ? 'open' : ''}`} /> : <span className="tree-item-spacer"></span>}
                {isDir ? <Folder size={ICON_SIZE_XS} /> : getFileIcon(item.name)}
                <span>{item.name}</span>
            </div>
            {isDir && isOpen && item.content && (
                <ul className="tree-indentation">
                  {item.content.map(child => (
                      <TreeItem
                        key={child.path}
                        item={child}
                        onFileClick={onFileClick}
                        selectedPath={selectedPath}
                        openDirs={openDirs}
                        onToggle={onToggle}
                        searchTerm={searchTerm}
                        analysisPreviewPaths={analysisPreviewPaths}
                      />
                  ))}
                </ul>
            )}
        </li>
    );
};
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
export const FileTree: FC = () => {
  const { state, dispatch, handleFileClick } = useRepository();
  const { fileTree, selectedFile, searchTerm, analysisPreviewPaths } = state;
  const [openDirs, setOpenDirs] = useState<Set<string>>(new Set());
  const filteredFileTree = useMemo(() => filterFileTree(fileTree, searchTerm), [fileTree, searchTerm]);
  const selectedPath = selectedFile?.path ?? null;
  useEffect(() => {
    if (selectedPath) {
        const pathParts = selectedPath.split('/');
        const parentPaths = pathParts.slice(0, -1).map((_, index) => {
            return pathParts.slice(0, index + 1).join('/');
        });
        setOpenDirs(prev => {
            const newDirs = new Set(prev);
            parentPaths.forEach(p => newDirs.add(p));
            return newDirs;
        });
        setTimeout(() => {
            const selectedElement = document.querySelector(`[data-path="${selectedPath}"]`);
            if (selectedElement) {
                selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, UI_DEBOUNCE_DELAY_MS);
    }
  }, [selectedPath]);
  const handleToggle = useCallback((path: string) => {
      setOpenDirs(prevOpenDirs => {
          const newOpenDirs = new Set(prevOpenDirs);
          if (newOpenDirs.has(path)) {
              newOpenDirs.delete(path);
          } else {
              newOpenDirs.add(path);
          }
          return newOpenDirs;
      });
  }, []);
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_SEARCH_TERM', payload: e.target.value });
  }, [dispatch]);
  const handleClearSearch = useCallback(() => {
    dispatch({ type: 'SET_SEARCH_TERM', payload: '' });
  }, [dispatch]);
  return (
    <div className="file-tree-container">
      <div className="file-search-area">
        <div className="file-search-input-wrapper">
          <Search size={ICON_SIZE_XS} />
          <input
            type="text"
            className="file-search-input"
            placeholder={PlaceholderSearchFiles}
            value={searchTerm}
            onChange={handleSearchChange}
            disabled={fileTree.length === 0}
            aria-label={AriaLabelSearchFiles}
          />
          {searchTerm && (
            <button
              className="file-search-clear-btn"
              onClick={handleClearSearch}
              aria-label={AriaLabelClearSearch}
            >
              <X size={ICON_SIZE_SM} />
            </button>
          )}
        </div>
      </div>
      <div className="file-tree-scroll-area">
        {fileTree.length > 0 && (
          <ErrorBoundary name={ErrorBoundaryFileTreeName}>
            <ul className="file-tree">
              {filteredFileTree.map(file => (
                <TreeItem
                  key={file.path}
                  item={file}
                  onFileClick={handleFileClick}
                  selectedPath={selectedPath}
                  openDirs={openDirs}
                  onToggle={handleToggle}
                  searchTerm={searchTerm}
                  analysisPreviewPaths={analysisPreviewPaths}
                />
              ))}
            </ul>
            {searchTerm && filteredFileTree.length === 0 && (<div className="placeholder">{NoFilesFoundTemplate.replace('{0}', searchTerm)}</div>)}
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
};
