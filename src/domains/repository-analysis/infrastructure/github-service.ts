import { GitHubFile, RepoInfo } from '../domain';
import { ApiError } from '../../../../shared/errors/api-error';
import {
    ErrorRepositoryNotFound,
    ErrorGitHubApiRateLimitExceeded,
    ErrorGitHubApi,
    ErrorCouldNotDetermineDefaultBranch,
    ErrorDefaultBranchNotFound,
} from '../../../../shared/config';
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
/**
 * Parses a GitHub repository URL to extract the owner and repository name.
 * 
 * @param url - The GitHub repository URL (e.g. 'https://github.com/owner/repo')
 * @returns An object containing the owner and repo name, or null if the URL is invalid.
 */
export const parseGitHubUrl = (url: string): RepoInfo | null => {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (match) {
    return { owner: match[1], repo: match[2].replace('.git', '') };
  }
  return null;
};

/**
 * Fetches the recursive file tree of a GitHub repository branch.
 * 
 * @param owner - The owner of the GitHub repository
 * @param repo - The name of the GitHub repository
 * @returns A promise resolving to a tree structure representing the files and directories.
 * @throws ApiError if the repository is not found or the rate limit is exceeded.
 */
export const fetchRepoTree = async (owner: string, repo: string): Promise<GitHubFile[]> => {
  const repoDetailsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
  if (!repoDetailsResponse.ok) {
    if (repoDetailsResponse.status === 404) throw new ApiError(ErrorRepositoryNotFound);
    if (repoDetailsResponse.status === 403) throw new ApiError(ErrorGitHubApiRateLimitExceeded);
    throw new ApiError(ErrorGitHubApi.replace('{0}', repoDetailsResponse.statusText));
  }
  const repoDetails = await repoDetailsResponse.json();
  const defaultBranch = repoDetails.default_branch;
  if (!defaultBranch) {
    throw new ApiError(ErrorCouldNotDetermineDefaultBranch);
  }
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`);
  if (!response.ok) {
    if (response.status === 404) throw new ApiError(ErrorDefaultBranchNotFound.replace('{0}', defaultBranch));
    if (response.status === 403) throw new ApiError(ErrorGitHubApiRateLimitExceeded);
    throw new ApiError(ErrorGitHubApi.replace('{0}', response.statusText));
  }
  const { tree } = await response.json();
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
            download_url: isLastPart && file.type === 'blob' ? `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${file.path}` : null,
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
      })).sort((a, b) => (a.type === 'dir' ? -1 : 1) - (b.type === 'dir' ? -1 : 1) || a.name.localeCompare(b.name));
    };
    return toArray(root);
  };
  return buildFileTree(tree);
};
