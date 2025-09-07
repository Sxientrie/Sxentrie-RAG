export interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url: string | null;
  content?: GitHubFile[];
}

export interface RepoInfo {
  owner: string;
  repo: string;
}
