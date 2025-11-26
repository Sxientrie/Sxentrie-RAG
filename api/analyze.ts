import { GoogleGenAI, Type } from "@google/genai";
import { promises as fs } from 'fs';
import path from 'path';
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
  AnalysisTargetFileTemplate,
  AnalysisTargetRepoTemplate,
  SeverityCritical,
  SeverityHigh,
  SeverityMedium,
  SeverityLow,
  ExplanationTypeText,
  ExplanationTypeCode,
  LanguageGuidelines,
} from '../shared/config';
interface ServerlessRequest {
  json: () => Promise<{ repoName: string; files: GitHubFile[], config: AnalysisConfig }>;
}

const loadPrompt = async (templateName: string, data: Record<string, string>): Promise<string> => {
  const filePath = path.join(process.cwd(), 'prompts', `${templateName}.md`);
  let content = await fs.readFile(filePath, 'utf-8');
  for (const [key, value] of Object.entries(data)) {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return content;
};
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
          const { content: fileContentsString, failedFiles } = await fetchFileContents(files);
          if (failedFiles.length > 0) {
            const failedFilesList = failedFiles.map(f => `${f.path} (${f.error})`).join(', ');
            const enqueueProgress = (message: string) => {
              controller.enqueue(encoder.encode(`${JSON.stringify({ type: StreamTypeProgress, message })}\n`));
            };
            enqueueProgress(`Warning: Failed to fetch content for: ${failedFilesList}`);
          }
          if (!fileContentsString.trim()) {
            throw new Error(ErrorCouldNotFetchContent);
          }
          const analysisTarget = isSingleFile
            ? AnalysisTargetFileTemplate.replace('{0}', files[0].path)
            : AnalysisTargetRepoTemplate.replace('{0}', repoName);
          const overviewHeader = isSingleFile ? PromptOverviewHeaderFile : PromptOverviewHeaderRepo;
          const overviewBody = isSingleFile ? PromptOverviewBodyFile : PromptOverviewBodyRepo;
          const overviewPrompt = await loadPrompt('overview', {
            overviewHeader,
            analysisTarget,
            overviewBody,
            fileContentsString
          });
          const reviewFocus = config.customRules
            ? `In addition to your standard analysis, the user has provided the following directives to guide your review: "${config.customRules}". Please prioritize these areas where applicable.`
            : PromptReviewFocusDefault;

          // Detect languages and inject guidelines
          const extensions = new Set(files.map(f => f.path.split('.').pop()?.toLowerCase()).filter(Boolean));
          let languageSpecificGuidelines = '';
          for (const [lang, guideline] of Object.entries(LanguageGuidelines)) {
            if (extensions.has(lang) || (lang === 'react' && (extensions.has('tsx') || extensions.has('jsx')))) {
              languageSpecificGuidelines += `- ${guideline}\n`;
            }
          }

          const reviewPrompt = await loadPrompt('review', {
            analysisTarget,
            reviewFocus,
            languageSpecificGuidelines: languageSpecificGuidelines ? `**Language-Specific Guidelines:**\n${languageSpecificGuidelines}` : '',
            SeverityCritical,
            SeverityHigh,
            SeverityMedium,
            SeverityLow,
            ExplanationTypeText,
            ExplanationTypeCode,
            fileContentsString
          });
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
          // Helper to determine thinking config based on model version
          const getThinkingConfig = (model: string) => {
            if (model.includes('gemini-3')) {
              return { thinkingLevel: "HIGH", includeThoughts: true };
            }
            return { thinkingBudget: GEMINI_THINKING_BUDGET_UNLIMITED, includeThoughts: true };
          };

          const overviewModelConfig = {
            temperature: GEMINI_TEMPERATURE_REGULAR,
            thinkingConfig: getThinkingConfig(config.model),
          };
          const reviewModelConfig = {
            temperature: GEMINI_TEMPERATURE_LOW,
            responseMimeType: JsonResponseMimeType,
            responseSchema: reviewSchema,
            thinkingConfig: getThinkingConfig(config.model),
          };
          const enqueueProgress = (message: string) => {
            controller.enqueue(encoder.encode(`${JSON.stringify({ type: StreamTypeProgress, message })}\n`));
          };
          enqueueProgress(StreamMessagePhase1);
          const overviewStream = await ai.models.generateContentStream({ model: config.model, contents: overviewPrompt, config: overviewModelConfig });
          const overviewText = await processThoughtStream(overviewStream, controller, encoder);
          enqueueProgress(StreamMessagePhase2);
          const reviewStream = await ai.models.generateContentStream({
            model: config.model,
            contents: reviewPrompt,
            config: reviewModelConfig
          });
          const reviewText = await processThoughtStream(reviewStream, controller, encoder);
          enqueueProgress(StreamMessageFinalizing);
          const reviewJson = JSON.parse(reviewText.trim());
          const finalResult = { overview: overviewText, review: reviewJson };
          controller.enqueue(encoder.encode(`${JSON.stringify({ type: StreamTypeResult, payload: finalResult })}\n`));
          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : ErrorUnknownAnalysis;
          controller.enqueue(encoder.encode(`${JSON.stringify({ type: StreamTypeError, message })}\n`));
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
