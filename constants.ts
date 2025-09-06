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

export enum ANALYSIS_SCOPES {
    ALL = 'all',
    FILE = 'file',
}

export enum ANALYSIS_TABS {
    OVERVIEW = 'overview',
    REVIEW = 'review',
}

export interface AnalysisConfig {
  customRules: string;
  scope: ANALYSIS_SCOPES;
}

export interface ExplanationStep {
  type: 'text' | 'code';
  content: string;
}

export interface TechnicalReviewFinding {
  fileName: string;
  finding: string;
  explanation: ExplanationStep[];
}

export interface AnalysisResults {
  overview: string;
  review: TechnicalReviewFinding[];
}

export interface CodeMetric {
  fileName: string;
  linesOfCode: number;
  cyclomaticComplexity: number;
}

export const GEMINI_MODEL_NAME = 'gemini-2.5-flash';
