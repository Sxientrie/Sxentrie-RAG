/**
 * @file src/domains/repository-analysis/domain/repository.ts
 * @version 0.1.0
 * @description Defines TypeScript interfaces for the repository domain model.
 *
 * @module RepositoryAnalysis.Domain
 *
 * @summary This file contains the core data structures that represent a repository's information. It defines the shape of a `GitHubFile` (for the file tree) and `RepoInfo` (for owner and repo name), ensuring type safety throughout the application.
 *
 * @dependencies
 * - None
 *
 * @outputs
 * - Exports `GitHubFile` and `RepoInfo` interfaces.
 *
 * @changelog
 * - v0.1.0 (2025-09-08): File created and documented.
 */
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