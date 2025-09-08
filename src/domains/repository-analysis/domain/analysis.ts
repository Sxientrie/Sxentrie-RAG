/**
 * @file src/domains/repository-analysis/domain/analysis.ts
 * @version 0.2.0
 * @description Defines TypeScript types, enums, and interfaces for the analysis domain model.
 *
 * @module RepositoryAnalysis.Domain
 *
 * @summary This file contains the core data structures related to the code analysis feature. It defines enums for configuration options (scopes, models), and interfaces for the analysis configuration (`AnalysisConfig`) and the structured analysis results (`AnalysisResults`, `TechnicalReviewFinding`).
 *
 * @dependencies
 * - None
 *
 * @outputs
 * - Exports various enums and interfaces related to code analysis.
 *
 * @changelog
 * - v0.2.0 (2025-09-10): Added `severity` to TechnicalReviewFinding.
 * - v0.1.0 (2025-09-08): File created and documented.
 */
export enum ANALYSIS_SCOPES {
    ALL = 'all',
    FILE = 'file',
}

export enum GEMINI_MODELS {
    FLASH = 'gemini-2.5-flash',
    PRO = 'gemini-2.5-pro',
}

export enum ANALYSIS_TABS {
    OVERVIEW = 'overview',
    REVIEW = 'review',
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