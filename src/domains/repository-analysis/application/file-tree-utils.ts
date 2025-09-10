import { GitHubFile } from '../domain/repository';
import { AllowedExtensions, SpecificFilenames, IgnoredPatterns } from '../../../../shared/config';
export const collectAllFiles = (nodes: GitHubFile[]): GitHubFile[] => {
  let files: GitHubFile[] = [];
  for (const node of nodes) {
    if (node.type === 'file' && node.download_url) {
      const fileName = node.name.toLowerCase();
      const extension = fileName.split('.').pop();
      const isAllowedExtension = extension && AllowedExtensions.has(extension);
      const isSpecificFilename = SpecificFilenames.has(fileName);
      const isIgnored = IgnoredPatterns.some(pattern => pattern.test(fileName));
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
