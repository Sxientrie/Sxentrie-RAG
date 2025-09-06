import React, { FC, useState } from "react";
import { GitHubFile } from "../constants";
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

const styleSheet = `
ul.file-tree {
  list-style: none;
  padding-left: 0;
  margin: 0;
  overflow: hidden;
}
.file-tree li {
  padding: 0;
}
.tree-item {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 2px 5px;
  border: 1px solid transparent;
  border-radius: calc(var(--radius) - 4px);
  transition: background-color 0.2s, color 0.2s, border-color 0.2s;
  color: var(--muted-foreground);
  user-select: none;
}
.tree-item:hover {
  background-color: oklch(100% 0 0 / 0.05);
}
.tree-item.selected {
    background-color: oklch(65% 0.12 145 / 0.2);
    color: var(--primary);
    border-color: var(--primary);
}
.tree-item-icon {
  transition: transform 0.2s ease-in-out;
}
.tree-item-icon.open {
  transform: rotate(90deg);
}
.tree-item span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.85rem;
}
`;

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
    const isOpen = searchTerm.trim() ? true : openDirs.has(item.path);

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
            >
                {isDir ? <ChevronRight size={12} className={`tree-item-icon ${isOpen ? 'open' : ''}`} /> : <div style={{width: '12px'}}></div>}
                {isDir ? <Folder size={12} /> : getFileIcon(item.name)}
                <span>{item.name}</span>
            </div>
            {isDir && isOpen && item.content && (
                <div style={{ paddingLeft: '20px' }}>
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


export const FileTree: FC<{ 
    files: GitHubFile[]; 
    onFileClick: (file: GitHubFile) => void; 
    selectedPath: string | null;
    searchTerm: string;
}> = ({ files, onFileClick, selectedPath, searchTerm }) => {
  const [openDirs, setOpenDirs] = useState<Set<string>>(new Set());

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
      <style>{styleSheet}</style>
      <ul className="file-tree">
        {files.map(file => (
            <TreeItem 
                key={file.path} 
                item={file} 
                onFileClick={onFileClick} 
                selectedPath={selectedPath}
                openDirs={openDirs}
                onToggle={handleToggle}
                searchTerm={searchTerm}
            />
        ))}
      </ul>
    </>
  );
};
