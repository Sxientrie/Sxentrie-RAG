/**
 * @file src/domains/repository-analysis/infrastructure/gemini-service.ts
 * @version 0.8.0
 * @description A service responsible for interacting with the Gemini API on the client-side to perform code analysis and documentation generation.
 *
 * @module RepositoryAnalysis.Infrastructure
 *
 * @summary This service orchestrates client-side calls to the Google Gemini API. It retrieves the user-provided API key from local storage, fetches file contents, constructs detailed prompts, and manages the streaming responses to provide real-time "thought" progress updates to the UI. This architecture is designed for static hosting environments like GitHub Pages.
 *
 * @dependencies
 * - @google/genai
 * - ../domain
 * - ../application/file-tree-utils
 * - ../../../../shared/config
 * - ../../../../shared/errors/api-key-error
 * - ./thought-stream-parser
 *
 * @outputs
 * - Exports the `runCodeAnalysis` and `generateDocumentation` functions.
 *
 * @changelog
 * - v0.8.0 (2025-09-13): Fixed a bug where the thought stream would stall during the "Technical Review" phase. Enabled `thinkingConfig` for the review API call and refactored stream processing to correctly handle thoughts for both analysis phases.
 * - v0.7.0 (2025-09-12): Reverted to a full client-side implementation to support static hosting (e.g., GitHub Pages). API key is now read from localStorage.
 * - v0.6.0 (2025-09-12): Implemented secure calls to backend serverless functions (/api/analyze, /api/document), enabling streaming thought process and removing client-side API key handling.
 * - v0.5.0 (2025-09-11): Critical security refactor. Removed direct Gemini API calls and replaced them with secure calls to the backend serverless functions (/api/analyze, /api/document).
 * - v0.4.0 (2025-09-10): Added `severity` field to the technical review prompt and schema.
 * - v0.3.0 (2025-09-08): Refactored file collection logic to a shared utility for dynamic UI previews.
 * - v0.2.0 (2025-09-08): Added 'generateDocumentation' function and prompt for creating documentation.
 * - v0.1.0 (2025-09-08): File created and documented.
 */
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { GitHubFile, AnalysisConfig, ANALYSIS_SCOPES, AnalysisResults, ANALYSIS_MODES } from '../domain';
import { MAX_GEMINI_FILE_COUNT, MAX_GEMINI_FILE_SIZE, TRUNCATED_GEMINI_MESSAGE } from "../../../../shared/config";
import { collectAllFiles } from "../application/file-tree-utils";
import { ApiKeyError } from '../../../../shared/errors/api-key-error';
import { ThoughtStreamParser } from './thought-stream-parser';

const API_KEY_STORAGE_KEY = 'sxentrie-api-key';

/**
 * Helper to process a Gemini stream, extracting thoughts for progress updates.
 * @param stream The stream from ai.models.generateContentStream.
 * @param parser The instance of ThoughtStreamParser.
 * @param onProgress Callback to send progress updates to the UI.
 * @returns The final concatenated text from the stream's primary output.
 */
async function processStreamWithThoughts(
  stream: AsyncGenerator<GenerateContentResponse>,
  parser: ThoughtStreamParser,
  onProgress: (message: string) => void
): Promise<string> {
  let accumulatedText = '';
  for await (const chunk of stream) {
    let hasNewThought = false;
    // The 'thought' is often in a separate part within the same chunk candidate
    if (chunk.candidates?.[0]?.content?.parts) {
      for (const part of chunk.candidates[0].content.parts) {
        if (part.thought && part.text) {
          parser.addChunk(part.text);
          hasNewThought = true;
        } else if (part.text) {
          accumulatedText += part.text;
        }
      }
    } else {
      // Fallback for simpler stream structures without explicit parts
      accumulatedText += chunk.text;
    }

    if (hasNewThought) {
      onProgress(parser.getLatestSummary());
    }
  }
  return accumulatedText;
}


