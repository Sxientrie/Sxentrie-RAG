/**
 * @file api/_utils.ts
 * @version 0.1.0
 * @description Shared utilities for the backend serverless functions.
 *
 * @summary This module provides common functionality needed by the Gemini API handlers, such as fetching file contents and parsing the thought stream for progress updates. Centralizing this logic avoids code duplication.
 */
import { GitHubFile, AnalysisConfig, ANALYSIS_MODES } from '../src/domains/repository-analysis/domain';
import { MAX_GEMINI_FILE_COUNT, MAX_GEMINI_FILE_SIZE, TRUNCATED_GEMINI_MESSAGE } from '../shared/config';
import { ThoughtStreamParser } from '../src/domains/repository-analysis/infrastructure/thought-stream-parser';

export const fetchFileContents = async (files: GitHubFile[], config: AnalysisConfig): Promise<string> => {
  const filesToProcess = config.mode === ANALYSIS_MODES.FAST
    ? files.slice(0, MAX_GEMINI_FILE_COUNT)
    : files;

  const fileContents = await Promise.all(
    filesToProcess.map(async file => {
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

/**
 * Consumes a Gemini stream and sends progress updates through a serverless response stream.
 * @param geminiStream The stream from ai.models.generateContentStream.
 * @param controller The ReadableStreamDefaultController to write progress to.
 * @param encoder The TextEncoder to encode strings.
 * @returns The final concatenated text from the stream.
 */
export async function processThoughtStream(
    geminiStream: AsyncGenerator<any>,
    controller: ReadableStreamDefaultController,
    encoder: TextEncoder
): Promise<string> {
    const parser = new ThoughtStreamParser();
    let accumulatedText = '';

    for await (const chunk of geminiStream) {
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
            const progressMessage = parser.getLatestSummary();
            controller.enqueue(encoder.encode(`{"type": "progress", "message": "${escapeJsonString(progressMessage)}"}\n`));
        }
    }
    return accumulatedText;
}

// Helper to safely embed strings in JSON
function escapeJsonString(str: string): string {
    return str.replace(/\\/g, '\\\\')
              .replace(/"/g, '\\"')
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\r')
              .replace(/\t/g, '\\t');
}