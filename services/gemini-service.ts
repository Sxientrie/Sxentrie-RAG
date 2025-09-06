import { GoogleGenAI, Type } from "@google/genai";
import { GitHubFile, AnalysisConfig, GEMINI_MODEL_NAME, ANALYSIS_SCOPES, AnalysisResults } from '../constants';
import { MAX_GEMINI_FILE_COUNT, MAX_GEMINI_FILE_SIZE } from "../config";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const fetchFileContents = async (files: GitHubFile[]): Promise<string> => {
    const limitedFiles = files.slice(0, MAX_GEMINI_FILE_COUNT);
            
    const fileContents = await Promise.all(
        limitedFiles.map(async file => {
            if (!file.download_url) return '';
            try {
                const res = await fetch(file.download_url!);
                if (!res.ok) return `--- Error fetching ${file.path}: ${res.statusText} ---`;
                const text = await res.text();
                const cappedText = text.length > MAX_GEMINI_FILE_SIZE ? text.substring(0, MAX_GEMINI_FILE_SIZE) + "\n... (file truncated)" : text;
                return `--- File: ${file.path} ---\n${cappedText}`;
            } catch (e) {
                return `--- Error fetching ${file.path}: ${(e as Error).message} ---`;
            }
        })
    );
    return fileContents.filter(c => c).join('\n\n');
}

const collectAllFiles = (nodes: GitHubFile[]): GitHubFile[] => {
    let files: GitHubFile[] = [];
    for (const node of nodes) {
        if (node.type === 'file' && node.download_url) {
            if (/\.(js|ts|py|go|java|html|css|md|json|jsx|tsx|sh|yml|yaml|dockerfile|rb|php|c|cpp|cs|rs)$/i.test(node.name) && !/(\.min\.js|\.lock)$/i.test(node.name)) {
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
        throw new Error("Could not fetch content from any files in the repository. The repository might be empty or contain only unsupported file types.");
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
      ? `You MUST follow these specific user-provided instructions: "${config.customRules}".`
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

    onProgress('Requesting analysis from Gemini...');
    const overviewPromise = ai.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: overviewPrompt,
        config: { temperature: 0.5 },
    });

    const reviewPromise = ai.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: reviewPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: reviewSchema,
            temperature: 0.2
        }
    });

    const [overviewResponse, reviewResponse] = await Promise.all([overviewPromise, reviewPromise]);

    onProgress('Processing AI response');
    const reviewJson = JSON.parse(reviewResponse.text.trim());

    return {
        overview: overviewResponse.text,
        review: reviewJson,
    };
};
