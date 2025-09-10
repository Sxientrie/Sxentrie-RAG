import { GitHubFile } from '../domain/repository';
const ALLOWED_EXTENSIONS = new Set(['js', 'ts', 'py', 'go', 'java', 'html', 'css', 'md', 'json', 'jsx', 'tsx', 'sh', 'yml', 'yaml', 'rb', 'php', 'c', 'cpp', 'cs', 'rs']);
const SPECIFIC_FILENAMES = new Set(['dockerfile']);
const IGNORED_PATTERNS = [/\.min\.js$/i, /\.lock$/i];
export const collectAllFiles = (nodes: GitHubFile[]): GitHubFile[] => {
  let files: GitHubFile[] = [];
  for (const node of nodes) {
    if (node.type === 'file' && node.download_url) {
      const fileName = node.name.toLowerCase();
      const extension = fileName.split('.').pop();
      const isAllowedExtension = extension && ALLOWED_EXTENSIONS.has(extension);
      const isSpecificFilename = SPECIFIC_FILENAMES.has(fileName);
      const isIgnored = IGNORED_PATTERNS.some(pattern => pattern.test(fileName));
      if ((isAllowedExtension || isSpecificFilename) && !isIgnored) {
        files.push(node);
      }
    }
    if (node.content) {
      files = files.concat(collectAllFiles(node.content));
    }
  }
  return files;
};
