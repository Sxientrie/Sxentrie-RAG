import {
    LabelProcessing, BoldedStatementRegex, LastListItemRegex, ListItemPrefixRegex, SentenceEndRegex,
    SentenceSplitRegex
} from '../../../../shared/config';
export class ThoughtStreamParser {
  private buffer: string = "";
  private latestSummary: string | null = null;
  private readonly GENERIC_FALLBACK = LabelProcessing;
  public addChunk(text: string): void {
    this.buffer += text;
    this._parseBuffer();
  }
  public getLatestSummary(): string {
    return this.latestSummary ?? this.GENERIC_FALLBACK;
  }
  private _parseBuffer(): void {
    const windowLen = 2000;
    let windowStart = Math.max(0, this.buffer.length - windowLen);
    if (windowStart > 0) {
      const nextNewline = this.buffer.indexOf('\n', windowStart);
      if (nextNewline !== -1 && nextNewline < this.buffer.length) {
        windowStart = nextNewline + 1;
      }
    }
    const trailingWindow = this.buffer.substring(windowStart);

    const newSummary =
      this._extractLastBoldedStatement(trailingWindow) ??
      this._extractLastCompleteListItem(trailingWindow) ??
      this._extractLastCompleteSentence(trailingWindow);
    if (newSummary && newSummary !== this.latestSummary) {
      this.latestSummary = newSummary.trim();
    }
  }
  private _extractLastBoldedStatement(text: string): string | null {
    const matches = text.match(BoldedStatementRegex);
    if (!matches) {
      return null;
    }
    const lastMatch = matches[matches.length - 1];
    return lastMatch.substring(2, lastMatch.length - 2);
  }
  private _extractLastCompleteListItem(text: string): string | null {
    const matches = text.match(LastListItemRegex);
    if (!matches) {
      return null;
    }
    const lastMatch = matches[matches.length - 1].trim();
    return lastMatch.replace(ListItemPrefixRegex, "");
  }
  private _extractLastCompleteSentence(text: string): string | null {
    if (!SentenceEndRegex.test(text.trim())) {
      return null;
    }
    const sentences = text.trim().split(SentenceSplitRegex);
    return sentences.length > 0 ? sentences[sentences.length - 1] : null;
  }
}
