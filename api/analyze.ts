/**
 * @file api/analyze.ts
 * @version 0.2.0
 * @description Serverless function to securely perform code analysis using the Gemini API.
 *
 * @summary This endpoint receives repository files and analysis configuration from the client, constructs the appropriate prompts for the Gemini API, and executes the analysis. It streams progress updates (thoughts) back to the client, followed by the final JSON result, ensuring the API key remains secure on the server.
 *
 * @changelog
 * - v0.2.0 (2025-09-10): Added `severity` field to the review prompt and schema.
 * - v0.1.0 (2025-09-08): File created and documented.
 */
import { GoogleGenAI, Type } from "@google/genai";
import { fetchFileContents, processThoughtStream } from './_utils';
import { AnalysisConfig, ANALYSIS_SCOPES, GitHubFile } from '../src/domains/repository-analysis/domain';
import {
    HTTP_STATUS_OK,
    HTTP_STATUS_BAD_REQUEST,
    HTTP_STATUS_INTERNAL_SERVER_ERROR,
    GEMINI_TEMPERATURE_REGULAR,
    GEMINI_TEMPERATURE_LOW,
    GEMINI_THINKING_BUDGET_UNLIMITED,
} from '../shared/config';

// This is a generic interface for a serverless request.
interface ServerlessRequest {
  json: () => Promise<{ repoName: string; files: GitHubFile[], config: AnalysisConfig }>;
}

export default async function handler(request: ServerlessRequest) {
  try {
    const { repoName, files, config } = await request.json();
    const API_KEY = process.env.API_KEY;

    if (!API_KEY) {
      return new Response(JSON.stringify({ error: "API_KEY environment variable not set." }), { status: HTTP_STATUS_INTERNAL_SERVER_ERROR });
    }
    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ error: "No files provided for analysis." }), { status: HTTP_STATUS_BAD_REQUEST });
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const isSingleFile = files.length === 1 && config.scope === ANALYSIS_SCOPES.FILE;
          const fileContentsString = await fetchFileContents(files, config);
          
          if (!fileContentsString.trim()) {
              throw new Error("Could not fetch content from any files. The repository might be empty or contain only unsupported file types.");
          }

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

          const overviewModelConfig = {
            temperature: GEMINI_TEMPERATURE_REGULAR,
            thinkingConfig: {
              thinkingBudget: GEMINI_THINKING_BUDGET_UNLIMITED,
              includeThoughts: true,
            },
          };
          
          const reviewModelConfig = {
            temperature: GEMINI_TEMPERATURE_LOW,
            responseMimeType: "application/json",
            responseSchema: reviewSchema
          };

          controller.enqueue(encoder.encode(`{"type": "progress", "message": "Phase 1/2: Generating Project Overview..."}\n`));
          const overviewStream = await ai.models.generateContentStream({ model: config.model, contents: overviewPrompt, config: overviewModelConfig });
          const overviewText = await processThoughtStream(overviewStream, controller, encoder);

          controller.enqueue(encoder.encode(`{"type": "progress", "message": "Phase 2/2: Performing Technical Review..."}\n`));
          const reviewStream = await ai.models.generateContentStream({
            model: config.model,
            contents: reviewPrompt,
            config: reviewModelConfig
          });
          const reviewText = await processThoughtStream(reviewStream, controller, encoder);

          controller.enqueue(encoder.encode(`{"type": "progress", "message": "Finalizing analysis..."}\n`));
          const reviewJson = JSON.parse(reviewText.trim());

          const finalResult = { overview: overviewText, review: reviewJson };
          controller.enqueue(encoder.encode(`{"type": "result", "payload": ${JSON.stringify(finalResult)}}\n`));
          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'An unknown error occurred during analysis.';
          controller.enqueue(encoder.encode(`{"type": "error", "message": "${message}"}\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request body.';
    return new Response(JSON.stringify({ error: message }), { status: HTTP_STATUS_BAD_REQUEST });
  }
}