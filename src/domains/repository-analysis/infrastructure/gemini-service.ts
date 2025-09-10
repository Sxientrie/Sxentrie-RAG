import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { GitHubFile, AnalysisConfig, ANALYSIS_SCOPES, AnalysisResults, ANALYSIS_MODES } from '../domain';
import {
    MAX_GEMINI_FILE_COUNT, MAX_GEMINI_FILE_SIZE, TRUNCATED_GEMINI_MESSAGE, GEMINI_TEMPERATURE_REGULAR,
    GEMINI_TEMPERATURE_LOW, GEMINI_THINKING_BUDGET_UNLIMITED, ApiKeyStorageKey, ErrorGeminiUnknown,
    JsonRegex, NewlineRegex, ApiKeyInvalid, ErrorApiKeyInvalid, ErrorUnexpected, ErrorApiKeyNotFound,
    SourceCodeTemplate, FileContentSeparator, LabelInitializingDocEngine, ErrorNoFilesForDocGen,
    LabelFetchingDocContents, ErrorCouldNotFetchContent, LabelGeneratingDocumentation,
    LabelReceivingDocumentationTemplate, LabelFinalizingDocumentation, LabelInitializingAnalysisEngine,
    ErrorNoFilesForAnalysis, LabelFetchingAnalysisContents, StreamMessagePhase1, StreamMessagePhase2,
    StreamMessageFinalizing, JsonResponseMimeType
} from "../../../../shared/config";
import { collectAllFiles } from "../application/file-tree-utils";
import { ApiKeyError } from '../../../../shared/errors/api-key-error';
import { ThoughtStreamParser } from './thought-stream-parser';
const parseGeminiError = (e: unknown): Error => {
    let friendlyMessage = ErrorGeminiUnknown;
    if (e instanceof Error) {
        const rawMessage = e.message;
        try {
            const jsonMatch = rawMessage.match(JsonRegex);
            if (jsonMatch && jsonMatch[0]) {
                const errorObj = JSON.parse(jsonMatch[0]);
                if (errorObj?.error?.message) {
                    friendlyMessage = errorObj.error.message;
                } else {
                    friendlyMessage = rawMessage;
                }
            } else {
                friendlyMessage = rawMessage;
            }
        } catch (parseError) {
            friendlyMessage = rawMessage;
        }
    } else if (typeof e === 'string') {
        friendlyMessage = e;
    }
    const cleanedMessage = friendlyMessage.replace(NewlineRegex, ' ').trim();
    if (cleanedMessage.toLowerCase().includes(ApiKeyInvalid)) {
        return new ApiKeyError(ErrorApiKeyInvalid);
    }
    if (cleanedMessage.length < 10 && cleanedMessage.includes('{')) {
        return new Error(ErrorUnexpected);
    }
    return new Error(cleanedMessage);
};
async function processStreamWithThoughts(
  stream: AsyncGenerator<GenerateContentResponse>,
  parser: ThoughtStreamParser,
  onProgress: (message: string) => void
): Promise<string> {
  let accumulatedText = '';
  for await (const chunk of stream) {
    let hasNewThought = false;
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
      accumulatedText += chunk.text;
    }
    if (hasNewThought) {
      onProgress(parser.getLatestSummary());
    }
  }
  return accumulatedText;
}
const getApiKey = (): string => {
  const apiKey = localStorage.getItem(ApiKeyStorageKey);
  if (!apiKey || !apiKey.trim()) {
    throw new ApiKeyError(ErrorApiKeyNotFound);
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
        return SourceCodeTemplate.replace('{0}', file.path).replace('{1}', cappedText);
      } catch (e) {
        console.error(`Error fetching content for ${file.path}:`, e);
        return '';
      }
    })
  );
  return fileContents.filter(c => c).join(FileContentSeparator);
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
    onProgress(LabelInitializingDocEngine);
    const files = getFilesForRequest(fileTree, config, selectedFile);
    if (files.length === 0) {
        throw new Error(ErrorNoFilesForDocGen);
    }
    onProgress(LabelFetchingDocContents);
    const fileContentsString = await fetchFileContentsForAnalysis(files);
     if (!fileContentsString.trim()) {
        throw new Error(ErrorCouldNotFetchContent);
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
  </ExampleDocumentation>
  <CodeToDocument>
    ${fileContentsString}
  </CodeToDocument>
</DocumentationRequest>
    `;
    const modelConfig = { temperature: GEMINI_TEMPERATURE_REGULAR };
    onProgress(LabelGeneratingDocumentation);
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
            onProgress(LabelReceivingDocumentationTemplate.replace('{0}', (accumulatedDoc.length / 1024).toFixed(1)));
        }
    }
    onProgress(LabelFinalizingDocumentation);
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
    onProgress(LabelInitializingAnalysisEngine);
    const files = getFilesForRequest(fileTree, config, selectedFile);
    if (files.length === 0) {
        throw new Error(ErrorNoFilesForAnalysis);
    }
    onProgress(LabelFetchingAnalysisContents);
    const fileContentsString = await fetchFileContentsForAnalysis(files);
    if (!fileContentsString.trim()) {
        throw new Error(ErrorCouldNotFetchContent);
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
      temperature: GEMINI_TEMPERATURE_REGULAR,
      thinkingConfig: {
        thinkingBudget: GEMINI_THINKING_BUDGET_UNLIMITED,
        includeThoughts: true,
      },
    };
    const reviewModelConfig = {
      temperature: GEMINI_TEMPERATURE_LOW,
      responseMimeType: JsonResponseMimeType,
      responseSchema: reviewSchema,
      thinkingConfig: {
        thinkingBudget: GEMINI_THINKING_BUDGET_UNLIMITED,
        includeThoughts: true,
      },
    };
    const parser = new ThoughtStreamParser();
    onProgress(StreamMessagePhase1);
    const overviewStream = await ai.models.generateContentStream({ model: config.model, contents: overviewPrompt, config: overviewModelConfig });
    const overviewText = await processStreamWithThoughts(overviewStream, parser, onProgress);
    onProgress(StreamMessagePhase2);
    const reviewStream = await ai.models.generateContentStream({
      model: config.model,
      contents: reviewPrompt,
      config: reviewModelConfig
    });
    const reviewText = await processStreamWithThoughts(reviewStream, parser, onProgress);
    onProgress(StreamMessageFinalizing);
    const reviewJson = JSON.parse(reviewText.trim());
    const finalResult = { overview: overviewText, review: reviewJson };
    return finalResult;
  } catch (e) {
    throw parseGeminiError(e);
  }
};
