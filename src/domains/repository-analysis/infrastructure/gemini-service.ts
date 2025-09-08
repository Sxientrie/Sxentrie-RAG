/**
 * @file src/domains/repository-analysis/infrastructure/gemini-service.ts
 * @version 0.5.0
 * @description A service responsible for interacting with the application's backend API to perform code analysis and documentation generation.
 *
 * @module RepositoryAnalysis.Infrastructure
 *
 * @summary This service acts as the client-side interface to the secure backend endpoints. It constructs the necessary payloads, sends requests to the serverless functions for analysis and documentation, and processes the streaming responses to provide real-time progress updates to the UI. This architecture ensures that the Gemini API key remains secure on the server.
 *
 * @dependencies
 * - ../domain
 * - ../application/file-tree-utils
 * - ../../../../shared/config
 *
 * @outputs
 * - Exports the `runCodeAnalysis` and `generateDocumentation` functions.
 *
 * @changelog
 * - v0.5.0 (2025-09-11): Critical security refactor. Removed direct Gemini API calls and replaced them with secure calls to the backend serverless functions (/api/analyze, /api/document).
 * - v0.4.0 (2025-09-10): Added `severity` field to the technical review prompt and schema.
 * - v0.3.0 (2025-09-08): Refactored file collection logic to a shared utility for dynamic UI previews.
 * - v0.2.0 (2025-09-08): Added 'generateDocumentation' function and prompt for creating documentation.
 * - v0.1.0 (2025-09-08): File created and documented.
 */
import { GitHubFile, AnalysisConfig, ANALYSIS_SCOPES, AnalysisResults, ANALYSIS_MODES } from '../domain';
import { MAX_GEMINI_FILE_COUNT, MAX_GEMINI_FILE_SIZE, TRUNCATED_GEMINI_MESSAGE } from "../../../../shared/config";
import { collectAllFiles } from "../application/file-tree-utils";
import { GoogleGenAI, Type } from "@google/genai";

const API_KEY_STORAGE_KEY = 'sxentrie-api-key';

const getApiKey = (): string | null => {
    return localStorage.getItem(API_KEY_STORAGE_KEY);
};

const getFilesForRequest = (
  fileTree: GitHubFile[],
  config: AnalysisConfig,
  selectedFile: { path: string; content: string; isImage?: boolean } | null
): GitHubFile[] => {
  if (config.scope === ANALYSIS_SCOPES.FILE && selectedFile && !selectedFile.isImage) {
    const fileNode = collectAllFiles(fileTree).find(f => f.path === selectedFile.path);
    return fileNode ? [fileNode] : [];
  } else {
    const allFiles = collectAllFiles(fileTree);
    return config.mode === ANALYSIS_MODES.FAST
      ? allFiles.slice(0, MAX_GEMINI_FILE_COUNT)
      : allFiles;
  }
};

const fetchFileContents = async (files: GitHubFile[]): Promise<string> => {
  const fileContents = await Promise.all(
    files.map(async file => {
      if (!file.download_url) return '';
      try {
        const res = await fetch(file.download_url!);
        if (!res.ok) {
          console.warn(`Failed to fetch ${file.path}: ${res.statusText}`);
          return '';
        }
        const text = await res.text();
        const cappedText = text.length > MAX_GEMINI_FILE_SIZE ? text.substring(0, MAX_GEMINI_FILE_SIZE) + TRUNCATED_GEMINI_MESSAGE : text;
        return `--- File: ${file.path} ---\n${cappedText}`;
      } catch (e) {
        console.error(`Error fetching content for ${file.path}:`, e);
        return '';
      }
    })
  );
  return fileContents.filter(c => c).join('\n\n');
};

