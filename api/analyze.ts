import { GoogleGenAI, Type } from "@google/genai";
import { fetchFileContents, processThoughtStream } from './_utils';
import { AnalysisConfig, ANALYSIS_SCOPES, GitHubFile } from '../src/domains/repository-analysis/domain';
import {
    HTTP_STATUS_BAD_REQUEST,
    HTTP_STATUS_INTERNAL_SERVER_ERROR,
    GEMINI_TEMPERATURE_REGULAR,
    GEMINI_TEMPERATURE_LOW,
    GEMINI_THINKING_BUDGET_UNLIMITED,
    ErrorApiKeyNotSet,
    ErrorNoFilesProvided,
    ErrorCouldNotFetchContent,
    ErrorUnknownAnalysis,
    ErrorInvalidRequestBody,
    PromptOverviewHeaderFile,
    PromptOverviewHeaderRepo,
    PromptOverviewBodyFile,
    PromptOverviewBodyRepo,
    PromptReviewFocusDefault,
    JsonResponseMimeType,
    StreamTypeProgress,
    StreamTypeResult,
    StreamTypeError,
    StreamMessagePhase1,
    StreamMessagePhase2,
    StreamMessageFinalizing,
    HttpHeaderContentTypeJsonUtf8,
} from '../shared/config';
interface ServerlessRequest {
  json: () => Promise<{ repoName: string; files: GitHubFile[], config: AnalysisConfig }>;
}
export default async function handler(request: ServerlessRequest) {
  try {
    const { repoName, files, config } = await request.json();
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
      return new Response(JSON.stringify({ error: ErrorApiKeyNotSet }), { status: HTTP_STATUS_INTERNAL_SERVER_ERROR });
    }
    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ error: ErrorNoFilesProvided }), { status: HTTP_STATUS_BAD_REQUEST });
    }
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const isSingleFile = files.length === 1 && config.scope === ANALYSIS_SCOPES.FILE;
          const fileContentsString = await fetchFileContents(files, config);
          if (!fileContentsString.trim()) {
              throw new Error(ErrorCouldNotFetchContent);
          }
          const analysisTarget = isSingleFile ? `the file '${files[0].path}'` : `the '${repoName}' repository`;
          const overviewHeader = isSingleFile ? PromptOverviewHeaderFile : PromptOverviewHeaderRepo;
          const overviewBody = isSingleFile ? PromptOverviewBodyFile : PromptOverviewBodyRepo;
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
            : PromptReviewFocusDefault;
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
            responseMimeType: JsonResponseMimeType,
            responseSchema: reviewSchema
          };
          controller.enqueue(encoder.encode(`{"type": "${StreamTypeProgress}", "message": "${StreamMessagePhase1}"}\n`));
          const overviewStream = await ai.models.generateContentStream({ model: config.model, contents: overviewPrompt, config: overviewModelConfig });
          const overviewText = await processThoughtStream(overviewStream, controller, encoder);
          controller.enqueue(encoder.encode(`{"type": "${StreamTypeProgress}", "message": "${StreamMessagePhase2}"}\n`));
          const reviewStream = await ai.models.generateContentStream({
            model: config.model,
            contents: reviewPrompt,
            config: reviewModelConfig
          });
          const reviewText = await processThoughtStream(reviewStream, controller, encoder);
          controller.enqueue(encoder.encode(`{"type": "${StreamTypeProgress}", "message": "${StreamMessageFinalizing}"}\n`));
          const reviewJson = JSON.parse(reviewText.trim());
          const finalResult = { overview: overviewText, review: reviewJson };
          controller.enqueue(encoder.encode(`{"type": "${StreamTypeResult}", "payload": ${JSON.stringify(finalResult)}}\n`));
          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : ErrorUnknownAnalysis;
          controller.enqueue(encoder.encode(`{"type": "${StreamTypeError}", "message": "${message}"}\n`));
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: { 'Content-Type': HttpHeaderContentTypeJsonUtf8 },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : ErrorInvalidRequestBody;
    return new Response(JSON.stringify({ error: message }), { status: HTTP_STATUS_BAD_REQUEST });
  }
}
