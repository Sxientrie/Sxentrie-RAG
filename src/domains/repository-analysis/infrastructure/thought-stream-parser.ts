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