export const generateDocumentation = async (
  options: {
    repoName: string,
    fileTree: GitHubFile[],
    config: AnalysisConfig,
    selectedFile: { path: string; content: string; isImage?: boolean } | null,
    onProgress: (message: string) => void
  }
): Promise<string> => {
    const { repoName, fileTree, config, selectedFile, onProgress } = options;

    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("Gemini API key not found. Please set it in the Settings panel.");
    }

    onProgress('Initializing documentation engine');

    const files = getFilesForRequest(fileTree, config, selectedFile);
    if (files.length === 0) {
        throw new Error("No valid files found for documentation generation based on the current scope.");
    }
    
    onProgress('Fetching file contents...');
    const fileContentsString = await fetchFileContents(files);
    if (!fileContentsString.trim()) {
        throw new Error("Could not fetch content from any files. The repository might be empty or contain only unsupported file types.");
    }
    
    const prompt = `
        You are an expert technical writer and senior software engineer with deep knowledge of software architecture and documentation best practices.
        Your task is to generate clear, concise, and professional documentation for the provided codebase. Your analysis should be based ONLY on the provided code.
        **RULES & CONSTRAINTS:**
        1.  Your response MUST be in well-structured markdown.
        2.  If the provided context contains multiple files from a project, you MUST generate a project README.md. This README should include the following sections:
            -   A concise project summary.
            -   An inferred technology stack (languages, frameworks, key libraries).
            -   Instructions on how to set up and run the project, based on the file structure (e.g., package.json, requirements.txt).
        3.  If the provided context contains only a single file, you MUST generate a detailed file overview document. This document should include:
            -   A summary of the file's purpose and its primary responsibility within the larger project.
            -   A list of the key functions, components, or classes exported by the file, complete with docstrings explaining their parameters and return values.
            -   A description of the file's role in the overall application architecture.
        4.  Do NOT add any preamble, comments, or explanation before or after the markdown output. Your response MUST be ONLY the generated markdown document.
        ---
        **CODEBASE TO DOCUMENT:**
        ---
        ${fileContentsString}
    `;

    const ai = new GoogleGenAI({ apiKey });
    onProgress('Generating documentation...');

    const response = await ai.models.generateContent({
        model: config.model,
        contents: prompt,
        config: { temperature: 0.5 },
    });
    
    onProgress('Finalizing documentation...');
    return response.text;
};

