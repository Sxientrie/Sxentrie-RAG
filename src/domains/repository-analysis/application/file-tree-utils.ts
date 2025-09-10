/**
 * @file src/domains/repository-analysis/application/file-tree-utils.ts
 * @version 0.1.0
 * @description Utilities for processing and analyzing the repository file tree structure.
 *
 * @module RepositoryAnalysis.Application
 *
 * @summary This file provides shared utility functions for working with the file tree. It centralizes logic, such as collecting all analyzable files based on extensions and filenames, ensuring consistent file filtering across the application.
 *
 * @dependencies
 * - ../domain/repository
 *
 * @outputs
 * - Exports the `collectAllFiles` function.
 *
 * @changelog
 * - v0.1.0 (2025-09-08): File created and documented.
 */
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
