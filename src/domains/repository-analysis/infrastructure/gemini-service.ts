/**
 * @file src/domains/repository-analysis/infrastructure/gemini-service.ts
 * @version 1.1.0
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
 * @changelog
 * - v1.1.0 (2025-09-16): Implemented a more robust error parser to safely extract human-readable messages from raw API error responses, preventing unparsed JSON fragments in the UI.
 * - v1.0.0 (2025-09-15): Implemented robust error parsing to catch raw Gemini API errors and transform them into user-friendly messages, preventing JSON blobs in the UI.
 * - v0.9.0 (2025-09-14): Implemented advanced prompt engineering techniques based on the provided research document. Refactored all prompts to use XML structure, expert personas, Chain-of-Thought reasoning, and few-shot examples to significantly improve output quality and reliability.
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
 * Parses a raw error from the Gemini API into a user-friendly string.
 * This function is designed to handle complex error objects and stringified JSON.
 * @param e The caught error object.
 * @returns A new Error with a cleaned-up, human-readable message.
 */
const parseGeminiError = (e: unknown): Error => {
    let friendlyMessage = 'An unknown error occurred with the Gemini API.';

    if (e instanceof Error) {
        const rawMessage = e.message;
        try {
            // Attempt to find and parse a JSON object within the raw error string.
            // This is safer than assuming the whole string is JSON.
            const jsonMatch = rawMessage.match(/\{.*\}/s);
            if (jsonMatch && jsonMatch[0]) {
                const errorObj = JSON.parse(jsonMatch[0]);
                if (errorObj?.error?.message) {
                    // This is the most likely path for Gemini API errors.
                    friendlyMessage = errorObj.error.message;
                } else {
                     // Fallback if the JSON structure is unexpected.
                    friendlyMessage = rawMessage;
                }
            } else {
                // If no JSON is found, use the raw message.
                friendlyMessage = rawMessage;
            }
        } catch (parseError) {
            // If JSON parsing fails, the message is likely not structured JSON.
            // Use the raw message and hope for the best.
            friendlyMessage = rawMessage;
        }
    } else if (typeof e === 'string') {
        friendlyMessage = e;
    }

    // Clean up the final message: remove escaped newlines, then trim.
    const cleanedMessage = friendlyMessage.replace(/\\n/g, ' ').trim();

    if (cleanedMessage.toLowerCase().includes('api key not valid')) {
        return new ApiKeyError('Your Gemini API key is not valid. Please check it in Settings.');
    }

    // Final check to prevent gibberish from being displayed. A real message should have some length.
    if (cleanedMessage.length < 10 && cleanedMessage.includes('{')) {
        return new Error("An unexpected error occurred. Please check the console for details.");
    }
    
    return new Error(cleanedMessage);
};


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
        return `<source_code file_path="${file.path}">\n${cappedText}\n</source_code>`;
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
  try {
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
<DocumentationRequest>
  <Persona>
    You are an expert technical writer specializing in creating high-quality, standards-compliant developer documentation for TypeScript and JavaScript codebases. You are an expert in the JSDoc and TSDoc formats.
  </Persona>
  <Instructions>
    Your task is to generate JSDoc/TSDoc comment blocks for the functions, classes, and types in the provided code snippet. For each item, follow this process:
    1.  **Analyze Signature:** Identify the name of the function/class and its full signature.
    2.  **Extract Details:** Determine its overall purpose. List every parameter, its data type, and a brief description. Identify the return value and its data type.
    3.  **Format Output:** Assemble the extracted information into a single, complete JSDoc/TSDoc comment block that immediately precedes the code it documents. Strictly follow the format shown in the \`<ExampleDocumentation>\`. Generate ONLY the comment block, with no other text or explanation.
  </Instructions>
  <ExampleDocumentation>
/**
 * Fetches user data from the API and processes it.
 * @param {string} userId - The unique identifier for the user.
 * @param {object} [options] - Optional settings for the data retrieval.
 * @param {boolean} [options.includeProfile=false] - Whether to include the user's full profile.
 * @returns {Promise<User|null>} A promise that resolves with the user object or null if not found.
 */
  </ExampleDocumentation>
  <CodeToDocument>
    ${fileContentsString}
  </CodeToDocument>
</DocumentationRequest>
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
  } catch (e) {
    throw parseGeminiError(e);
  }
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
  try {
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
<FileOverviewRequest>
  <Persona>
    You are a senior software engineer tasked with explaining a code file to a new team member. Your expertise lies in distilling complex code into clear, understandable summaries.
  </Persona>
  <Instructions>
    Your task is to provide a comprehensive analysis of the single source code file provided. The final output must be a well-structured Markdown document. Follow this internal reasoning process:
    1.  **Purpose Identification:** Read the code to determine the file's primary role and responsibility within the context of a larger application.
    2.  **Component Breakdown:** Identify the key functions, classes, types, or components defined within the file.
    3.  **Synthesize and Format:** Combine your findings into a Markdown report. Strictly adhere to the format demonstrated in the \`<ExampleFileOverview>\`. Do NOT add any preamble or explanation before or after the markdown.
  </Instructions>
  <ExampleFileOverview>
# File Analysis: ${files[0].name}

## Summary
(A 1-2 paragraph summary of the file's purpose, its primary responsibility, and its role within a potential larger project.)

## Key Components
- **[Component/Function Name]:** (Brief description of what it does.)
  </ExampleFileOverview>
  <SourceCode file_path="${files[0].path}">
    ${fileContentsString}
  </SourceCode>
</FileOverviewRequest>
      `
      : `
<ProjectOverviewRequest>
  <Persona>
    You are a Principal Software Architect with extensive experience in analyzing complex codebases and communicating their structure to technical stakeholders. Your expertise lies in identifying technology stacks, architectural patterns, and core functionalities from source code.
  </Persona>
  <Instructions>
    Your task is to generate a comprehensive architectural overview of the provided repository context. The final output must be a well-structured Markdown document. Follow this internal reasoning process:
    1.  **File-Level Abstraction:** For each file provided in the \`<RepositoryContext>\`, first generate a concise, one-sentence internal summary of its primary role or purpose.
    2.  **Technology Stack Identification:** Analyze dependency management files to identify the core frameworks, languages, and key libraries. Corroborate this with import statements in the source code.
    3.  **Architectural Pattern Inference:** Based on the directory structure and the relationships between the file summaries, infer the high-level architectural pattern (e.g., Monolithic, Microservices, MVC, Client-Server).
    4.  **Core Component Analysis:** Identify and describe the main functional components of the application (e.g., "Authentication Service," "API Gateway," "UI Component Library"). Explain how they likely interact.
    5.  **Synthesis:** Synthesize all of the above information into a single, coherent Markdown report. Strictly adhere to the format demonstrated in the \`<ExampleOverview>\` section.
  </Instructions>
  <ExampleOverview>
# Architectural Overview

## Technology Stack
*   **Language:** TypeScript
*   **Framework:** Next.js (React)
*   **Styling:** Tailwind CSS

## Architectural Pattern
The repository follows a classic **Client-Server architecture** with a monolithic frontend application built using Next.js.

## Core Components
*   **/src/app/api/**: Defines the backend API routes.
*   **/src/components/**: Contains reusable React components.
*   **/src/hooks/**: Houses custom React hooks for managing client-side logic.
  </ExampleOverview>
  <RepositoryContext>
    ${fileContentsString}
  </RepositoryContext>
</ProjectOverviewRequest>
      `;

    const reviewPrompt = `
<CodeReviewRequest>
  <Persona>
    You are an expert code reviewer and principal software engineer with deep expertise in identifying security vulnerabilities, performance bottlenecks, code smells, and violations of modern software engineering best practices. Your feedback is always constructive, precise, and actionable.
  </Persona>
  <Instructions>
    Your task is to conduct a thorough review of the provided source code. Follow this multi-step process internally:
    1.  **Initial Scan:** Identify the primary programming languages, frameworks, and key libraries used in the provided files.
    2.  **Establish Criteria:** Based on the tech stack, formulate a mental checklist of common issues to look for. For example, for a React/TypeScript project, consider issues like prop drilling, inefficient state management, incorrect hook usage, type safety violations, and accessibility anti-patterns. For a Node.js backend, consider async error handling, security headers, dependency vulnerabilities, and inefficient database queries.
    3.  **Detailed Analysis:** Review the code file-by-file and line-by-line against your established criteria. For each issue you identify, pinpoint the exact file and line number.
    4.  **Classification and Solution:** For each identified issue, classify its severity from the allowed list: "Critical", "High", "Medium", "Low". Then, formulate a clear, concise description of the problem and a practical, actionable suggestion for how to fix it, including a brief code example where applicable.
    5.  **Final Output:** Aggregate all your findings into a JSON array. The structure of this JSON array is strictly defined by the \`response_schema\` provided in the API call. Do not add any explanatory text, markdown, or any content outside of the final JSON array.
  </Instructions>
  <SourceCode>
    ${fileContentsString}
  </SourceCode>
</CodeReviewRequest>
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
    onProgress('Phase 1/2: Generating Project Overview...');
    const overviewStream = await ai.models.generateContentStream({ model: config.model, contents: overviewPrompt, config: overviewModelConfig });
    const overviewText = await processStreamWithThoughts(overviewStream, parser, onProgress);

    // --- Phase 2: Technical Review ---
    onProgress('Phase 2/2: Performing Technical Review...');
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
  } catch (e) {
      throw parseGeminiError(e);
  }
};
