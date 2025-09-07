import React, { FC, useState, useEffect, useMemo } from "react";
import { GitHubFile } from "../domain";
import {
    File,
    Folder,
    ChevronRight,
    FileCode2,
    FileJson,
    FileText,
    Image as ImageIcon,
    FileCog,
    ShieldBan,
    Lock,
    FileBox,
    FileCode,
    FileType
} from 'lucide-react';
import { useRepository } from "../application/repository-context";
import { Search, X } from 'lucide-react';
import { ErrorBoundary } from "../../../../shared/ui/error-boundary";

const getFileIcon = (fileName: string): JSX.Element => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const lowerCaseFileName = fileName.toLowerCase();

    if (/\.(png|jpe?g|gif|webp|svg|ico)$/i.test(fileName)) {
        return <ImageIcon size={12} />;
    }
    if (lowerCaseFileName === '.gitignore') {
        return <ShieldBan size={12} />;
    }
    if (lowerCaseFileName.endsWith('.lock')) {
        return <Lock size={12} />;
    }
    if (lowerCaseFileName === 'dockerfile' || lowerCaseFileName.startsWith('docker-compose')) {
        return <FileBox size={12} />;
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
            return <FileCode2 size={12} />;
        case 'json':
            return <FileJson size={12} />;
        case 'md':
        case 'txt':
            return <FileText size={12} />;
        case 'yml':
        case 'yaml':
            return <FileCog size={12} />;
        case 'html':
            return <FileCode size={12} />;
        case 'css':
        case 'scss':
            return <FileType size={12} />;
        default:
            return <File size={12} />;
    }
};

interface TreeItemProps {
    item: GitHubFile;
    onFileClick: (file: GitHubFile) => void;
    selectedPath: string | null;
    openDirs: Set<string>;
    onToggle: (path: string) => void;
    searchTerm: string;
}

const TreeItem: FC<TreeItemProps> = ({ item, onFileClick, selectedPath, openDirs, onToggle, searchTerm }) => {
    const isDir = item.type === 'dir';
    const isOpen = !!searchTerm.trim() || openDirs.has(item.path);

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
                className={`tree-item ${selectedPath === item.path ? 'selected' : ''}`}
                onClick={handleItemClick}
                role="button"
                tabIndex={0}
                aria-label={`Select ${isDir ? 'directory' : 'file'} ${item.name}`}
                data-path={item.path}
            >
                {isDir ? <ChevronRight size={12} className={`tree-item-icon ${isOpen ? 'open' : ''}`} /> : <span className="tree-item-spacer"></span>}
                {isDir ? <Folder size={12} /> : getFileIcon(item.name)}
                <span>{item.name}</span>
            </div>
            {isDir && isOpen && item.content && (
                <div className="tree-indentation">
                  {item.content.map(child => (
                      <TreeItem 
                        key={child.path} 
                        item={child} 
                        onFileClick={onFileClick} 
                        selectedPath={selectedPath}
                        openDirs={openDirs}
                        onToggle={onToggle}
                        searchTerm={searchTerm}
                      />
                  ))}
                </div>
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
  const { fileTree, selectedFile, searchTerm } = state;
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
        
        // Wait for the state update to re-render and reveal the element
        setTimeout(() => {
            // Use the more reliable data-path attribute for selection
            const selectedElement = document.querySelector(`[data-path="${selectedPath}"]`);
            if (selectedElement) {
                selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 100);
    }
  }, [selectedPath]);

  const handleToggle = (path: string) => {
      setOpenDirs(prevOpenDirs => {
          const newOpenDirs = new Set(prevOpenDirs);
          if (newOpenDirs.has(path)) {
              newOpenDirs.delete(path);
          } else {
              newOpenDirs.add(path);
          }
          return newOpenDirs;
      });
  };

  return (
    <>
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
          {searchTerm && (
              <button
                  className="file-search-clear-btn"
                  onClick={() => dispatch({ type: 'SET_SEARCH_TERM', payload: '' })}
                  aria-label="Clear search term"
              >
                  <X size={14} />
              </button>
          )}
      </div>
      {fileTree.length > 0 && (
          <ErrorBoundary name="File Tree">
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
                    />
                ))}
              </ul>
              {searchTerm && filteredFileTree.length === 0 && (<div className="placeholder">No files found matching "{searchTerm}".</div>)}
          </ErrorBoundary>
      )}
    </>
  );
};