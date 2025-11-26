import { GenerateContentResponse } from "@google/genai";
import { ThoughtStreamParser } from '../src/domains/repository-analysis/infrastructure/thought-stream-parser';
import { StreamTypeProgress } from '../shared/config';
import { fetchFileContents } from '../shared/utils';

export { fetchFileContents };

export const processThoughtStream = async (
  geminiStream: AsyncGenerator<GenerateContentResponse>,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
): Promise<string> => {
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
      const progressJson = JSON.stringify({ type: StreamTypeProgress, message: progressMessage });
      controller.enqueue(encoder.encode(`${progressJson}\n`));
    }
  }
  return accumulatedText;
};