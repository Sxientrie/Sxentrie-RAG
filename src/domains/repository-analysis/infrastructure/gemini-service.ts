import { GoogleGenAI, Type } from "@google/genai";
import { GitHubFile, AnalysisConfig, ANALYSIS_SCOPES, AnalysisResults } from '../domain';
import { MAX_GEMINI_FILE_COUNT, MAX_GEMINI_FILE_SIZE } from "../../../../shared/config";
import { ThoughtStreamParser } from "./thought-stream-parser";

const ALLOWED_EXTENSIONS = new Set(['js', 'ts', 'py', 'go', 'java', 'html', 'css', 'md', 'json', 'jsx', 'tsx', 'sh', 'yml', 'yaml', 'rb', 'php', 'c', 'cpp', 'cs', 'rs']);
const SPECIFIC_FILENAMES = new Set(['dockerfile']);
const IGNORED_PATTERNS = [/\.min\.js$/i, /\.lock$/i];

const fetchFileContents = async (files: GitHubFile[]): Promise<string> => {
    const limitedFiles = files.slice(0, MAX_GEMINI_FILE_COUNT);
            
    const fileContents = await Promise.all(
        limitedFiles.map(async file => {
            if (!file.download_url) return '';
            try {
                const res = await fetch(file.download_url!);
                if (!res.ok) {
                    return '';
                }
                const text = await res.text();
                const cappedText = text.length > MAX_GEMINI_FILE_SIZE ? text.substring(0, MAX_GEMINI_FILE_SIZE) + "\n... (file truncated)" : text;
                return `--- File: ${file.path} ---\n${cappedText}`;
            } catch (e) {
                return '';
            }
        })
    );
    return fileContents.filter(c => c).join('\n\n');
}

const collectAllFiles = (nodes: GitHubFile[]): GitHubFile[] => {
    let files: GitHubFile[] = [];
    for (const node of nodes) {
        if (node.type === 'file' && node.download_url) {
            const fileName = node.name.toLowerCase();
            const extension = fileName.split('.').pop();

            const isAllowedExtension = extension && ALLOWED_EXTENSIONS.has(extension);
            const isSpecificFilename = SPECIFIC_FILENAMES.has(fileName);
            const isIgnored = IGNORED_PATTERNS.some(pattern => pattern.test(fileName));

            if ((isAllowedExtension || isSpecificFilename) && !isIgnored) {
                files.push(node);
            }
        }
        if (node.content) {
            files = files.concat(collectAllFiles(node.content));
        }
    }
    return files;
};

export const runCodeAnalysis = async (
    repoName: string,
    fileTree: GitHubFile[],
    config: AnalysisConfig,
    selectedFile: { path: string; content: string; isImage?: boolean } | null,
    onProgress: (message: string) => void
): Promise<AnalysisResults> => {
    onProgress('Initializing analysis engine');
    
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
        throw new Error("API_KEY environment variable not set. Analysis cannot be performed.");
    }
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    let fileContentsString: string;
    let analysisTarget: string;
    let isSingleFile = false;

    if (config.scope === ANALYSIS_SCOPES.FILE && selectedFile && !selectedFile.isImage) {
        onProgress(`Preparing to analyze single file: ${selectedFile.path}`);
        fileContentsString = `--- File: ${selectedFile.path} ---\n${selectedFile.content}`;
        analysisTarget = `the file '${selectedFile.path}'`;
        isSingleFile = true;
    } else {
        onProgress('Scanning all repository files');
        const allFiles = collectAllFiles(fileTree);
        const filesToFetchCount = Math.min(allFiles.length, MAX_GEMINI_FILE_COUNT);
        onProgress(`Fetching content for ${filesToFetchCount} files`);
        fileContentsString = await fetchFileContents(allFiles);
        analysisTarget = `the '${repoName}' repository`;
    }

    if (!fileContentsString.trim()) {
        if (isSingleFile) {
            throw new Error("The selected file is empty or could not be read.");
        }
        throw new Error("Could not fetch content from any files in the repository. The repository might be empty or contain only supported file types.");
    }
    
    onProgress('Constructing prompts for Gemini');
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
-   \`finding\`: A concise title for the issue (e.g., "Unused State Variable," "Inefficient String Concatenation").
-   \`explanation\`: An array of objects, where each object represents a step in the explanation. An object in this array must have:
    -   \`type\`: Either "text" or "code".
    -   \`content\`: The string content for the text or code block.

**Instructions:**
1.  For each issue you identify, structure your explanation as a logical narrative.
2.  Begin with a piece of text that describes the problem and shows the problematic code snippet immediately after.
3.  Follow up with text that explains the suggested fix, and then provide the corrected code snippet.
4.  Ensure that the \`explanation\` array alternates between "text" and "code" types to create a clear, easy-to-follow review.
5.  Your response MUST be ONLY the JSON array. Do not include any preamble, comments, or markdown formatting outside of the JSON structure itself.
6.  If you find no issues, return an empty JSON array: [].

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
            },
            required: ["fileName", "finding", "explanation"],
        },
    };
    
    const baseModelConfig = {
        temperature: 0.5,
        thinkingConfig: {
            thinkingBudget: -1,
            includeThoughts: true,
        }
    };

    onProgress('Phase 1/2: Generating Project Overview...');
    const overviewParser = new ThoughtStreamParser();
    onProgress(overviewParser.getLatestSummary());
    
    const overviewStream = await ai.models.generateContentStream({
        model: config.model,
        contents: overviewPrompt,
        config: baseModelConfig,
    });

    let overviewText = '';
    for await (const chunk of overviewStream) {
        let hasNewThought = false;
        if (chunk.candidates?.[0]?.content?.parts) {
            for (const part of chunk.candidates[0].content.parts) {
                if (part.thought && part.text) {
                    overviewParser.addChunk(part.text);
                    hasNewThought = true;
                } else if (part.text) {
                    overviewText += part.text;
                }
            }
        } else {
             overviewText += chunk.text;
        }

        if (hasNewThought) {
            onProgress(overviewParser.getLatestSummary());
        }
    }
    
    onProgress('Phase 2/2: Performing Technical Review...');
    const reviewParser = new ThoughtStreamParser();
    onProgress(reviewParser.getLatestSummary());
    
    const reviewStream = await ai.models.generateContentStream({
        model: config.model,
        contents: reviewPrompt,
        config: {
            ...baseModelConfig,
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: reviewSchema,
        }
    });

    let reviewText = '';
    for await (const chunk of reviewStream) {
        let hasNewThought = false;
        if (chunk.candidates?.[0]?.content?.parts) {
            for (const part of chunk.candidates[0].content.parts) {
                if (part.thought && part.text) {
                    reviewParser.addChunk(part.text);
                    hasNewThought = true;
                } else if (part.text) {
                    reviewText += part.text;
                }
            }
        } else {
            reviewText += chunk.text;
        }

        if (hasNewThought) {
            onProgress(reviewParser.getLatestSummary());
        }
    }

    onProgress('Processing AI response');
    
    let reviewJson;
    try {
        reviewJson = JSON.parse(reviewText.trim());
    } catch (error) {
        throw new Error('Analysis failed: The AI response was not in the expected JSON format.');
    }

    return {
        overview: overviewText,
        review: reviewJson,
    };
};