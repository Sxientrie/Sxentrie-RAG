/**
 * @file src/domains/repository-analysis/infrastructure/thought-stream-parser.ts
 * @version 0.1.0
 * @description A utility class to parse and extract meaningful progress messages from a Gemini "thought" stream.
 *
 * @module RepositoryAnalysis.Infrastructure
 *
 * @summary This class is designed to process the streaming "thought" text from the Gemini API. It buffers the incoming text chunks and uses heuristics (like finding the last bolded statement or list item) to extract the most recent, complete thought, providing a coherent progress message for the UI.
 *
 * @dependencies
 * - None
 *
 * @outputs
 * - Exports the `ThoughtStreamParser` class.
 *
 * @changelog
 * - v0.1.0 (2025-09-08): File created and documented.
 */
export class ThoughtStreamParser {
  private buffer: string = "";
  private latestSummary: string | null = null;
  private readonly GENERIC_FALLBACK = "Processing...";

  public addChunk(text: string): void {
    this.buffer += text;
    this._parseBuffer();
  }

  public getLatestSummary(): string {
    return this.latestSummary ?? this.GENERIC_FALLBACK;
  }

  private _parseBuffer(): void {
    const newSummary =
      this._extractLastBoldedStatement() ??
      this._extractLastCompleteListItem() ??
      this._extractLastCompleteSentence();

    if (newSummary && newSummary !== this.latestSummary) {
      this.latestSummary = newSummary.trim();
    }
  }

  private _extractLastBoldedStatement(): string | null {
    const matches = this.buffer.match(/\*\*([^*]+)\*\*/g);
    if (!matches) {
      return null;
    }
    const lastMatch = matches[matches.length - 1];
    return lastMatch.substring(2, lastMatch.length - 2);
  }

  private _extractLastCompleteListItem(): string | null {
    const matches = this.buffer.match(/^[-*\d+\.]\s*(.*)\n/gm);
    if (!matches) {
      return null;
    }
    const lastMatch = matches[matches.length - 1].trim();
    return lastMatch.replace(/^[-*\d+\.]\s*/, "");
  }

  private _extractLastCompleteSentence(): string | null {
    if (!/[.!?]$/.test(this.buffer.trim())) {
      return null;
    }
    const sentences = this.buffer.trim().split(/(?<=[.!?])\s+/);
    return sentences.length > 0 ? sentences[sentences.length - 1] : null;
  }
}