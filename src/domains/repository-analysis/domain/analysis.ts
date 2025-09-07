export enum ANALYSIS_SCOPES {
    ALL = 'all',
    FILE = 'file',
}

export enum GEMINI_MODELS {
    PRO = 'gemini-2.5-flash',
}

export enum ANALYSIS_TABS {
    OVERVIEW = 'overview',
    REVIEW = 'review',
}

export interface AnalysisConfig {
  customRules: string;
  scope: ANALYSIS_SCOPES;
  model: GEMINI_MODELS;
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
