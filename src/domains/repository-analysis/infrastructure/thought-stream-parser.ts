/**
* A stateful parser for processing a streaming Gemini 'thought' monologue.
* It accumulates text chunks and uses a set of heuristics to extract a concise,
* user-friendly summary of the model's latest action.
*/
export class ThoughtStreamParser {
 private buffer: string = "";
 private latestSummary: string | null = null;
 private readonly GENERIC_FALLBACK = "Processing...";

 /**
  * Appends a new chunk of text to the buffer and re-parses it to find the latest summary.
  * @param text The new text chunk from the stream.
  */
 public addChunk(text: string): void {
   this.buffer += text;
   this._parseBuffer();
 }

 /**
  * Returns the latest extracted summary.
  * @returns A concise string summary or a generic fallback message.
  */
 public getLatestSummary(): string {
   return this.latestSummary ?? this.GENERIC_FALLBACK;
 }

 /**
  * The core parsing logic that applies a waterfall of heuristics to the buffer.
  * It updates the internal `latestSummary` if a new, valid summary is found.
  */
 private _parseBuffer(): void {
   const newSummary = 
     this._extractLastBoldedStatement() ??
     this._extractLastCompleteListItem() ??
     this._extractLastCompleteSentence();

   if (newSummary && newSummary !== this.latestSummary) {
     this.latestSummary = newSummary.trim();
   }
 }

 /**
  * Heuristic 1: Finds the content of the last bolded (**...**) section.
  */
 private _extractLastBoldedStatement(): string | null {
   const matches = this.buffer.match(/\*\*([^*]+)\*\*/g);
   if (!matches) {
     return null;
   }
   // Get the last match and strip the asterisks
   const lastMatch = matches[matches.length - 1];
   return lastMatch.substring(2, lastMatch.length - 2);
 }

 /**
  * Heuristic 2: Finds the last complete list item (starts with -, *, or number.).
  * A list item is considered "complete" if it ends with a newline.
  */
 private _extractLastCompleteListItem(): string | null {
   // Match lines starting with list markers, capturing the content.
   // We look for lines that end with a newline to consider them "complete".
   const matches = this.buffer.match(/^[-*\d+\.]\s*(.*)\n/gm);
   if (!matches) {
     return null;
   }
   // Get the last match and trim whitespace and the initial marker.
   const lastMatch = matches[matches.length - 1].trim();
   return lastMatch.replace(/^[-*\d+\.]\s*/, "");
 }

 /**
  * Heuristic 3: Finds the last complete sentence.
  * A sentence is considered "complete" if the buffer ends with sentence-ending punctuation.
  */
 private _extractLastCompleteSentence(): string | null {
   // Check if the buffer ends with a sentence-terminating character.
   if (!/[.!?]$/.test(this.buffer.trim())) {
     return null;
   }
   
   // Split by sentence-ending punctuation followed by space or end-of-string.
   const sentences = this.buffer.trim().split(/(?<=[.!?])\s+/);
   return sentences.length > 0 ? sentences[sentences.length - 1] : null;
 }
}