const getApiKey = (): string => {
  const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
  if (!apiKey || !apiKey.trim()) {
    throw new ApiKeyError("Gemini API key not found. Please set it in the Settings panel.");
  }
  return apiKey;
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

const fetchFileContentsForAnalysis = async (files: GitHubFile[]): Promise<string> => {
  const fileContents = await Promise.all(
    files.map(async file => {
      if (!file.download_url) return '';
      try {
        const res = await fetch(file.download_url);
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
    const ai = new GoogleGenAI({ apiKey });

    onProgress('Initializing documentation engine...');
    const files = getFilesForRequest(fileTree, config, selectedFile);
    if (files.length === 0) {
        throw new Error("No valid files found for documentation generation based on the current scope.");
    }
    
    onProgress('Fetching file contents for documentation...');
    const fileContentsString = await fetchFileContentsForAnalysis(files);
     if (!fileContentsString.trim()) {
        throw new Error("Could not fetch content from any files. The repository might be empty or contain only unsupported file types.");
    }

    const documentationPrompt = `
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

    const modelConfig = { temperature: 0.5 };
    
    onProgress('Generating documentation...');
    const resultStream = await ai.models.generateContentStream({
        model: config.model,
        contents: documentationPrompt,
        config: modelConfig,
    });
    
    let accumulatedDoc = '';
    for await (const chunk of resultStream) {
        const chunkText = chunk.text;
        if (chunkText) {
            accumulatedDoc += chunkText;
            onProgress(`Receiving documentation... (${(accumulatedDoc.length / 1024).toFixed(1)} KB)`);
        }
    }

    onProgress('Finalizing documentation...');
    return accumulatedDoc;
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
    const ai = new GoogleGenAI({ apiKey });

    onProgress('Initializing analysis engine...');
    const files = getFilesForRequest(fileTree, config, selectedFile);
    if (files.length === 0) {
        throw new Error("No valid files found for analysis based on the current scope.");
    }

    onProgress('Fetching file contents for analysis...');
    const fileContentsString = await fetchFileContentsForAnalysis(files);
    if (!fileContentsString.trim()) {
        throw new Error("Could not fetch content from any files. The repository might be empty or contain only unsupported file types.");
    }

    const isSingleFile = files.length === 1 && config.scope === ANALYSIS_SCOPES.FILE;

    const overviewPrompt = isSingleFile
      ? `
        You are a senior software engineer tasked with explaining a code file to a new team member.
        Your analysis should be based ONLY on the provided code from the file '${files[0].path}'.
        **RULES:**
        1.  Your response MUST be in well-structured markdown, following the exact structure below.
        2.  Do NOT add any preamble or explanation before or after the markdown.
        ---
        ### File Analysis: ${files[0].name}

        ## Summary
        (Provide a 1-2 paragraph summary of the file's purpose, its primary responsibility, and its role within a potential larger project.)

        #### Core Responsibilities
        - (List the key responsibilities of this file as bullet points.)

        #### Key Components
        - (List the main functions, classes, or components defined in this file and briefly describe what each one does.)
        ---
        **CODE:**
        ---
        ${fileContentsString}
      `
      : `
        You are a senior software engineer tasked with explaining a project to a new team member.
        Your task is to provide a concise, high-level project overview based ONLY on the provided code from the '${repoName}' repository.
        **RULES:**
        1.  Your response MUST be in well-structured markdown, following the exact structure below.
        2.  Do NOT add any preamble or explanation before or after the markdown.
        ---
        ### Project Overview: ${repoName}

        #### Summary
        (Provide a 2-3 paragraph summary of the project's purpose, its primary features, and its intended use case based on the code.)

        #### Key Features
        - (Based on the code, list the main features or capabilities of the project as bullet points.)

        #### Technology Stack
        - (Infer and list the technology stack, including languages, frameworks, and key libraries, as bullet points.)

        #### Architectural Notes
        (Provide a brief, high-level observation about the project's structure. For example, "This appears to be a standard client-server application with a React frontend" or "The project follows a component-based architecture.")
        ---
        **CODE:**
        ---
        ${fileContentsString}
      `;

    const reviewFocus = config.customRules
      ? `In addition to your standard analysis, the user has provided the following directives to guide your review: "${config.customRules}". Please prioritize these areas where applicable.`
      : 'Your focus is on providing a comprehensive, high-quality code review. Identify potential bugs, security vulnerabilities, performance bottlenecks, and areas for improved maintainability, readability, and adherence to best practices. Be as thorough and insightful as possible.';

    const reviewPrompt = `
      You are an expert code reviewer with a meticulous eye for detail. Your task is to perform a technical review of the provided code. ${reviewFocus}
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

    const overviewModelConfig = {
      temperature: 0.5,
      thinkingConfig: {
        thinkingBudget: -1,
        includeThoughts: true,
      },
    };
    
    const reviewModelConfig = {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: reviewSchema,
      thinkingConfig: {
        thinkingBudget: -1,
        includeThoughts: true,
      },
    };

    const parser = new ThoughtStreamParser();

    // --- Phase 1: Overview Generation ---
    onProgress('Generating Project Overview...');
    const overviewStream = await ai.models.generateContentStream({ model: config.model, contents: overviewPrompt, config: overviewModelConfig });
    const overviewText = await processStreamWithThoughts(overviewStream, parser, onProgress);

    // --- Phase 2: Technical Review ---
    onProgress('Performing Technical Review...');
    const reviewStream = await ai.models.generateContentStream({
      model: config.model,
      contents: reviewPrompt,
      config: reviewModelConfig
    });
    const reviewText = await processStreamWithThoughts(reviewStream, parser, onProgress);
    
    onProgress('Finalizing analysis...');
    const reviewJson = JSON.parse(reviewText.trim());
    const finalResult = { overview: overviewText, review: reviewJson };
    return finalResult;
};