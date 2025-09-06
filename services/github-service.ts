import { GitHubFile, RepoInfo } from '../constants';
import { ApiError } from '../errors/api-error';

interface GitHubTreeItem {
    path: string;
    type: 'blob' | 'tree' | 'commit';
    sha: string;
    url: string;
}

interface FileTreeNode {
    name: string;
    path: string;
    type: 'file' | 'dir';
    download_url: string | null;
    content: { [key: string]: FileTreeNode };
}


export const parseGitHubUrl = (url: string): RepoInfo | null => {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (match) {
    return { owner: match[1], repo: match[2].replace('.git', '') };
  }
  return null;
};

export const fetchRepoTree = async (owner: string, repo: string): Promise<GitHubFile[]> => {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`);
    if (!response.ok) {
        if (response.status === 404) throw new ApiError('Repository not found or the main branch does not exist.');
        if (response.status === 403) throw new ApiError('GitHub API rate limit exceeded. Please wait a few minutes and try again.');
        throw new ApiError(`GitHub API Error: ${response.statusText}`);
    }
    const { tree, truncated } = await response.json();

    if (truncated) {
        console.warn('File tree is truncated. Some files may not be displayed.');
    }
    
    const buildFileTree = (files: GitHubTreeItem[]): GitHubFile[] => {
        const root: { [key: string]: FileTreeNode } = {};
        files.forEach(file => {
            if (file.type !== 'blob' && file.type !== 'tree') return;

            let currentLevel: { [key: string]: FileTreeNode } = root;
            const pathParts = file.path.split('/');
            
            pathParts.forEach((part, index) => {
                if (!currentLevel[part]) {
                    const isLastPart = index === pathParts.length - 1;
                    currentLevel[part] = {
                        name: part,
                        path: file.path,
                        type: isLastPart ? (file.type === 'tree' ? 'dir' : 'file') : 'dir',
                        download_url: isLastPart && file.type === 'blob' ? `https://raw.githubusercontent.com/${owner}/${repo}/main/${file.path}` : null,
                        content: {}
                    };
                }
                if (currentLevel[part].type === 'dir') {
                    currentLevel = currentLevel[part].content;
                }
            });
        });

        const toArray = (nodes: { [key: string]: FileTreeNode }): GitHubFile[] => {
            return Object.values(nodes).map(node => ({
                ...node,
                content: node.type === 'dir' ? toArray(node.content) : undefined,
            })).sort((a,b) => (a.type === 'dir' ? -1 : 1) - (b.type === 'dir' ? -1 : 1) || a.name.localeCompare(b.name));
        };
        return toArray(root);
    };

    return buildFileTree(tree);
};
