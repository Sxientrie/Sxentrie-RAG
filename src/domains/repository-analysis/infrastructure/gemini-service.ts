import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { GitHubFile, AnalysisConfig, ANALYSIS_SCOPES, AnalysisResults, ANALYSIS_MODES } from '../domain';
import {
    MAX_GEMINI_FILE_COUNT, MAX_GEMINI_FILE_SIZE, TRUNCATED_GEMINI_MESSAGE, GEMINI_TEMPERATURE_REGULAR,
    GEMINI_TEMPERATURE_LOW, GEMINI_THINKING_BUDGET_UNLIMITED, ApiKeyStorageKey, ErrorGeminiUnknown,
    JsonRegex, NewlineRegex, ApiKeyInvalid, ErrorApiKeyInvalid, ErrorUnexpected, ErrorApiKeyNotFound,
    SourceCodeTemplate, FileContentSeparator, LabelInitializingDocEngine, ErrorNoFilesForDocGen,
    LabelFetchingDocContents, ErrorCouldNotFetchContent, LabelGeneratingDocumentation,
    LabelReceivingDocumentationTemplate, LabelFinalizingDocumentation, LabelInitializingAnalysisEngine,
    ErrorNoFilesForAnalysis, LabelFetchingAnalysisContents, StreamMessageAnalyzing,
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
    const analysisPrompt = `
<CodeAnalysisRequest>
  <Persona>
    You are an expert Principal Software Architect and code reviewer. Your expertise lies in analyzing complex codebases, identifying architectural patterns, and conducting thorough, actionable code reviews. You communicate findings clearly and concisely.
  </Persona>
  <Instructions>
    Your task is to perform a comprehensive analysis of the provided source code and return a single, valid JSON object. This JSON object must contain two top-level properties: "overview" and "review".

    1.  **Generate High-Level Overview (overview):**
        *   Analyze the provided files to understand the project's purpose, technology stack, and architecture.
        *   Synthesize this information into a well-structured Markdown string.
        *   Assign this Markdown string to the "overview" property of the final JSON object.

    2.  **Generate Detailed Technical Review (review):**
        *   Conduct a thorough review of the code, identifying potential bugs, security vulnerabilities, performance bottlenecks, and areas for improvement.
        *   For each finding, determine the file, line number(s), severity ("Critical", "High", "Medium", "Low"), and a clear explanation with an actionable suggestion.
        *   Format all findings into a JSON array of objects, where each object represents a single finding.
        *   Assign this array to the "review" property of the final JSON object.

    The final output MUST be a single, valid JSON object that strictly adheres to the 'response_schema' provided in the API call. Do not include any text, markdown, or explanation outside of this JSON object.
  </Instructions>
  <SourceCode>
    ${fileContentsString}
  </SourceCode>
</CodeAnalysisRequest>
    `;
    const analysisSchema = {
        type: Type.OBJECT,
        properties: {
            overview: { type: Type.STRING },
            review: {
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
            },
        },
        required: ["overview", "review"],
    };
    const modelConfig = {
      temperature: GEMINI_TEMPERATURE_LOW,
      responseMimeType: JsonResponseMimeType,
      responseSchema: analysisSchema,
      thinkingConfig: {
        thinkingBudget: GEMINI_THINKING_BUDGET_UNLIMITED,
        includeThoughts: true,
      },
    };
    const parser = new ThoughtStreamParser();
    onProgress(StreamMessageAnalyzing);
    const analysisStream = await ai.models.generateContentStream({
        model: config.model,
        contents: analysisPrompt,
        config: modelConfig
    });
    const analysisText = await processStreamWithThoughts(analysisStream, parser, onProgress);
    onProgress(StreamMessageFinalizing);
    const finalResult = JSON.parse(analysisText.trim());
    return finalResult;
  } catch (e) {
    throw parseGeminiError(e);
  }
};
