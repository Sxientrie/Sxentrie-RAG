/**
 * @file api/document.ts
 * @version 0.1.0
 * @description Serverless function to securely generate documentation using the Gemini API.
 *
 * @summary This endpoint receives repository files and analysis configuration from the client, constructs a prompt for documentation generation, and streams the markdown response from the Gemini API back to the client. This keeps the API key secure on the server.
 */
import { GoogleGenAI } from "@google/genai";
import { fetchFileContents } from './_utils';
import { AnalysisConfig, GitHubFile } from '../src/domains/repository-analysis/domain';
import { HTTP_STATUS_OK, HTTP_STATUS_BAD_REQUEST, HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../shared/config';

// This is a generic interface for a serverless request.
interface ServerlessRequest {
  json: () => Promise<{ repoName: string; files: GitHubFile[], config: AnalysisConfig }>;
}

const DOCUMENTATION_PROMPT = `
You are an expert technical writer and senior software engineer with deep knowledge of software architecture and documentation best practices.
Your task is to generate clear, concise, and professional documentation for the provided codebase. Your analysis should be based ONLY on the provided code.
**RULES & CONSTRAINTS:**
1.  Your response MUST be in well-structured markdown.
2.  If the provided context contains multiple files from a project, you MUST generate a project README.md. This README should include the following sections:
    -   A concise project summary.
    -   An inferred technology stack (languages, frameworks, key libraries).
    -   Instructions on how to set up and run the project, based on the file structure (e.g., package.json, requirements.txt).
3.  If the provided context contains only a single file, you MUST generate a detailed file overview document. This document should include:
    -   A summary of the file's purpose and its primary responsibility within the larger project.
    -   A list of the key functions, components, or classes exported by the file, complete with docstrings explaining their parameters and return values.
    -   A description of the file's role in the overall application architecture.
4.  Do NOT add any preamble, comments, or explanation before or after the markdown output. Your response MUST be ONLY the generated markdown document.
---
**CODEBASE TO DOCUMENT:**
---
{FILE_CONTENTS}
`;


export default async function handler(request: ServerlessRequest) {
  try {
    const { files, config } = await request.json();
    const API_KEY = process.env.API_KEY;

    if (!API_KEY) {
      return new Response("API_KEY environment variable not set.", { status: HTTP_STATUS_INTERNAL_SERVER_ERROR });
    }
    if (!files || files.length === 0) {
      return new Response("No files provided for documentation.", { status: HTTP_STATUS_BAD_REQUEST });
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const fileContentsString = await fetchFileContents(files, config);
    if (!fileContentsString.trim()) {
      throw new Error("Could not fetch content from any files. The repository might be empty or contain only supported file types.");
    }
    
    const prompt = DOCUMENTATION_PROMPT.replace('{FILE_CONTENTS}', fileContentsString);

    const baseModelConfig = {
      temperature: 0.5,
    };
    
    const docStream = await ai.models.generateContentStream({
        model: config.model,
        contents: prompt,
        config: baseModelConfig,
    });
    
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            for await (const chunk of docStream) {
                controller.enqueue(encoder.encode(chunk.text));
            }
            controller.close();
        }
    });

    return new Response(stream, {
        headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(message, { status: HTTP_STATUS_INTERNAL_SERVER_ERROR });
  }
}