export const runCodeAnalysis = async (
  options: {
    repoName: string,
    fileTree: GitHubFile[],
    config: AnalysisConfig,
    selectedFile: { path: string; content: string; isImage?: boolean } | null,
    onProgress: (message: string) => void
  }
): Promise<AnalysisResults> => {
    const { repoName, fileTree, config, selectedFile, onProgress } = options;
    
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("Gemini API key not found. Please set it in the Settings panel.");
    }

    onProgress('Initializing analysis engine');

    const files = getFilesForRequest(fileTree, config, selectedFile);
    if (files.length === 0) {
        throw new Error("No valid files found for analysis based on the current scope.");
    }

    onProgress('Fetching file contents...');
    const fileContentsString = await fetchFileContents(files);
    if (!fileContentsString.trim()) {
      throw new Error("Could not fetch content from any files. The repository might be empty or contain only unsupported file types.");
    }
    
    const ai = new GoogleGenAI({ apiKey });

    // --- PROMPT DEFINITIONS ---
    const isSingleFile = files.length === 1 && config.scope === ANALYSIS_SCOPES.FILE;
    const analysisTarget = isSingleFile ? `the file '${files[0].path}'` : `the '${repoName}' repository`;

    const overviewHeader = isSingleFile
        ? 'You are a senior software engineer tasked with explaining a code file to a new team member.\n\nYour task is to provide a concise, high-level summary of the single file provided.'
        : 'You are a senior software engineer tasked with explaining a project to a new team member.\n\nYour task is to provide a concise, high-level project overview suitable for a technical audience.';

    const overviewBody = isSingleFile
        ? 'Explain what the file does, its primary purpose, and its key components (e.g., functions, classes, logic based on the code).'
        : 'Explain what the project does, its primary purpose, and its key features based on the file contents.\nInfer and describe the technology stack (languages, frameworks, libraries).';

    const overviewPrompt = `
        ${overviewHeader}
        Your analysis should be based ONLY on the provided code from ${analysisTarget}.
        **RULES:**
        1.  Your response MUST be in well-structured markdown.
        2.  ${overviewBody}
        3.  Keep the summary to 2-3 paragraphs.
        4.  Do NOT add any preamble or explanation before the overview. Start directly with the analysis.
        ---
        **CODE:**
        ---
        ${fileContentsString}
      `;

    const reviewFocus = config.customRules
        ? `In addition to your standard analysis, the user has provided the following directives to guide your review: "${config.customRules}". Please prioritize these areas where applicable.`
        : 'Your focus is on providing a comprehensive, high-quality code review. Identify potential bugs, security vulnerabilities, performance bottlenecks, and areas for improved maintainability, readability, and adherence to best practices. Be as thorough and insightful as possible.';

    const reviewPrompt = `
        You are an expert code reviewer with a meticulous eye for detail. Your task is to perform a technical review of the provided code from ${analysisTarget}. ${reviewFocus}
        Your entire output must be a valid JSON array of 'Finding' objects. Each 'Finding' object must conform to the following schema:
        -   \`fileName\`: The full path of the file being reviewed.
        -   \`severity\`: A string indicating the issue's severity. Must be one of: "Critical", "High", "Medium", or "Low".
        -   \`finding\`: A concise title for the issue (e.g., "Unused State Variable," "Inefficient String Concatenation").
        -   \`explanation\`: An array of objects, where each object represents a step in the explanation. An object in this array must have:
            -   \`type\`: Either "text" or "code".
            -   \`content\`: The string content for the text or code block.
        -   \`startLine\`: (Optional) The starting line number of the code snippet the finding refers to.
        -   \`endLine\`: (Optional) The ending line number of the code snippet.
        **Instructions:**
        1.  For each issue you identify, structure your explanation as a logical narrative.
        2.  Begin with a piece of text that describes the problem and shows the problematic code snippet immediately after.
        3.  Follow up with text that explains the suggested fix, and then provide the corrected code snippet.
        4.  Ensure that the \`explanation\` array alternates between "text" and "code" types to create a clear, easy-to-follow review.
        5.  Your response MUST be ONLY the JSON array. Do not include any preamble, comments, or markdown formatting outside of the JSON structure itself.
        6.  If you find no issues, return an empty JSON array: [].
        7.  Assign a \`severity\` based on the potential impact: "Critical" for security vulnerabilities or major bugs, "High" for performance issues or significant logical errors, "Medium" for deviations from best practices, and "Low" for stylistic suggestions or minor issues.
        ---
        **CODE:**
        ---
        ${fileContentsString}
      `;

    const reviewSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                fileName: { type: Type.STRING },
                severity: { type: Type.STRING },
                finding: { type: Type.STRING },
                explanation: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING },
                            content: { type: Type.STRING },
                        },
                        required: ["type", "content"],
                    },
                },
                startLine: { type: Type.NUMBER },
                endLine: { type: Type.NUMBER },
            },
            required: ["fileName", "severity", "finding", "explanation"],
        },
    };

    onProgress('Phase 1/2: Generating Project Overview...');
    const overviewResponse = await ai.models.generateContent({ model: config.model, contents: overviewPrompt, config: { temperature: 0.5 } });
    const overviewText = overviewResponse.text;

    onProgress('Phase 2/2: Performing Technical Review...');
    const reviewResponse = await ai.models.generateContent({
        model: config.model,
        contents: reviewPrompt,
        config: { temperature: 0.2, responseMimeType: "application/json", responseSchema: reviewSchema }
    });
    
    onProgress('Finalizing analysis...');
    const reviewText = reviewResponse.text.trim();
    const reviewJson = JSON.parse(reviewText);

    return { overview: overviewText, review: reviewJson };
};
