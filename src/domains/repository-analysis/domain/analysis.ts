export enum ANALYSIS_SCOPES {
    ALL = 'all',
    FILE = 'file',
}
export enum GEMINI_MODELS {
    FLASH = 'gemini-2.5-flash',
    PRO = 'gemini-2.5-pro',
}
export enum ANALYSIS_TABS {
    EDITOR = 'Editor',
    OVERVIEW = 'Project Overview',
    REVIEW = 'Technical Review',
}
export enum ANALYSIS_MODES {
  FAST = 'fast',
  DEEP = 'deep',
}
export interface AnalysisConfig {
  customRules: string;
  scope: ANALYSIS_SCOPES;
  model: GEMINI_MODELS;
  mode: ANALYSIS_MODES;
  includePatterns: string;
  excludePatterns: string;
}
export interface ExplanationStep {
  type: 'text' | 'code';
  content: string;
}
export type SeverityLevel = "Critical" | "High" | "Medium" | "Low";
export interface TechnicalReviewFinding {
  fileName: string;
  severity: SeverityLevel;
  finding: string;
  explanation: ExplanationStep[];
  startLine?: number;
  endLine?: number;
}
export interface AnalysisResults {
  overview: string;
  review: TechnicalReviewFinding[];
}