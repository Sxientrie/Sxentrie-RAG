// Fix: Corrected the import path. AnalysisConfig, ANALYSIS_SCOPES, and ANALYSIS_MODES are exported from the domain's barrel file ('../domain/index.ts').
import { GitHubFile, AnalysisConfig, ANALYSIS_SCOPES, ANALYSIS_MODES } from '../domain';
import { AllowedExtensions, SpecificFilenames, IgnoredPatterns, MAX_GEMINI_FILE_COUNT } from '../../../../shared/config';

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

const globToRegex = (glob: string): RegExp => {
  let regex = '';
  const parts = glob.split('**');
  for (let i = 0; i < parts.length; i++) {
    let part = parts[i];
    part = part.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    part = part.replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
    regex += part;
    if (i < parts.length - 1) {
      regex += '.*';
    }
  }
  return new RegExp('^' + regex + '$');
};

const parsePatterns = (patternsStr: string): RegExp[] => {
  if (!patternsStr || !patternsStr.trim()) return [];
  return patternsStr
    .split(',')
    .map(p => p.trim())
    .filter(Boolean)
    .map(globToRegex);
};

export const getFilesForAnalysis = (options: {
  fileTree: GitHubFile[];
  config: AnalysisConfig;
  selectedFile: { path: string } | null;
}): GitHubFile[] => {
  const { fileTree, config, selectedFile } = options;

  if (config.scope === ANALYSIS_SCOPES.FILE && selectedFile) {
    const allFiles = collectAllFiles(fileTree);
    const fileNode = allFiles.find(f => f.path === selectedFile.path);
    return fileNode ? [fileNode] : [];
  }

  const allFiles = collectAllFiles(fileTree);
  const includePatterns = parsePatterns(config.includePatterns);
  const excludePatterns = parsePatterns(config.excludePatterns);

  let filteredFiles: GitHubFile[];

  if (includePatterns.length > 0) {
    filteredFiles = allFiles.filter(file =>
      includePatterns.some(regex => regex.test(file.path))
    );
  } else {
    filteredFiles = allFiles;
  }

  if (excludePatterns.length > 0) {
    filteredFiles = filteredFiles.filter(file =>
      !excludePatterns.some(regex => regex.test(file.path))
    );
  }

  return config.mode === ANALYSIS_MODES.FAST
    ? filteredFiles.slice(0, MAX_GEMINI_FILE_COUNT)
    : filteredFiles;
};
